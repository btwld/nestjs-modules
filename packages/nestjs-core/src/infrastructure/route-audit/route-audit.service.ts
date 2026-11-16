import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { MODULE_PATH } from '@nestjs/common/constants.js';
import {
  ApplicationConfig,
  DiscoveryService,
  MetadataScanner,
  ModulesContainer,
} from '@nestjs/core';

import { CORE_MODULE_RAW_OPTIONS_TOKEN } from '../../core.constants.js';
import { type CoreOptionsInterface } from '../../core.module-definition.js';

import { RouteAuditRuleProvider } from './decorators/route-audit-rule-provider.decorator.js';
import { RouteAuditFailedException } from './exceptions/route-audit-failed.exception.js';
import { type AuditedRouteInterface } from './interfaces/audited-route.interface.js';
import { type MountedControllerInterface } from './interfaces/mounted-controller.interface.js';
import { type RouteAuditRuleInterface } from './interfaces/route-audit-rule.interface.js';
import { type RouteAuditSettingsInterface } from './interfaces/route-audit-settings.interface.js';
import { type RouteAuditSubjectInterface } from './interfaces/route-audit-subject.interface.js';
import { collectAuditedRoutes } from './utils/collect-audited-routes.util.js';

/**
 * Checks every HTTP route against the registered route audit rules once the
 * application has started, when `routeAudit` is set on `CoreModule`.
 *
 * Every rule runs and every violation is collected before startup fails, so
 * one boot shows them all.
 */
@Injectable()
export class RouteAuditService implements OnApplicationBootstrap {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly applicationConfig: ApplicationConfig,
    private readonly modulesContainer: ModulesContainer,
    @Inject(CORE_MODULE_RAW_OPTIONS_TOKEN)
    private readonly options: CoreOptionsInterface,
  ) {}

  onApplicationBootstrap(): void {
    const settings = this.options.routeAudit;

    if (!settings) {
      return;
    }

    const lines = this.audit(settings);

    if (!lines.length) {
      return;
    }

    if (settings.mode === 'report') {
      for (const line of lines) {
        Logger.warn(line, RouteAuditService.name);
      }
      return;
    }

    throw new RouteAuditFailedException(lines);
  }

  private audit(settings: RouteAuditSettingsInterface): string[] {
    const subject: RouteAuditSubjectInterface = {
      routes: collectAuditedRoutes(this.controllers(), this.metadataScanner),
      globalGuards: this.globalGuards(),
    };
    const allow = settings.allow ?? {};
    const used = new Set<string>();
    const { rules, lines } = this.rules();

    for (const rule of rules) {
      const exempt = new Set(allow[rule.name] ?? []);

      for (const violation of rule.audit(subject)) {
        if (violation.route !== undefined && exempt.has(violation.route)) {
          used.add(`${rule.name}\u0000${violation.route}`);
          continue;
        }

        lines.push(
          `[${rule.name}] ${violation.route ?? 'application'}: ${violation.message}`,
        );
      }
    }

    for (const [name, ids] of Object.entries(allow)) {
      for (const id of ids) {
        lines.push(...this.staleAllow(subject.routes, used, name, id));
      }
    }

    // A rule every module provides reports the same lines from each.
    return [...new Set(lines)];
  }

  private staleAllow(
    routes: readonly AuditedRouteInterface[],
    used: ReadonlySet<string>,
    name: string,
    id: string,
  ): string[] {
    const count = routes.filter((route) => route.id === id).length;

    if (count > 1) {
      return [
        `[allow] ${id}: names ${count} routes under ${name}; an exemption names one route. Give the routes different paths, versions or hosts.`,
      ];
    }

    if (!used.has(`${name}\u0000${id}`)) {
      return [
        `[allow] ${id}: exempts nothing under ${name}: no route has this id, or ${name} doesn't flag it. Remove the entry.`,
      ];
    }

    return [];
  }

  /**
   * Every rule instance: modules that provide the same rule may configure it
   * differently, so each runs. A tagged provider that can't run at startup,
   * or two classes under one name, is a violation: a rule must never be
   * skipped without a word.
   */
  private rules(): { rules: RouteAuditRuleInterface[]; lines: string[] } {
    const rules: RouteAuditRuleInterface[] = [];
    const lines: string[] = [];

    for (const wrapper of this.discovery.getProviders({
      metadataKey: RouteAuditRuleProvider.KEY,
    })) {
      const instance: unknown = wrapper.isDependencyTreeStatic()
        ? wrapper.instance
        : undefined;

      if (!isRouteAuditRule(instance)) {
        lines.push(
          `[audit] ${String(wrapper.name)}: is a @RouteAuditRuleProvider() that can't run at startup. A rule needs a name and an audit method, and neither it nor anything it injects may be request-scoped.`,
        );
        continue;
      }

      rules.push(instance);
    }

    const classes = new Map<string, Set<object>>();

    for (const rule of rules) {
      classes.set(
        rule.name,
        new Set([...(classes.get(rule.name) ?? []), rule.constructor]),
      );
    }

    for (const [name, { size }] of classes) {
      if (size > 1) {
        lines.push(
          `[audit] ${name}: ${size} rule classes share this name. Give each rule its own name.`,
        );
      }
    }

    return { rules, lines };
  }

  /** Each controller, with the path `RouterModule` mounts its module at. */
  private controllers(): MountedControllerInterface[] {
    const { applicationId } = this.modulesContainer;

    return this.discovery.getControllers().flatMap((wrapper) => {
      if (typeof wrapper.metatype !== 'function') {
        return [];
      }

      const module = wrapper.host?.metatype;
      const modulePath: unknown = module
        ? (Reflect.getMetadata(MODULE_PATH + applicationId, module) ??
          Reflect.getMetadata(MODULE_PATH, module))
        : undefined;

      return [
        {
          controller: wrapper.metatype,
          modulePath: typeof modulePath === 'string' ? modulePath : '',
        },
      ];
    });
  }

  private globalGuards(): RouteAuditSubjectInterface['globalGuards'] {
    // A factory provider can resolve its guard to nothing, which then
    // guards nothing; a request-scoped factory's metatype is the factory.
    return [
      ...this.applicationConfig
        .getGlobalGuards()
        .flatMap((guard: unknown) =>
          typeof guard === 'object' && guard !== null
            ? [guard.constructor]
            : [],
        ),
      ...this.applicationConfig
        .getGlobalRequestGuards()
        .flatMap((wrapper) =>
          typeof wrapper.metatype === 'function' && !wrapper.isFactory
            ? [wrapper.metatype]
            : [],
        ),
    ];
  }
}

function isRouteAuditRule(value: unknown): value is RouteAuditRuleInterface {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    'audit' in value &&
    typeof value.audit === 'function'
  );
}

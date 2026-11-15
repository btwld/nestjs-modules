import { RequestMethod, VERSION_NEUTRAL } from '@nestjs/common';
import {
  GUARDS_METADATA,
  HOST_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  VERSION_METADATA,
} from '@nestjs/common/constants.js';
import { type MetadataScanner } from '@nestjs/core';

import { type AuditedRouteInterface } from '../interfaces/audited-route.interface.js';
import { type MountedControllerInterface } from '../interfaces/mounted-controller.interface.js';

import { isPublicRoute } from './is-public-route.util.js';

/**
 * Every HTTP route of the given controllers. A method with no request method
 * (a message handler, a helper) is not a route and is left out.
 */
export function collectAuditedRoutes(
  controllers: readonly MountedControllerInterface[],
  metadataScanner: MetadataScanner,
): AuditedRouteInterface[] {
  return controllers.flatMap(({ controller, modulePath }) => {
    const prototype: unknown = controller.prototype;

    if (typeof prototype !== 'object' || prototype === null) {
      return [];
    }

    return metadataScanner
      .getAllMethodNames(prototype)
      .flatMap((name) =>
        routesOf(controller, modulePath, Reflect.get(prototype, name)),
      );
  });
}

function routesOf(
  controller: AuditedRouteInterface['controller'],
  modulePath: string,
  handler: unknown,
): AuditedRouteInterface[] {
  if (typeof handler !== 'function') {
    return [];
  }

  const methods = list(Reflect.getMetadata(METHOD_METADATA, handler)).filter(
    (method) => typeof method === 'number',
  );
  const paths = strings(Reflect.getMetadata(PATH_METADATA, handler));

  if (!methods.length || !paths.length) {
    return [];
  }

  const prefixes = strings(Reflect.getMetadata(PATH_METADATA, controller));
  const qualifiers = [
    versionOf(
      Reflect.getMetadata(VERSION_METADATA, handler) ??
        Reflect.getMetadata(VERSION_METADATA, controller),
    ),
    hostOf(Reflect.getMetadata(HOST_METADATA, controller)),
  ].filter((qualifier) => qualifier !== '');
  const guards = [
    ...guardsOf(Reflect.getMetadata(GUARDS_METADATA, controller)),
    ...guardsOf(Reflect.getMetadata(GUARDS_METADATA, handler)),
  ];
  const open = isPublicRoute(handler, controller);

  return methods.flatMap((method) =>
    (prefixes.length ? prefixes : ['']).flatMap((prefix) =>
      paths.map((path) => ({
        id: [
          `${RequestMethod[method]} ${joinPath(modulePath, prefix, path)}`,
          ...qualifiers,
        ].join(' '),
        method: RequestMethod[method],
        controller,
        handler,
        guards,
        public: open,
      })),
    ),
  );
}

function list(value: unknown): unknown[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function strings(value: unknown): string[] {
  return list(value).filter((item) => typeof item === 'string');
}

function joinPath(...parts: string[]): string {
  const segments = parts
    .map((segment) => segment.replace(/^\/+|\/+$/g, ''))
    .filter((segment) => segment !== '');

  return `/${segments.join('/')}`;
}

function versionOf(value: unknown): string {
  const versions = list(value).map((version) =>
    version === VERSION_NEUTRAL ? 'neutral' : `v${String(version)}`,
  );

  return versions.join(',');
}

function hostOf(value: unknown): string {
  const hosts = list(value).map(String);

  return hosts.length ? `@${hosts.join(',')}` : '';
}

/** A guard is applied as a class or as an instance; report its class. */
function guardsOf(value: unknown): AuditedRouteInterface['guards'] {
  return list(value).flatMap((guard) => {
    if (typeof guard === 'function') {
      return [guard];
    }

    return typeof guard === 'object' && guard !== null
      ? [guard.constructor]
      : [];
  });
}

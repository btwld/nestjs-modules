import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type PlainLiteralObject,
} from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';

import { type RepositoryModuleOptionsInterface } from '../interfaces/repository-module-options.interface.js';
import { RepositoryAdapter } from '../repository/repository-adapter.js';
import { REPOSITORY_MODULE_OPTIONS } from '../repository.constants.js';

import { RowScopeBootException } from './exceptions/row-scope-boot.exception.js';
import {
  checkDeclarationCompleteness,
  checkResolversBound,
} from './row-scope-boot-checks.js';

/**
 * Runs the structural row scope checks at startup.
 *
 * Adapters are discovered rather than read out of the repository registry, so
 * the checks cover every registration path — including a driver module called
 * directly, which the registry never sees.
 *
 * Structural only: nothing here probes what a resolver actually does. That
 * would be the same "framework verifies implementer" problem relocated to
 * boot.
 */
@Injectable()
export class RowScopeBootService implements OnApplicationBootstrap {
  constructor(
    private readonly discoveryService: DiscoveryService,
    @Inject(REPOSITORY_MODULE_OPTIONS)
    private readonly moduleOptions: RepositoryModuleOptionsInterface,
  ) {}

  onApplicationBootstrap(): void {
    const adapters = this.discoverAdapters();

    const failures = [
      ...checkResolversBound(adapters),
      ...(this.moduleOptions.requireRowScopeDeclaration
        ? checkDeclarationCompleteness(adapters)
        : []),
    ];

    if (failures.length > 0) {
      throw new RowScopeBootException(failures);
    }
  }

  private discoverAdapters(): RepositoryAdapter<PlainLiteralObject>[] {
    const adapters: RepositoryAdapter<PlainLiteralObject>[] = [];

    for (const wrapper of this.discoveryService.getProviders()) {
      const { instance } = wrapper;
      if (instance instanceof RepositoryAdapter) {
        adapters.push(instance);
      }
    }

    return adapters;
  }
}

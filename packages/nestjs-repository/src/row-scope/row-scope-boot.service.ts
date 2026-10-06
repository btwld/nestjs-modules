import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';

import { type RepositoryModuleOptionsInterface } from '../interfaces/repository-module-options.interface.js';
import { discoverRepositoryAdapters } from '../repository/utils/discover-adapters.util.js';
import { REPOSITORY_MODULE_OPTIONS } from '../repository.constants.js';

import { RowScopeBootException } from './exceptions/row-scope-boot.exception.js';
import {
  checkDeclarationCompleteness,
  checkResolversBound,
} from './row-scope-boot-checks.js';

/**
 * Runs the structural row scope checks at startup.
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
    const adapters = discoverRepositoryAdapters(this.discoveryService);

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
}

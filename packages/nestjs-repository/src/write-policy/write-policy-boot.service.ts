import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';

import { type RepositoryModuleOptionsInterface } from '../interfaces/repository-module-options.interface.js';
import { discoverRepositoryAdapters } from '../repository/utils/discover-adapters.util.js';
import { REPOSITORY_MODULE_OPTIONS } from '../repository.constants.js';

import { WritePolicyBootException } from './exceptions/write-policy-boot.exception.js';
import {
  checkNoSoftDeleteOnAppendOnly,
  checkWritePolicyCompleteness,
} from './write-policy-boot-checks.js';

/**
 * Runs the structural write-policy checks at startup.
 *
 * Structural only, as with row scope: nothing here attempts to prove that no
 * write can reach a table by some route outside the repository. It refuses a
 * soft-delete column on an append-only entity, and — when the deployment
 * requires it — an entity with no declaration, so each is a startup failure
 * rather than a silent mistake.
 */
@Injectable()
export class WritePolicyBootService implements OnApplicationBootstrap {
  constructor(
    private readonly discoveryService: DiscoveryService,
    @Inject(REPOSITORY_MODULE_OPTIONS)
    private readonly moduleOptions: RepositoryModuleOptionsInterface,
  ) {}

  onApplicationBootstrap(): void {
    const adapters = discoverRepositoryAdapters(this.discoveryService);

    const failures = [
      ...checkNoSoftDeleteOnAppendOnly(adapters),
      ...(this.moduleOptions.requireWritePolicyDeclaration
        ? checkWritePolicyCompleteness(adapters)
        : []),
    ];

    if (failures.length > 0) {
      throw new WritePolicyBootException(failures);
    }
  }
}

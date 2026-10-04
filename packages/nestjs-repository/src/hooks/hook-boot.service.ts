import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, ModuleRef } from '@nestjs/core';

import { HookBootException } from '../exceptions/hook-boot.exception.js';
import { discoverRepositoryAdapters } from '../repository/utils/discover-adapters.util.js';

import { checkHooksBound, checkHooksUsable } from './hook-boot-checks.js';

/**
 * Runs the structural hook checks at startup.
 *
 * Structural only: nothing here calls a hook. The checks cover the ways a
 * registered hook silently never runs — unbound, undecorated, decorated for
 * another subsystem, or not resolvable from the container.
 */
@Injectable()
export class HookBootService implements OnApplicationBootstrap {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly moduleRef: ModuleRef,
  ) {}

  onApplicationBootstrap(): void {
    const adapters = discoverRepositoryAdapters(this.discoveryService);

    const failures = [
      ...checkHooksBound(adapters),
      ...checkHooksUsable(adapters, this.moduleRef),
    ];

    if (failures.length > 0) {
      throw new HookBootException(failures);
    }
  }
}

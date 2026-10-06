import { type PlainLiteralObject } from '@nestjs/common';
import { type DiscoveryService } from '@nestjs/core';

import { RepositoryAdapter } from '../repository-adapter.js';

/**
 * Every repository adapter in the application container.
 *
 * Discovered rather than read out of the repository registry, so callers cover
 * every registration path — including a driver module called directly, which
 * the registry never sees.
 */
export function discoverRepositoryAdapters(
  discoveryService: DiscoveryService,
): RepositoryAdapter<PlainLiteralObject>[] {
  const adapters: RepositoryAdapter<PlainLiteralObject>[] = [];

  for (const wrapper of discoveryService.getProviders()) {
    const { instance } = wrapper;
    if (instance instanceof RepositoryAdapter) {
      adapters.push(instance);
    }
  }

  return adapters;
}

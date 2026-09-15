import { SetMetadata } from '@nestjs/common';

export const CACHE_NAMESPACE_KEY = 'CACHE_NAMESPACE';

export interface CacheNamespaceOptions {
  name: string;
}

export const CacheNamespace = (options: CacheNamespaceOptions) =>
  SetMetadata(CACHE_NAMESPACE_KEY, options);

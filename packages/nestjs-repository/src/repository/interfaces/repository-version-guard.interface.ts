import { type PlainLiteralObject } from '@nestjs/common';

/**
 * A resolved instruction for an adapter to compare-and-swap on a version
 * column. Produced by `RepositoryAdapter`; adapters consume it and never
 * decide whether one applies. Callers must not set it — `RepositoryAdapter`
 * overwrites whatever it is handed.
 */
export interface RepositoryVersionGuardInterface<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> {
  column: keyof Entity & string;
  value: Entity[keyof Entity & string];
}

import { type PlainLiteralObject } from '@nestjs/common';

/**
 * A resolved instruction for a driver to compare-and-swap on a version
 * column. Produced by `RepositoryAdapter`; drivers consume it and never
 * decide whether one applies. Callers must not set it — the adapter
 * overwrites whatever it is handed.
 */
export interface RepositoryVersionGuardInterface<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> {
  column: keyof Entity & string;
  value: Entity[keyof Entity & string];
}

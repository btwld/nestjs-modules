import { type PlainLiteralObject } from '@nestjs/common';

/** How a federated read reaches the related repositories. */
export interface FederationReadOptions {
  /**
   * The `ctx` each related read runs under. Called before every read, so it
   * can refuse a `ctx` a hook changed during an earlier one.
   */
  readonly ctx: () => PlainLiteralObject | undefined;
  readonly withDeleted?: boolean;
  /** The most keys any one query may carry, or any one key set may hold. */
  readonly maxKeys: number;
}

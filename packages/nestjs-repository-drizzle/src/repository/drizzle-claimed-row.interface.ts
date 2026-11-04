import { type PlainLiteralObject } from '@nestjs/common';

/** The row an upsert's key names, locked until its transaction ends. */
export interface DrizzleClaimedRowInterface {
  /** The row as stored. */
  row: PlainLiteralObject;

  /** Whether the upsert inserted it, so it already holds the payload. */
  inserted: boolean;
}

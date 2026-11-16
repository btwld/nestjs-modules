import { type PlainLiteralObject } from '@nestjs/common';

/** The `ctx` a read arrived with, and the row scope resolved from it. */
export interface FederatedCaller {
  readonly ctx?: PlainLiteralObject;
  readonly scope?: PlainLiteralObject;
}

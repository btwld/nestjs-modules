import { type PlainLiteralObject } from '@nestjs/common';

import { type OverlayRef } from './overlay-ref.js';

export type RefsToMethods<
  R extends OverlayRef<string, PlainLiteralObject, unknown[]>,
> = {
  [O in R as O['name']]: O extends OverlayRef<string, infer P, infer A>
    ? (...args: A) => P
    : never;
};

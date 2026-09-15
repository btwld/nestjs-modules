import { type PlainLiteralObject } from '@nestjs/common';

/**
 * Typed token that serves as the single source of truth for an overlay's
 * name and resolved type.
 *
 * Exported as a const alongside each overlay module and used as a lookup
 * key for `get`, narrowing key for `require`, and type carrier.
 *
 * @example
 * ```typescript
 * export const WithFeature = new OverlayRef<'withFeature', FeatureContextInterface>('withFeature');
 * ```
 */
export class OverlayRef<
  Name extends string,
  Props extends PlainLiteralObject,
  Args extends unknown[] = [],
> {
  declare readonly _props: Props;
  declare readonly _args: Args;
  constructor(readonly name: Name) {}
}

import { type PlainLiteralObject } from '@nestjs/common';

import { type OverlayRef } from '../overlay-ref.js';
import { type RefsToMethods } from '../refs-to-methods.type.js';

import { type OverlayDefineOptionsInterface } from './overlay-define-options.interface.js';

export interface AppContextInterface {
  defineOverlay<Name extends string, Props extends PlainLiteralObject>(
    ref: OverlayRef<Name, Props, unknown[]>,
    values: Props,
    options?: OverlayDefineOptionsInterface,
  ): void;

  removeOverlay(
    ref: OverlayRef<string, PlainLiteralObject, unknown[]>,
  ): boolean;

  require<R extends OverlayRef<string, PlainLiteralObject, unknown[]>[]>(
    ...refs: R
  ): this & RefsToMethods<R[number]>;

  with<
    Name extends string,
    Props extends PlainLiteralObject,
    Args extends unknown[],
  >(
    ref: OverlayRef<Name, Props, Args>,
    ...args: Args
  ): Props;

  supports(ref: OverlayRef<string, PlainLiteralObject, unknown[]>): boolean;

  optional(): Record<string, () => this>;
}

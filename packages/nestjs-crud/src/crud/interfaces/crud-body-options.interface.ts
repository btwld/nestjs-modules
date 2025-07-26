import { Body, PlainLiteralObject } from '@nestjs/common';

import { CrudValidationOptions } from '../../crud.types';

export interface CrudBodyOptionsInterface<
  T extends PlainLiteralObject = PlainLiteralObject,
> {
  validation?: CrudValidationOptions<T>;
  pipes?: Parameters<typeof Body>[1][];
}

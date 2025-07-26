import { PlainLiteralObject } from '@nestjs/common';

import { CrudRequestParamOptionInterface } from './crud-request-param-option.interface';

export interface CrudRequestParamsOptionsInterface<
  T extends PlainLiteralObject,
> {
  [key: string]: CrudRequestParamOptionInterface<T>;
}

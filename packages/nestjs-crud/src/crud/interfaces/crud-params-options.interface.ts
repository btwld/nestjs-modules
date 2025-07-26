import { PlainLiteralObject } from '@nestjs/common';

import { CrudParamOptionInterface } from './crud-param-option.interface';

export interface CrudParamsOptionsInterface<T extends PlainLiteralObject> {
  [key: string]: CrudParamOptionInterface<T>;
}

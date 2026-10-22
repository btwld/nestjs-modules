import { type PlainLiteralObject } from '@nestjs/common';

import { type CrudParamOptionInterface } from './crud-param-option.interface.js';

export interface CrudParamsOptionsInterface<T extends PlainLiteralObject> {
  [key: string]: CrudParamOptionInterface<T>;
}

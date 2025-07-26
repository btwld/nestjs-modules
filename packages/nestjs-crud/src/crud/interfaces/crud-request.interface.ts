import { PlainLiteralObject } from '@nestjs/common';

import { CrudRequestParsedParamsInterface } from '../../request/interfaces/crud-request-parsed-params.interface';

import { CrudRequestOptionsInterface } from './crud-request-options.interface';

export interface CrudRequestInterface<
  T extends PlainLiteralObject = PlainLiteralObject,
> {
  parsed: CrudRequestParsedParamsInterface<T>;
  options: CrudRequestOptionsInterface<T>;
}

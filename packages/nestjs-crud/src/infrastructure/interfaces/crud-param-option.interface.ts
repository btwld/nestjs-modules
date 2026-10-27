import { type PlainLiteralObject } from '@nestjs/common';

import { type EntityColumn } from '@concepta/nestjs-repository';

type SwaggerEnumType =
  | (string | number | boolean)[]
  | Record<string, string | number | boolean | object>;

export interface CrudParamOptionInterface<T extends PlainLiteralObject> {
  field?: EntityColumn<T>;
  type?: 'number' | 'string' | 'uuid';
  enum?: SwaggerEnumType;
  primary?: boolean;
  disabled?: boolean;
}

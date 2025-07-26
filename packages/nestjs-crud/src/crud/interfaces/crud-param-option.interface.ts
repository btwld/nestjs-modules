import { PlainLiteralObject } from '@nestjs/common';
import { SwaggerEnumType } from '@nestjs/swagger/dist/types/swagger-enum.type';

import { CrudEntityColumn } from '../../crud.types';
import { ParamOptionType } from '../../request/types/crud-request-param.types';

export interface CrudParamOptionInterface<T extends PlainLiteralObject> {
  field?: CrudEntityColumn<T>;
  type?: ParamOptionType;
  enum?: SwaggerEnumType;
  primary?: boolean;
  disabled?: boolean;
}

import { SwaggerEnumType } from '@nestjs/swagger/dist/types/swagger-enum.type';

import { ParamOptionType } from '../../request/types/crud-request-param.types';

export interface CrudParamOptionInterface {
  field?: string;
  type?: ParamOptionType;
  enum?: SwaggerEnumType;
  primary?: boolean;
  disabled?: boolean;
}

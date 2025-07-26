import { PlainLiteralObject } from '@nestjs/common';

import { CrudEntityColumn } from '../../crud.types';
import { ParamOptionType } from '../types/crud-request-param.types';

export interface CrudRequestParamOptionInterface<T extends PlainLiteralObject> {
  field?: CrudEntityColumn<T>;
  type?: ParamOptionType;
  primary?: boolean;
  disabled?: boolean;
}

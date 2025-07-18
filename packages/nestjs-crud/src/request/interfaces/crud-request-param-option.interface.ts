import { ParamOptionType } from '../types/crud-request-param.types';

export interface CrudRequestParamOptionInterface {
  field?: string;
  type?: ParamOptionType;
  primary?: boolean;
  disabled?: boolean;
}

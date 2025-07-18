import { Body } from '@nestjs/common';

import { CrudValidationOptions } from '../../crud.types';

export interface CrudValidationMetadataInterface {
  propertyKey: string | symbol;
  parameterIndex: number;
  validation: CrudValidationOptions | undefined;
  pipes: Parameters<typeof Body>[1][] | [];
}

import { Body, PlainLiteralObject } from '@nestjs/common';

import { CrudValidationOptions } from '../../crud.types';

export interface CrudValidationMetadataInterface<T extends PlainLiteralObject> {
  propertyKey: string | symbol;
  parameterIndex: number;
  validation: CrudValidationOptions<T> | undefined;
  pipes: Parameters<typeof Body>[1][] | [];
}

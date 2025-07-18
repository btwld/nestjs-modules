import { ClassTransformOptions } from 'class-transformer';

import { Type } from '@nestjs/common';

export interface CrudSerializationOptionsInterface {
  type?: Type;
  paginatedType?: Type;
  toInstanceOptions?: ClassTransformOptions;
  toPlainOptions?: ClassTransformOptions;
}

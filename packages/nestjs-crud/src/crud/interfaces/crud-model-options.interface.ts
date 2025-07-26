import { Type } from '@nestjs/common';

export interface CrudModelOptionsInterface {
  type: Type;
  paginatedType?: Type;
}

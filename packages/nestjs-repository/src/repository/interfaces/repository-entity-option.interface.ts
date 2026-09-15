import { type PlainLiteralObject, type Type } from '@nestjs/common';

export interface RepositoryEntityOptionInterface<
  T extends PlainLiteralObject = PlainLiteralObject,
> {
  entity: Type<T>;
}

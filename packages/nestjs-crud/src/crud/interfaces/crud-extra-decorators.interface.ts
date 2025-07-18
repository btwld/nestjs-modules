import { applyDecorators } from '@nestjs/common';

export interface CrudExtraDecoratorsInterface {
  extraDecorators?: ReturnType<typeof applyDecorators>[];
}

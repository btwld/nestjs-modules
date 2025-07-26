import { Exclude } from 'class-transformer';

import { InternalServerErrorException } from '@nestjs/common';

@Exclude()
export class CrudInvalidResponseDto {
  constructor() {
    throw new InternalServerErrorException(
      'Fell back to default response DTO, this is a security issue.',
    );
  }
}

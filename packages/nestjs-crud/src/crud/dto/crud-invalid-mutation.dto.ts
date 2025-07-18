import { InternalServerErrorException } from '@nestjs/common';

export class CrudInvalidMutationDto {
  constructor() {
    throw new InternalServerErrorException(
      'Fell back to default mutation DTO, this is a security issue.',
    );
  }
}

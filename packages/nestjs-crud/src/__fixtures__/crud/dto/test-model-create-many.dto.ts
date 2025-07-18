import { Type } from 'class-transformer';
import { IsArray, ArrayNotEmpty, ValidateNested } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { CrudCreateManyInterface } from '../../../crud/interfaces/crud-create-many.interface';

import { TestModelCreateDto } from './test-model-create.dto';

export class TestModelCreateManyDto
  implements CrudCreateManyInterface<TestModelCreateDto>
{
  @ApiProperty({ type: TestModelCreateDto, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TestModelCreateDto)
  bulk: TestModelCreateDto[] = [];
}

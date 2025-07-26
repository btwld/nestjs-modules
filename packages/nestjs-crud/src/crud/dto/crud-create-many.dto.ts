import { Exclude, Expose, Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { CrudCreateManyInterface } from '../interfaces/crud-create-many.interface';

import { CrudInvalidMutationDto } from './crud-invalid-mutation.dto';

@Exclude()
export class CrudCreateManyDto<T> implements CrudCreateManyInterface<T> {
  @Expose()
  @ApiProperty({ type: CrudInvalidMutationDto, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CrudInvalidMutationDto)
  bulk: T[] = [];
}

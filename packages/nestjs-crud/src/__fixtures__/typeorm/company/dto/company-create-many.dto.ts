import { Expose, Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { CrudCreateManyInterface } from '../../../../crud/interfaces/crud-create-many.interface';

import { CompanyCreateDto } from './company-create.dto';

export class CompanyCreateManyDto
  implements CrudCreateManyInterface<CompanyCreateDto>
{
  @Expose()
  @ApiProperty({ type: CompanyCreateDto, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CompanyCreateDto)
  bulk: CompanyCreateDto[] = [];
}

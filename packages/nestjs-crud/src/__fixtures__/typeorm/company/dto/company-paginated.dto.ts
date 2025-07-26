import { Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { CrudResponsePaginatedDto } from '../../../../crud/dto/crud-response-paginated.dto';

import { CompanyDto } from './company.dto';

export class CompanyPaginatedDto extends CrudResponsePaginatedDto<CompanyDto> {
  @ApiProperty({
    type: CompanyDto,
    isArray: true,
  })
  @Type(() => CompanyDto)
  data!: CompanyDto[];
}

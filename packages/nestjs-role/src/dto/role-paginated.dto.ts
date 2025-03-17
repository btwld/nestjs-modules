import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CrudResponsePaginatedDto } from '@concepta/nestjs-crud';
import { RoleInterface } from '@concepta/nestjs-common';
import { RoleDto } from './role.dto';

/**
 * Role paginated DTO
 */
@Exclude()
export class RolePaginatedDto extends CrudResponsePaginatedDto<RoleInterface> {
  @Expose()
  @ApiProperty({
    type: RoleDto,
    isArray: true,
    description: 'Array of Roles',
  })
  @Type(() => RoleDto)
  data: RoleInterface[] = [];
}

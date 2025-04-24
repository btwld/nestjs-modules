import { IsOptional, IsString } from 'class-validator';
import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { RoleInterface, CommonEntityDto } from '@concepta/nestjs-common';

/**
 * Role DTO
 */
@Exclude()
export class RoleDto extends CommonEntityDto implements RoleInterface {
  /**
   * Name
   */
  @Expose()
  @ApiProperty({
    type: 'string',
    description: 'Name of the role',
  })
  @IsString()
  name = '';

  /**
   * Name
   */
  @Expose()
  @ApiProperty({
    type: 'string',
    description: 'Description of the role',
  })
  @IsString()
  @IsOptional()
  description = '';
}

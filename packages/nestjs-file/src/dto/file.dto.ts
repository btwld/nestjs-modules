import { CommonEntityDto } from '@concepta/nestjs-common';
import { FileInterface } from '@concepta/nestjs-common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

/**
 * File DTO
 */
@Exclude()
export class FileDto extends CommonEntityDto implements FileInterface {
  /**
   * Storage provider key
   */
  @Expose()
  @ApiProperty({
    type: 'string',
    description: 'serviceKey of the file',
  })
  @IsString()
  serviceKey = '';

  @Expose()
  @ApiProperty({
    type: 'string',
    description: 'fileName of the file',
  })
  @IsString()
  fileName = '';

  @Expose()
  @ApiProperty({
    type: 'string',
    description: 'contentType of the file',
  })
  @IsString()
  contentType = '';

  @Expose()
  @ApiPropertyOptional({
    type: 'string',
    description: 'Dynamic upload URI for the file',
  })
  @IsString()
  @IsOptional()
  uploadUri?: string;

  @Expose()
  @ApiPropertyOptional({
    type: 'string',
    description: 'Dynamic download URL for the file',
  })
  @IsString()
  @IsOptional()
  downloadUrl?: string;
}

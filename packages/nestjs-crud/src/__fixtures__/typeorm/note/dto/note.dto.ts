import { Expose } from 'class-transformer';
import { IsNumber } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class NoteDto {
  @Expose()
  @ApiProperty({ type: 'number' })
  @IsNumber()
  id!: string;

  @Expose()
  @ApiProperty({ type: 'number' })
  @IsNumber()
  revisionId!: string;
}

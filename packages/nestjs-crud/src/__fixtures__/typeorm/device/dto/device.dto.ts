import { Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

export class DeviceDto {
  @Expose()
  @ApiProperty({ type: 'string' })
  deviceKey!: string;

  @Expose()
  description?: string;
}

import { Expose } from 'class-transformer';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class DeviceCreateDto {
  @Expose()
  @IsOptional()
  @IsUUID('4')
  deviceKey!: string;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string;
}

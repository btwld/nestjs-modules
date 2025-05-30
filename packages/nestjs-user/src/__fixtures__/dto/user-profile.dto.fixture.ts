import { Exclude, Expose } from 'class-transformer';
import { IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { UserProfileDto } from '../../dto/profile/user-profile.dto';

@Exclude()
export class UserProfileDtoFixture extends UserProfileDto {
  @Expose()
  @ApiProperty()
  @IsString()
  firstName!: string;
}

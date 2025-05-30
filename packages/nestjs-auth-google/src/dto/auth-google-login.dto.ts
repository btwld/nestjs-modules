import { Exclude, Expose } from 'class-transformer';
import { IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { AuthenticationCodeInterface } from '@concepta/nestjs-common';

@Exclude()
export class AuthGoogleLoginDto implements AuthenticationCodeInterface {
  @Expose()
  @ApiProperty({
    type: 'string',
    description: 'Code returned from google',
  })
  @IsString()
  code = '';
}

import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AuthenticationResponseInterface } from '@concepta/nestjs-common';

@Exclude()
export class AuthenticationJwtResponseDto
  implements AuthenticationResponseInterface
{
  @Expose()
  @ApiProperty({
    type: 'string',
    description: 'JWT access token to use for request authorization.',
  })
  accessToken = '';

  @Expose()
  @ApiProperty({
    type: 'string',
    description: 'JWT refresh token to use for obtaining a new access token.',
  })
  refreshToken = '';
}

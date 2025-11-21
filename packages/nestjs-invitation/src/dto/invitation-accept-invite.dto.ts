import { IsObject, IsOptional, IsString } from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { LiteralObject } from '@concepta/nestjs-common';

export class InvitationAcceptInviteDto {
  @ApiProperty({
    title: 'passcode activate invitation',
    type: 'string',
    description: 'Passcode used to activate account',
  })
  @IsString()
  passcode = '';

  @ApiPropertyOptional({
    title: 'Payload',
    type: 'object',
    description:
      'Payload content that will be passed through another module ir order to complete the activation.' +
      ' This payload will have necessary info to target module complete the activation e.g. new password or what ever required info.' +
      ' The object not have any strong type defined on purpose because the target moules will have object different signatures',
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  payload?: LiteralObject;
}

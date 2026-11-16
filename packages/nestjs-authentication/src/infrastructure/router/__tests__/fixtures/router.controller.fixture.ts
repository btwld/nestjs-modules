import { Controller, Get, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUserInterface } from '../../../../domain/interfaces/authenticated-user.interface.js';
import { AuthPublic } from '../../../decorators/auth-public.decorator.js';
import { AuthUser } from '../../../decorators/auth-user.decorator.js';
import { authenticationResponseSchema } from '../../../schemas/authentication-response.schema.js';
import { AuthRouterGuard } from '../../auth-router.guard.js';

@Controller('auth-router')
@UseGuards(AuthRouterGuard)
@AuthPublic({ classLevel: true })
@ApiTags('auth')
export class RouterControllerFixture {
  constructor() {}

  /**
   * Login
   */
  @ApiOkResponse({
    description: 'Users are redirected to request their Auth Router identity.',
  })
  @Get('login')
  login(): void {
    return;
  }

  @ApiResponse({
    status: HttpStatus.OK,
    standardSchema: authenticationResponseSchema,
    description: 'Schema containing an access token and a refresh token.',
  })
  @Get('callback')
  async callback(@AuthUser() _user: AuthenticatedUserInterface) {
    return {
      ok: 'success',
    };
  }

  @ApiResponse({
    status: HttpStatus.OK,
    standardSchema: authenticationResponseSchema,
    description: 'Schema containing an access token and a refresh token.',
  })
  @Post('callback')
  async postCallback(@AuthUser() _user: AuthenticatedUserInterface) {
    return {
      ok: 'success',
    };
  }
}

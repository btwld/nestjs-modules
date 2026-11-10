import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { type AuthenticatedUserInterface } from '../../../../../domain/interfaces/authenticated-user.interface.js';
import { AuthPublic } from '../../../../decorators/auth-public.decorator.js';
import { AuthUser } from '../../../../decorators/auth-user.decorator.js';
import { JwtGuard } from '../../jwt.guard.js';

import { AuthUserCtxProbeGuardFixture } from './auth-user-ctx-probe.guard.fixture.js';

@Controller('user')
@UseGuards(JwtGuard)
export class UserControllerFixtures {
  /**
   * Status
   */
  @Get('status')
  getStatus(): boolean {
    return true;
  }

  @Get('ctx-in-guard')
  @UseGuards(AuthUserCtxProbeGuardFixture)
  getCtxInGuard(@Req() request: { authUserIdInGuard?: string | null }) {
    return { id: request.authUserIdInGuard ?? null };
  }

  @Get('optional')
  @AuthPublic({ optional: true })
  getOptional(@AuthUser() user?: AuthenticatedUserInterface) {
    return { id: user?.id ?? null };
  }

  @Get('public')
  @AuthPublic()
  getPublic(@AuthUser() user?: AuthenticatedUserInterface) {
    return { id: user?.id ?? null };
  }
}

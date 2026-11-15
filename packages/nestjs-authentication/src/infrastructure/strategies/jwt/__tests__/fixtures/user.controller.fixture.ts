import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { type AuthenticatedUserInterface } from '../../../../../domain/interfaces/authenticated-user.interface.js';
import { AuthPublic } from '../../../../decorators/auth-public.decorator.js';
import { AuthUser } from '../../../../decorators/auth-user.decorator.js';
import { JwtGuard } from '../../jwt.guard.js';

import { AuthUserCtxDefiningGuardFixture } from './auth-user-ctx-defining.guard.fixture.js';
import { AuthUserCtxProbeGuardFixture } from './auth-user-ctx-probe.guard.fixture.js';
import { RequestUserOnlyGuardFixture } from './request-user-only.guard.fixture.js';

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

  @Get('own-guard/request-user')
  @AuthPublic()
  @UseGuards(RequestUserOnlyGuardFixture, AuthUserCtxProbeGuardFixture)
  getOwnGuardRequestUser(
    @Req() request: { authUserIdInGuard?: string | null },
    @AuthUser() user?: AuthenticatedUserInterface,
  ) {
    return {
      inGuard: request.authUserIdInGuard ?? null,
      inHandler: user?.id ?? null,
    };
  }

  @Get('own-guard/auth-user-ctx')
  @AuthPublic()
  @UseGuards(AuthUserCtxDefiningGuardFixture, AuthUserCtxProbeGuardFixture)
  getOwnGuardAuthUserCtx(
    @Req() request: { authUserIdInGuard?: string | null },
    @AuthUser() user?: AuthenticatedUserInterface,
  ) {
    return {
      inGuard: request.authUserIdInGuard ?? null,
      inHandler: user?.id ?? null,
    };
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

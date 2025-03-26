import { Injectable } from '@nestjs/common';
import { AuthGuard } from '../core/guards/auth.guard';
import { AUTH_REFRESH_MODULE_STRATEGY_NAME } from './auth-refresh.constants';

@Injectable()
export class AuthRefreshGuard extends AuthGuard(
  AUTH_REFRESH_MODULE_STRATEGY_NAME,
  {
    canDisable: false,
  },
) {}

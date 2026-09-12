import { type CanActivate, type Type } from '@nestjs/common';

export interface AuthRouterGuardConfigInterface {
  name: string;
  guard: Type<CanActivate>;
}

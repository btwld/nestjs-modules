import { type CanActivate } from '@nestjs/common';

export interface AuthGuardOptions {
  canDisable?: boolean;
}

export type AuthGuardCtr = new (
  strategyName: string,
  options: AuthGuardOptions,
) => CanActivate;

import { type CanActivate, type ExecutionContext } from '@nestjs/common';

export interface GuardsPolicySettingsInterface {
  enable?: boolean;
  disable?: <T extends CanActivate>(
    context: ExecutionContext,
    guard: T,
  ) => boolean;
}

export class GuardsPolicy {
  readonly enable: boolean;
  readonly disable: <T extends CanActivate>(
    context: ExecutionContext,
    guard: T,
  ) => boolean;

  constructor(settings?: GuardsPolicySettingsInterface) {
    this.enable = settings?.enable ?? true;
    this.disable = settings?.disable ?? (() => false);
  }
}

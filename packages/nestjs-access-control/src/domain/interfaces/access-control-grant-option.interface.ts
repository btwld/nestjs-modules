import { type ActionEnum } from '@concepta/nestjs-core';

export interface AccessControlGrantOptionInterface {
  resource: string;
  action: ActionEnum;
}

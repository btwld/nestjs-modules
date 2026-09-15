import { type EventContextHeadersInterface } from '@concepta/nestjs-core';

export interface RoleEventHeaderInterface extends EventContextHeadersInterface {
  namespace: string;
}

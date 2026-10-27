import { type EventContextHeadersInterface } from '@concepta/nestjs-core';

export interface CacheEventHeaderInterface extends EventContextHeadersInterface {
  namespace: string;
}

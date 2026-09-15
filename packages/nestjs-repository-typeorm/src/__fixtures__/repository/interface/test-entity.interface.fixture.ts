import {
  type AuditInterface,
  type ReferenceIdInterface,
} from '@concepta/nestjs-core';

export interface TestInterfaceFixture
  extends ReferenceIdInterface, AuditInterface {
  firstName: string;
  lastName?: string;
}

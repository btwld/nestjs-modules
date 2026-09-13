import { type ReferenceIdInterface } from '@concepta/nestjs-core';

export interface VersionedEntityInterfaceFixture extends ReferenceIdInterface {
  name: string;
  version: number;
  dateDeleted: Date | null;
}

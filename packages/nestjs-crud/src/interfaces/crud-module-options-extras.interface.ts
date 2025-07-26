import { DynamicModule } from '@nestjs/common';

export interface CrudModuleOptionsExtrasInterface
  extends Pick<DynamicModule, 'global' | 'imports'> {}

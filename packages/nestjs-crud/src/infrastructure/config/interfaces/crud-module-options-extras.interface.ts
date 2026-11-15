import { type DynamicModule } from '@nestjs/common';

export type CrudModuleOptionsExtrasInterface = Pick<
  DynamicModule,
  'global' | 'imports'
>;

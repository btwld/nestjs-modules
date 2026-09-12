import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';

import { CrudModule } from '../crud.module.js';
import { CrudOperationResolver } from '../infrastructure/resolvers/crud-operation.resolver.js';

import { PhotoCcbModuleFixture } from './photo-ccb/photo-ccb.module.fixture.js';

@Module({
  imports: [
    RepositoryModule.forRoot({}),
    CrudModule.forRoot({
      defaultResolver: CrudOperationResolver,
    }),
    PhotoCcbModuleFixture,
  ],
})
export class AppResolverOperationModuleFixture {}

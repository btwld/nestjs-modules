import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { RepositoryModule } from '@concepta/nestjs-repository';

import { CrudModule } from '../crud.module.js';
import { CrudCqrsResolver } from '../infrastructure/resolvers/crud-cqrs.resolver.js';

import { PhotoCcbModuleFixture } from './photo-ccb/photo-ccb.module.fixture.js';

@Module({
  imports: [
    RepositoryModule.forRoot({}),
    CqrsModule.forRoot(),
    CrudModule.forRoot({
      defaultResolver: CrudCqrsResolver,
    }),
    PhotoCcbModuleFixture,
  ],
})
export class AppResolverCqrsModuleFixture {}

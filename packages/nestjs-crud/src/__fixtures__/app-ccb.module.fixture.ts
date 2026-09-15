import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';

import { CrudModule } from '../crud.module.js';

import { PhotoCcbModuleFixture } from './photo-ccb/photo-ccb.module.fixture.js';

@Module({
  imports: [
    RepositoryModule.forRoot({}),
    CrudModule.forRoot({}),
    PhotoCcbModuleFixture,
  ],
})
export class AppCcbModuleFixture {}

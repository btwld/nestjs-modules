import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';

import { CrudModule } from '../crud.module.js';

import { PhotoCcbCustomModuleFixture } from './photo-ccb-custom/photo-ccb-custom.module.fixture.js';

@Module({
  imports: [
    RepositoryModule.forRoot({}),
    CrudModule.forRoot({}),
    PhotoCcbCustomModuleFixture,
  ],
})
export class AppCcbCustomModuleFixture {}

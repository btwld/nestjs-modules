import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';

import { CrudModule } from '../crud.module.js';

import { PhotoBodyFallbackModuleFixture } from './photo-body-fallback/photo-body-fallback.module.fixture.js';

@Module({
  imports: [
    RepositoryModule.forRoot({}),
    CrudModule.forRoot({}),
    PhotoBodyFallbackModuleFixture,
  ],
})
export class AppPhotoBodyFallbackModuleFixture {}

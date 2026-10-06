import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';

import { PhotoModuleFixture } from './photo/photo.module.fixture.js';

@Module({
  imports: [RepositoryModule.forRoot({}), PhotoModuleFixture.register()],
})
export class AppModuleFixture {}

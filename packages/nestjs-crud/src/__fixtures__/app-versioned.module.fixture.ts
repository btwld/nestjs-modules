import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';

import { CrudModule } from '../crud.module.js';

import { VersionedModuleFixture } from './versioned/versioned.module.fixture.js';

@Module({
  imports: [
    RepositoryModule.forRoot({}),
    CrudModule.forRoot({}),
    VersionedModuleFixture,
  ],
})
export class AppVersionedModuleFixture {}

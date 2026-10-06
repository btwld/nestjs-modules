import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RepositoryModule } from '@concepta/nestjs-repository';

import { relationOrmConfig } from '../config/relation-ormconfig.fixture.js';

import { RelationTestModuleFixture } from './relation-test.module.fixture.js';

@Module({
  imports: [
    TypeOrmModule.forRoot(relationOrmConfig),
    RepositoryModule.forRoot({}),
    RelationTestModuleFixture,
  ],
})
export class RelationAppModuleFixture {}

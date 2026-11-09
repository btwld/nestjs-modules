import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmSqliteRepositoryModule } from '@concepta/nestjs-repository-typeorm/sqlite';

import { OtpModule } from '../../otp.module.js';

import { UserEntityFixture } from './entities/user-entity.fixture.js';
import { UserOtpEntityFixture } from './entities/user-otp-entity.fixture.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: ':memory:',
      synchronize: true,
      entities: [UserEntityFixture, UserOtpEntityFixture],
    }),
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: TypeOrmSqliteRepositoryModule,
          entities: [
            {
              key: 'userOtp',
              entity: UserOtpEntityFixture,
            },
          ],
        },
      ],
    }),
    OtpModule.forRoot({}),
    OtpModule.forFeature(['userOtp']),
  ],
})
export class AppModuleFixture {}

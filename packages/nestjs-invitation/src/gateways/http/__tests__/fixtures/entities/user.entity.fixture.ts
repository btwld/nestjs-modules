import { Entity } from 'typeorm';

import { UserSqliteEntity } from '@concepta/nestjs-user/optional/typeorm';

@Entity()
export class UserEntityFixture extends UserSqliteEntity {}

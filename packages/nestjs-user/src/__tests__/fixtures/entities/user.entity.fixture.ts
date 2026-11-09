import { Entity } from 'typeorm';

import { UserSqliteEntity } from '../../../infrastructure/persistence/typeorm/user-sqlite.entity.js';

@Entity()
export class UserEntityFixture extends UserSqliteEntity {}

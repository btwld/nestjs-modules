import { Entity } from 'typeorm';

import { UserCredentialSqliteEntity } from '../../../infrastructure/persistence/typeorm/user-credential-sqlite.entity.js';

@Entity()
export class UserCredentialEntityFixture extends UserCredentialSqliteEntity {}

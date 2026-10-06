import { Entity } from 'typeorm';

import { UserCredentialSqliteEntity } from '@concepta/nestjs-user/optional/typeorm';

@Entity()
export class UserCredentialEntityFixture extends UserCredentialSqliteEntity {}

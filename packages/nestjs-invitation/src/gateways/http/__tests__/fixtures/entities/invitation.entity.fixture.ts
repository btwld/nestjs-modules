import { Entity } from 'typeorm';

import { InvitationSqliteEntity } from '../../../../../infrastructure/persistence/typeorm/invitation-sqlite.entity.js';

@Entity()
export class InvitationEntityFixture extends InvitationSqliteEntity {}

import { Entity } from 'typeorm';

import { ActivitySqliteEntity } from '../../../sqlite/entities/activity-sqlite.entity.js';

/** An activity store, with nothing beyond the base's columns. */
@Entity()
export class ActivityEntityFixture extends ActivitySqliteEntity {}

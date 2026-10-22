import { Entity } from 'typeorm';

import { ActivitySqliteEntity } from '../../../entities/activity/activity-sqlite.entity.js';

/** An activity store, with nothing beyond the base's columns. */
@Entity()
export class ActivityEntityFixture extends ActivitySqliteEntity {}

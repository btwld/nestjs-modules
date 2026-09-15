import { Entity } from 'typeorm';

import { OtpSqliteEntity } from '../../../infrastructure/persistence/typeorm/otp-sqlite.entity.js';

/**
 * Otp Entity Fixture
 */
@Entity()
export class UserOtpEntityFixture extends OtpSqliteEntity {}

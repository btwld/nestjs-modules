import { Entity } from 'typeorm';

import { OtpSqliteEntity } from '@concepta/nestjs-otp/optional/typeorm';

@Entity()
export class UserOtpEntityFixture extends OtpSqliteEntity {}

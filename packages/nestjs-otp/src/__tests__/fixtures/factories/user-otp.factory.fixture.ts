import { randomUUID } from 'crypto';

import { Factory } from '@concepta/typeorm-seeding';

import { UserOtpEntityFixture } from '../entities/user-otp-entity.fixture.js';

export class UserOtpFactoryFixture extends Factory<UserOtpEntityFixture> {
  protected options = {
    entity: UserOtpEntityFixture,
  };

  protected async entity(
    userOtp: UserOtpEntityFixture,
  ): Promise<UserOtpEntityFixture> {
    userOtp.type = 'uuid';
    userOtp.passcode = randomUUID();

    return userOtp;
  }
}

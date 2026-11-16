import { Seeder } from '@concepta/typeorm-seeding';

import { OtpFactory } from '../../infrastructure/seeding/otp.factory.js';

/**
 * Otp seeder fixture
 */
export class OtpSeederFixture extends Seeder {
  /**
   * Runner
   */
  public async run(): Promise<void> {
    const createAmount = process.env?.OTP_MODULE_SEEDER_AMOUNT
      ? Number(process.env.OTP_MODULE_SEEDER_AMOUNT)
      : 50;

    const otpFactory = this.factory(OtpFactory);

    await otpFactory.createMany(createAmount);
  }
}

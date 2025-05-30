import { randomUUID } from 'crypto';

import { OtpInterface } from '@concepta/nestjs-common';
import { Factory } from '@concepta/typeorm-seeding';

/**
 * Otp factory
 */
export class OtpFactory extends Factory<OtpInterface> {
  /**
   * List of used names.
   */
  categories: string[] = ['one', 'two', 'three'];

  /**
   * Factory callback function.
   */
  protected async entity(otp: OtpInterface): Promise<OtpInterface> {
    // set the name
    otp.category = this.randomCategory();
    otp.type = 'uuid';
    otp.passcode = randomUUID();

    // return the new otp
    return otp;
  }

  /**
   * Get a random category.
   */
  protected randomCategory(): string {
    // random index
    const randomIdx = Math.floor(Math.random() * this.categories.length);

    // return it
    return this.categories[randomIdx];
  }
}

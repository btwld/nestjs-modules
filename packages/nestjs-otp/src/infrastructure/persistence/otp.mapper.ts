import { DomainMapper } from '@concepta/nestjs-core/aggregate';

import { Otp } from '../../domain/aggregates/otp.js';

import { type OtpEntityInterface } from './interfaces/otp-entity.interface.js';

export class OtpMapper extends DomainMapper<OtpEntityInterface, Otp> {
  /**
   * Picks the OTP's own fields, so a relation the consumer's entity loads
   * never reaches the aggregate, or a write.
   */
  createAggregate(entity: OtpEntityInterface): Otp {
    const {
      id,
      version,
      dateCreated,
      dateUpdated,
      dateDeleted,
      assigneeId,
      category,
      type,
      passcode,
      expirationDate,
      active,
    } = entity;

    return new Otp(
      id,
      { assigneeId, category, type, passcode, expirationDate, active },
      version,
      { dateCreated, dateUpdated, dateDeleted },
    );
  }

  toPersistence(otp: Otp) {
    return otp.toPlain();
  }
}

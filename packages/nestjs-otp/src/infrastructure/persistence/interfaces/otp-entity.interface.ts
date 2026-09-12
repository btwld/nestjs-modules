import {
  type AuditInterface,
  type ReferenceIdInterface,
  type ReferenceVersionInterface,
} from '@concepta/nestjs-core';

import { type OtpInterface } from '../../../domain/interfaces/otp.interface.js';

export interface OtpEntityInterface
  extends
    ReferenceIdInterface,
    ReferenceVersionInterface,
    OtpInterface,
    AuditInterface {}

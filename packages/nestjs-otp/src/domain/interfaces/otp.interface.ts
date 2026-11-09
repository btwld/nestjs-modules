import { type AssigneeRelationInterface } from '@concepta/nestjs-core';

export interface OtpInterface extends AssigneeRelationInterface {
  /**
   * Name
   */
  category: string;

  /**
   * Type of the passcode
   */
  type: string;

  /**
   * Passcode
   */
  passcode: string;

  /**
   * Date it will expire
   */
  expirationDate: Date;

  /**
   * is active status
   */
  active: boolean;
}

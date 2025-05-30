import {
  ReferenceId,
  AuthenticationResponseInterface,
} from '@concepta/nestjs-common';
import { JwtIssueTokenServiceInterface } from '@concepta/nestjs-jwt';

export interface IssueTokenServiceInterface
  extends JwtIssueTokenServiceInterface {
  responsePayload(id: ReferenceId): Promise<AuthenticationResponseInterface>;
}

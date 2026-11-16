import { type ReferenceEmailInterface } from '@concepta/nestjs-common';

export interface AuthAppleProfileInterface extends Partial<ReferenceEmailInterface> {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  at_hash: string;
  email: string;
  email_verified: boolean;
  is_private_email: boolean;
  auth_time: number;
  nonce_supported: boolean;
}

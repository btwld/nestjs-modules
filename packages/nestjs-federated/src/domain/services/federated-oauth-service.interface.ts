import { type PlainLiteralObject } from '@nestjs/common';

import { type FederatedCredentialsInterface } from '../../interfaces/federated-credentials.interface.js';

export interface FederatedOAuthServiceInterface {
  sign(
    ctx: PlainLiteralObject,
    provider: string,
    email: string,
    subject: string,
  ): Promise<FederatedCredentialsInterface>;
}

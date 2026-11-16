import { type PlainLiteralObject } from '@nestjs/common';

/** The authenticated caller, as the row scope overlay carries it. */
export interface RlsPrincipalFixture extends PlainLiteralObject {
  tenantId?: string;
  userId?: string;
  role?: 'tenant-admin';
}

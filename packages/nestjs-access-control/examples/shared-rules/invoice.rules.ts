import { Injectable, Module, type PlainLiteralObject } from '@nestjs/common';

import { type AccessGrants } from '@concepta/nestjs-access-control';
import {
  type Actor,
  actorKeys,
  type AuthorityRuleInterface,
} from '@concepta/nestjs-core';
import {
  CaslAuthority,
  type CaslAuthorityRulesInterface,
} from '@concepta/nestjs-repository/optional/casl';

export const INVOICES = 'invoices';

/**
 * The one rule set: what each role may do with invoices, and with which
 * columns. Access control decides each route by it, and the repository each
 * read and write.
 */
export const INVOICE_RULES: Record<string, AuthorityRuleInterface[]> = {
  'role:clerk': [
    { action: ['create', 'read', 'update'], subject: INVOICES },
    {
      action: 'read',
      subject: INVOICES,
      fields: ['internalNotes'],
      inverted: true,
    },
  ],
  'role:manager': [
    { action: ['create', 'read', 'update', 'delete'], subject: INVOICES },
  ],
};

/**
 * What access control adds for its routes only, by denying: clerks may
 * update invoices, but not an `amount` through this API.
 */
export const ROUTE_GRANTS: AccessGrants = {
  'role:clerk': [
    {
      action: 'update',
      subject: INVOICES,
      fields: ['amount'],
      inverted: true,
    },
  ],
};

/** Which roles each demo user has. */
export const USER_ROLES: Record<string, string[]> = {
  ada: ['clerk'],
  grace: ['manager'],
};

@Injectable()
export class InvoiceRules implements CaslAuthorityRulesInterface {
  rulesFor(_ctx: PlainLiteralObject, actor: Actor): AuthorityRuleInterface[] {
    return actorKeys(actor).flatMap((key) => INVOICE_RULES[key] ?? []);
  }
}

/** The authority both layers share. */
@Module({
  providers: [
    InvoiceRules,
    {
      provide: CaslAuthority,
      inject: [InvoiceRules],
      useFactory: (rules: InvoiceRules) => new CaslAuthority(rules),
    },
  ],
  exports: [CaslAuthority],
})
export class InvoiceAuthorityModule {}

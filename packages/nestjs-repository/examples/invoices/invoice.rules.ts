import { Injectable, type PlainLiteralObject } from '@nestjs/common';

import {
  type Actor,
  actorKeys,
  type AuthorityRuleInterface,
} from '@concepta/nestjs-core';
import { RowScopeBase } from '@concepta/nestjs-repository';
import { type CaslAuthorityRulesInterface } from '@concepta/nestjs-repository/optional/casl';

export const CUSTOMER = 'customer';
export const INVOICE = 'invoice';
export const INVOICE_LINE = 'invoice-line';

export const INVOICE_RULES: Record<string, AuthorityRuleInterface[]> = {
  // Clerks keep invoices, and see customers without their credit limit.
  'role:clerk': [
    {
      action: ['create', 'read', 'update'],
      subject: [INVOICE, INVOICE_LINE],
    },
    { action: 'read', subject: CUSTOMER },
    {
      action: 'read',
      subject: CUSTOMER,
      fields: ['creditLimit'],
      inverted: true,
    },
  ],
  // Intake enters invoices from the mail, and reads nothing back.
  'role:intake': [{ action: 'create', subject: [INVOICE, INVOICE_LINE] }],
  // A junior may raise an invoice, but not its lines.
  'role:junior': [{ action: 'create', subject: INVOICE }],
  // Collections see invoices and every customer column, lines aside.
  'role:collector': [{ action: 'read', subject: [INVOICE, CUSTOMER] }],
  'system:seeder': [{ action: 'create', subject: CUSTOMER }],
};

@Injectable()
export class InvoiceRules implements CaslAuthorityRulesInterface {
  rulesFor(_ctx: PlainLiteralObject, actor: Actor): AuthorityRuleInterface[] {
    return actorKeys(actor).flatMap((key) => INVOICE_RULES[key] ?? []);
  }
}

/** Each tenant's invoices and lines are its own: row scope's job. */
@Injectable()
export class TenantRowScope extends RowScopeBase<{ tenantId: string }> {
  constructor() {
    super({ scope: ['tenantId'] });
  }
}

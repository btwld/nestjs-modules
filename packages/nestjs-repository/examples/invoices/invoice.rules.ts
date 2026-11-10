import { Injectable, type PlainLiteralObject } from '@nestjs/common';

import { type Actor, actorKeys } from '@concepta/nestjs-core';
import { RowScopeBase } from '@concepta/nestjs-repository';
import {
  type CaslAuthorityRule,
  type CaslAuthorityRulesInterface,
} from '@concepta/nestjs-repository/optional/casl';

export const CUSTOMERS = 'customers';
export const INVOICES = 'invoices';
export const INVOICE_LINES = 'invoice-lines';

export const INVOICE_RULES: Record<string, CaslAuthorityRule[]> = {
  // Clerks keep invoices, and see customers without their credit limit.
  'role:clerk': [
    {
      action: ['create', 'read', 'update'],
      subject: [INVOICES, INVOICE_LINES],
    },
    { action: 'read', subject: CUSTOMERS },
    {
      action: 'read',
      subject: CUSTOMERS,
      fields: ['creditLimit'],
      inverted: true,
    },
  ],
  // Intake enters invoices from the mail, and reads nothing back.
  'role:intake': [{ action: 'create', subject: [INVOICES, INVOICE_LINES] }],
  // A junior may raise an invoice, but not its lines.
  'role:junior': [{ action: 'create', subject: INVOICES }],
  // Collections see invoices and every customer column, lines aside.
  'role:collector': [{ action: 'read', subject: [INVOICES, CUSTOMERS] }],
  'system:seeder': [{ action: 'create', subject: CUSTOMERS }],
};

@Injectable()
export class InvoiceRules implements CaslAuthorityRulesInterface {
  rulesFor(_ctx: PlainLiteralObject, actor: Actor): CaslAuthorityRule[] {
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

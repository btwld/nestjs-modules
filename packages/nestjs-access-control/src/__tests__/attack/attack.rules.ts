import { Injectable, Module, type PlainLiteralObject } from '@nestjs/common';

import {
  type Actor,
  actorKeys,
  type AuthorityRuleInterface,
} from '@concepta/nestjs-core';
import { RowScopeBase } from '@concepta/nestjs-repository';
import {
  CaslAuthority,
  type CaslAuthorityRulesInterface,
} from '@concepta/nestjs-repository/optional/casl';

import { type AccessGrants } from '../../domain/interfaces/access-grants.type.js';

export const CUSTOMER = 'customer';
export const INVOICE = 'invoice';
export const INVOICE_LINE = 'invoice-line';

/** A resource no entity stands behind, left to access control's rules. */
export const REPORT = 'report';

/** A resource nobody listed in `except`, and no entity stands behind. */
export const LEDGER = 'ledger';

/**
 * The one data rule set: what each role may do with which entity and which
 * columns. The repository decides every call by it, and access control
 * every route.
 */
export const AUTHORITY_RULES: Record<string, AuthorityRuleInterface[]> = {
  // Clerks keep invoices, never see or write the notes, and see customers
  // without their credit limit.
  'role:clerk': [
    {
      action: ['create', 'read', 'update'],
      subject: [INVOICE, INVOICE_LINE],
    },
    {
      action: ['read', 'create', 'update'],
      subject: INVOICE,
      fields: ['internalNotes'],
      inverted: true,
    },
    { action: 'read', subject: CUSTOMER },
    {
      action: 'read',
      subject: CUSTOMER,
      fields: ['creditLimit'],
      inverted: true,
    },
  ],
  // Managers do everything to invoices and their lines.
  'role:manager': [
    {
      action: ['create', 'read', 'update', 'delete', 'softDelete', 'restore'],
      subject: [INVOICE, INVOICE_LINE],
    },
    { action: 'read', subject: CUSTOMER },
  ],
  // Supervisors read and soft delete, but never delete for good or restore.
  'role:supervisor': [
    { action: ['read', 'softDelete'], subject: [INVOICE, INVOICE_LINE] },
  ],
  // A junior may raise an invoice, but not its lines.
  'role:junior': [
    { action: ['create', 'read'], subject: INVOICE },
    {
      action: ['read', 'create'],
      subject: INVOICE,
      fields: ['internalNotes'],
      inverted: true,
    },
  ],
  // Intake enters invoices from the mail, and reads nothing back.
  'role:intake': [{ action: 'create', subject: [INVOICE, INVOICE_LINE] }],
  // Collections read invoices and every customer column.
  'role:collector': [{ action: 'read', subject: [INVOICE, CUSTOMER] }],
  'system:seeder': [{ action: 'create', subject: CUSTOMER }],
};

/**
 * What access control adds for this API, by denying: a clerk may not change
 * an amount here. Its allows count only on resources in `except`.
 */
export const ROUTE_GRANTS: AccessGrants = {
  'role:clerk': [
    {
      action: 'update',
      subject: INVOICE,
      fields: ['amount'],
      inverted: true,
    },
  ],
  'role:manager': [
    { action: 'read', subject: REPORT },
    { action: 'read', subject: LEDGER },
  ],
};

@Injectable()
export class AttackRules implements CaslAuthorityRulesInterface {
  rulesFor(_ctx: PlainLiteralObject, actor: Actor): AuthorityRuleInterface[] {
    return actorKeys(actor).flatMap((key) => AUTHORITY_RULES[key] ?? []);
  }
}

/** Each tenant's invoices and lines are its own. */
@Injectable()
export class AttackTenantRowScope extends RowScopeBase<{ tenantId: string }> {
  constructor() {
    super({ scope: ['tenantId'] });
  }
}

/** The authority and the row scope, shared by both layers. */
@Module({
  providers: [
    AttackRules,
    AttackTenantRowScope,
    {
      provide: CaslAuthority,
      inject: [AttackRules],
      useFactory: (rules: AttackRules) => new CaslAuthority(rules),
    },
  ],
  exports: [CaslAuthority, AttackTenantRowScope],
})
export class AttackAuthorityModule {}

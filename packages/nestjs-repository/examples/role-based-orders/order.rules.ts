import { Injectable, type PlainLiteralObject } from '@nestjs/common';

import {
  type Actor,
  actorKeys,
  type AuthorityRuleInterface,
} from '@concepta/nestjs-core';
import { type CaslAuthorityRulesInterface } from '@concepta/nestjs-repository/optional/casl';

export const ORDERS = 'orders';

/**
 * Who may do what with orders, by actor key. An application might keep these
 * in settings; the rules-from-storage example keeps them in a table.
 */
export const ORDER_RULES: Record<string, AuthorityRuleInterface[]> = {
  'role:clerk': [
    { action: ['create', 'read', 'update'], subject: ORDERS },
    // Clerks never see what an order costs the business...
    { action: 'read', subject: ORDERS, fields: ['cost'], inverted: true },
    // ...and never change what the customer pays.
    { action: 'update', subject: ORDERS, fields: ['total'], inverted: true },
  ],
  'role:manager': [{ action: ['read', 'update', 'delete'], subject: ORDERS }],
  // The billing integration reads orders and settles them, nothing else.
  'system:billing-sync': [
    { action: 'read', subject: ORDERS },
    { action: 'update', subject: ORDERS, fields: ['total', 'status'] },
  ],
};

@Injectable()
export class OrderRules implements CaslAuthorityRulesInterface {
  rulesFor(_ctx: PlainLiteralObject, actor: Actor): AuthorityRuleInterface[] {
    return actorKeys(actor).flatMap((key) => ORDER_RULES[key] ?? []);
  }
}

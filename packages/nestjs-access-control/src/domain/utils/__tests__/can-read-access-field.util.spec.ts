import { type AuthorityRuleInterface } from '@concepta/nestjs-core';

import { canReadAccessField } from '../can-read-access-field.util.js';
import { createAccessAbility } from '../create-access-ability.util.js';

describe(canReadAccessField.name, () => {
  const readable = (rules: AuthorityRuleInterface<string>[], path: string) =>
    canReadAccessField(
      createAccessAbility(rules),
      { resource: 'invoice' },
      path,
    );

  it('answers with the read rules, whatever the route action', () => {
    const rules: AuthorityRuleInterface<string>[] = [
      { action: 'update', subject: 'invoice' },
      { action: 'read', subject: 'invoice' },
      {
        action: 'update',
        subject: 'invoice',
        fields: ['amount'],
        inverted: true,
      },
      {
        action: 'read',
        subject: 'invoice',
        fields: ['notes'],
        inverted: true,
      },
    ];

    expect(readable(rules, 'amount')).toBe(true);
    expect(readable(rules, 'notes')).toBe(false);
  });

  // The empty path stands for the resource as a whole, for responses with
  // no fields.
  it('answers for the resource as a whole on the empty path', () => {
    expect(
      readable([{ action: 'read', subject: 'invoice', fields: ['id'] }], ''),
    ).toBe(true);
    expect(readable([{ action: 'update', subject: 'invoice' }], '')).toBe(
      false,
    );
  });

  it('reads nothing without a read rule', () => {
    expect(readable([{ action: 'update', subject: 'invoice' }], 'id')).toBe(
      false,
    );
  });
});

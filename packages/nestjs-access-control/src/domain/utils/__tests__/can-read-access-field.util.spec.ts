import { PossessionEnum } from '../../enums/possession.enum.js';
import { type AccessRuleInterface } from '../../interfaces/access-rule.interface.js';
import { canReadAccessField } from '../can-read-access-field.util.js';
import { createAccessAbility } from '../create-access-ability.util.js';

describe(canReadAccessField.name, () => {
  const readable = (
    rules: AccessRuleInterface[],
    possession: PossessionEnum,
    path: string,
  ) =>
    canReadAccessField(
      createAccessAbility(rules),
      { possession, resource: 'invoice' },
      path,
    );

  it('answers with the read rules, whatever the route action', () => {
    const rules: AccessRuleInterface[] = [
      { action: 'update:any', subject: 'invoice' },
      { action: 'read:any', subject: 'invoice' },
      {
        action: 'update:any',
        subject: 'invoice',
        fields: ['amount'],
        inverted: true,
      },
      {
        action: 'read:any',
        subject: 'invoice',
        fields: ['notes'],
        inverted: true,
      },
    ];

    expect(readable(rules, PossessionEnum.ANY, 'amount')).toBe(true);
    expect(readable(rules, PossessionEnum.ANY, 'notes')).toBe(false);
  });

  // The empty path stands for the resource as a whole, for responses with
  // no fields.
  it('answers for the resource as a whole on the empty path', () => {
    expect(
      readable(
        [{ action: 'read:any', subject: 'invoice', fields: ['id'] }],
        PossessionEnum.ANY,
        '',
      ),
    ).toBe(true);
    expect(
      readable(
        [{ action: 'update:any', subject: 'invoice' }],
        PossessionEnum.ANY,
        '',
      ),
    ).toBe(false);
  });

  it('reads nothing without a read rule', () => {
    expect(
      readable(
        [{ action: 'update:any', subject: 'invoice' }],
        PossessionEnum.ANY,
        'id',
      ),
    ).toBe(false);
  });

  it('uses read:own only for a call let through on own', () => {
    const rules: AccessRuleInterface[] = [
      { action: 'read:own', subject: 'invoice' },
    ];

    expect(readable(rules, PossessionEnum.OWN, 'id')).toBe(true);
    expect(readable(rules, PossessionEnum.ANY, 'id')).toBe(false);
  });

  it('shows nothing under read:own to a write let through on any, even on the caller’s own record', () => {
    const rules: AccessRuleInterface[] = [
      { action: 'update:any', subject: 'invoice' },
      { action: 'read:own', subject: 'invoice' },
    ];

    expect(readable(rules, PossessionEnum.ANY, 'id')).toBe(false);
  });

  it('uses read:any on a call let through on own', () => {
    const rules: AccessRuleInterface[] = [
      { action: 'read:any', subject: 'invoice' },
    ];

    expect(readable(rules, PossessionEnum.OWN, 'id')).toBe(true);
  });

  // A write's response shows what a read of the same record would: a
  // caller holding read:any is let in on any there, so read:any decides.
  it('keeps a read:any deny whatever the call was let through on', () => {
    const rules: AccessRuleInterface[] = [
      { action: 'read:any', subject: 'invoice' },
      { action: 'read:own', subject: 'invoice' },
      {
        action: 'read:any',
        subject: 'invoice',
        fields: ['notes'],
        inverted: true,
      },
    ];

    expect(readable(rules, PossessionEnum.ANY, 'notes')).toBe(false);
    expect(readable(rules, PossessionEnum.OWN, 'notes')).toBe(false);
  });

  it('lets read:any decide over read:own for a caller holding both', () => {
    const rules: AccessRuleInterface[] = [
      { action: 'read:any', subject: 'invoice' },
      { action: 'read:own', subject: 'invoice' },
      {
        action: 'read:own',
        subject: 'invoice',
        fields: ['notes'],
        inverted: true,
      },
    ];

    expect(readable(rules, PossessionEnum.OWN, 'notes')).toBe(true);
  });

  it('uses a field-limited read:any as a read would', () => {
    const rules: AccessRuleInterface[] = [
      { action: 'read:any', subject: 'invoice', fields: ['id'] },
      { action: 'read:own', subject: 'invoice' },
    ];

    expect(readable(rules, PossessionEnum.OWN, 'id')).toBe(true);
    expect(readable(rules, PossessionEnum.OWN, 'notes')).toBe(false);
  });
});

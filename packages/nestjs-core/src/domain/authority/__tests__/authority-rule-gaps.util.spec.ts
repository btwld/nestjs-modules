import { authorityRuleGaps } from '../utils/authority-rule-gaps.util.js';

describe(authorityRuleGaps.name, () => {
  const names = {
    subjects: ['invoice', 'customer'],
    actions: ['read', 'update', 'approve'],
  };

  it('lists every pair no rule names, subjects then actions in the order given', () => {
    expect(authorityRuleGaps([], names)).toEqual([
      { subject: 'invoice', action: 'read' },
      { subject: 'invoice', action: 'update' },
      { subject: 'invoice', action: 'approve' },
      { subject: 'customer', action: 'read' },
      { subject: 'customer', action: 'update' },
      { subject: 'customer', action: 'approve' },
    ]);
  });

  it('leaves out a pair an allow, a deny or a pending deny decides, lists included', () => {
    expect(
      authorityRuleGaps(
        [
          { action: 'read', subject: ['invoice', 'customer'] },
          { action: 'update', subject: 'invoice', inverted: true },
          {
            action: ['approve', 'update'],
            subject: 'customer',
            inverted: true,
            pending: 'cfo-approval',
          },
        ],
        names,
      ),
    ).toEqual([{ subject: 'invoice', action: 'approve' }]);
  });

  it('lists a pair decided only for some fields with those fields, once each', () => {
    expect(
      authorityRuleGaps(
        [
          { action: 'update', subject: 'invoice', fields: ['status'] },
          {
            action: 'update',
            subject: 'invoice',
            fields: ['total', 'status'],
            inverted: true,
          },
        ],
        { subjects: ['invoice'], actions: ['update'] },
      ),
    ).toEqual([
      { subject: 'invoice', action: 'update', fields: ['status', 'total'] },
    ]);
  });

  it('leaves out a pair a rule naming no fields decides, beside rules naming some', () => {
    expect(
      authorityRuleGaps(
        [
          { action: 'update', subject: 'invoice', fields: ['status'] },
          {
            action: 'update',
            subject: 'invoice',
            inverted: true,
            pending: 'pricing-policy',
          },
        ],
        { subjects: ['invoice'], actions: ['update'] },
      ),
    ).toEqual([]);
  });

  it('takes manage and all as names like any other, since rules using them are refused', () => {
    expect(
      authorityRuleGaps([{ action: 'manage', subject: 'all' }], {
        subjects: ['invoice'],
        actions: ['read'],
      }),
    ).toEqual([{ subject: 'invoice', action: 'read' }]);
  });

  it('lists each pair once when a name is given twice', () => {
    expect(
      authorityRuleGaps([], {
        subjects: ['invoice', 'invoice'],
        actions: ['read', 'read'],
      }),
    ).toEqual([{ subject: 'invoice', action: 'read' }]);
  });
});

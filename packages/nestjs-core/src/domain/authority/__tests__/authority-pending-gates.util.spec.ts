import { authorityPendingGates } from '../utils/authority-pending-gates.util.js';

describe(authorityPendingGates.name, () => {
  it('lists each action and subject of every pending deny, in order', () => {
    expect(
      authorityPendingGates([
        { action: 'read', subject: 'invoice' },
        {
          action: ['approve', 'void'],
          subject: ['invoice', 'credit-note'],
          inverted: true,
          pending: 'cfo-approval',
        },
        { action: 'update', subject: 'invoice', inverted: true },
        {
          action: 'update',
          subject: 'invoice',
          fields: ['total'],
          inverted: true,
          pending: 'pricing-policy',
          reason: 'until pricing is signed off',
        },
      ]),
    ).toEqual([
      { gate: 'cfo-approval', action: 'approve', subject: 'invoice' },
      { gate: 'cfo-approval', action: 'approve', subject: 'credit-note' },
      { gate: 'cfo-approval', action: 'void', subject: 'invoice' },
      { gate: 'cfo-approval', action: 'void', subject: 'credit-note' },
      {
        gate: 'pricing-policy',
        action: 'update',
        subject: 'invoice',
        fields: ['total'],
      },
    ]);
  });
});

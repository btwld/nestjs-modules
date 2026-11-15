import { authorityGateOf } from '../utils/authority-gate-of.util.js';

describe(authorityGateOf.name, () => {
  it('reports the first given reason when every deny has one', () => {
    // Highest priority first: the last given comes first.
    expect(
      authorityGateOf([
        { inverted: true, reason: 'second' },
        { inverted: false },
        { inverted: true, reason: 'first' },
      ]),
    ).toEqual('first');
  });

  it('reports nothing when any deny is final', () => {
    expect(
      authorityGateOf([
        { inverted: true, reason: 'pending' },
        { inverted: true },
      ]),
    ).toBeUndefined();
  });

  it('reports nothing without a deny', () => {
    expect(authorityGateOf([])).toBeUndefined();
    expect(authorityGateOf([{ inverted: false }])).toBeUndefined();
  });
});

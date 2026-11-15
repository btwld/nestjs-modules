import { authorityGateOf } from '../utils/authority-gate-of.util.js';

describe(authorityGateOf.name, () => {
  it('reports the first given gate when every deny is pending', () => {
    // Highest priority first: the last given comes first.
    expect(
      authorityGateOf([
        { inverted: true, pending: 'second' },
        { inverted: false },
        { inverted: true, pending: 'first' },
      ]),
    ).toEqual('first');
  });

  it('reports nothing when any deny is final', () => {
    expect(
      authorityGateOf([
        { inverted: true, pending: 'cfo-approval' },
        { inverted: true },
        {},
      ]),
    ).toBeUndefined();
  });

  // Closing the gate would still leave it refused: nothing allows it.
  it('reports nothing when no allow covers what was refused', () => {
    expect(
      authorityGateOf([{ inverted: true, pending: 'cfo-approval' }]),
    ).toBeUndefined();
  });

  it('reports nothing without a deny', () => {
    expect(authorityGateOf([])).toBeUndefined();
    expect(authorityGateOf([{ inverted: false }, {}])).toBeUndefined();
  });

  // A final deny's reason explains it; it is not a gate.
  it('reports no gate for a final deny with a reason', () => {
    const final: { inverted: boolean; reason: string } = {
      inverted: true,
      reason: 'never',
    };

    expect(authorityGateOf([final, {}])).toBeUndefined();
  });
});

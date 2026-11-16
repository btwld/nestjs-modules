import { actorKeys } from '../utils/actor-keys.util.js';

describe(actorKeys.name, () => {
  it('should key a role actor by each of its roles', () => {
    expect(actorKeys({ kind: 'role', roles: ['editor', 'viewer'] })).toEqual([
      'role:editor',
      'role:viewer',
    ]);
  });

  it('should key a role actor without roles by nothing', () => {
    expect(actorKeys({ kind: 'role', roles: [], userId: 'user-1' })).toEqual(
      [],
    );
  });

  it('should key a system actor by its name alone', () => {
    expect(actorKeys({ kind: 'system', name: 'billing' })).toEqual([
      'system:billing',
    ]);
  });

  it('should not key a role actor by its user id', () => {
    expect(
      actorKeys({ kind: 'role', roles: ['editor'], userId: 'user-1' }),
    ).toEqual(['role:editor']);
  });
});

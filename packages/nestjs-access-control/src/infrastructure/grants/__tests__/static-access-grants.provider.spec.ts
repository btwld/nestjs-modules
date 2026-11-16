import { StaticAccessGrantsProvider } from '../static-access-grants.provider.js';

describe(StaticAccessGrantsProvider.name, () => {
  const provider = new StaticAccessGrantsProvider({
    'role:a': [{ action: 'read', subject: 'user' }],
    'role:b': [{ action: 'update', subject: 'user' }],
    'system:agile': [{ action: 'approve', subject: 'contract' }],
  });

  it('gives a person the rules of each of their roles', async () => {
    expect(
      await provider.rulesFor({}, { kind: 'role', roles: ['a', 'b', 'none'] }),
    ).toEqual([
      { action: 'read', subject: 'user' },
      { action: 'update', subject: 'user' },
    ]);
  });

  it('gives a system only its own rules', async () => {
    expect(
      await provider.rulesFor({}, { kind: 'system', name: 'agile' }),
    ).toEqual([{ action: 'approve', subject: 'contract' }]);
  });

  it('gives a system nothing from a role of the same name', async () => {
    expect(await provider.rulesFor({}, { kind: 'system', name: 'a' })).toEqual(
      [],
    );
  });
});

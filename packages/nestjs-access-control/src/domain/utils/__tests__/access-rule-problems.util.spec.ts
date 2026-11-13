import { accessGrantsProblems } from '../access-rule-problems.util.js';

describe(accessGrantsProblems.name, () => {
  it('accepts grants keyed by role and system actors', () => {
    expect(
      accessGrantsProblems({
        'role:admin': [
          { action: 'read', subject: 'user' },
          { action: ['update', 'approve'], subject: ['user', 'org'] },
        ],
        'system:agile': [{ action: 'read', subject: 'user' }],
      }),
    ).toEqual([]);
  });

  it('refuses a key that names no actor kind, and each unusable rule set', () => {
    expect(
      accessGrantsProblems({
        admin: [{ action: 'read', subject: 'user' }],
        'role:clerk': [{ action: 'read:any', subject: 'user' }],
        'system:agile': [{ action: 'read', subject: 'user' }],
      }),
    ).toEqual([
      'grants key "admin": must be role:<name> or system:<name>',
      'role:clerk rule 0: action "read:any" must be a verb, such as read or approve',
    ]);
  });

  it('refuses a key with anything before the actor kind or a space in the name', () => {
    expect(
      accessGrantsProblems({
        'xrole:clerk': [],
        'role:head clerk': [],
      }),
    ).toEqual([
      'grants key "xrole:clerk": must be role:<name> or system:<name>',
      'grants key "role:head clerk": must be role:<name> or system:<name>',
    ]);
  });
});

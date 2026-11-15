import { type AuthorityRuleInterface } from '../interfaces/authority-rule.interface.js';
import { authorityRuleProblems } from '../utils/authority-rule-problems.util.js';

describe(authorityRuleProblems.name, () => {
  it('accepts a valid rule set', () => {
    expect(
      authorityRuleProblems(
        [
          { action: 'read', subject: 'user' },
          { action: ['update', 'approve'], subject: ['user', 'org'] },
          {
            action: 'read',
            subject: 'user',
            fields: ['password'],
            inverted: true,
            reason: 'secret',
          },
          { action: 'read', subject: 'user', fields: ['v2', '2fa.code'] },
        ],
        'role:admin',
      ),
    ).toEqual([]);
  });

  it.each<[string, AuthorityRuleInterface<string>, string]>([
    [
      'an action with a possession',
      { action: 'read:any', subject: 'user' },
      'action "read:any" must be a verb, such as read or approve',
    ],
    [
      'an action with a space',
      { action: 'read all', subject: 'user' },
      'action "read all" must be a verb, such as read or approve',
    ],
    [
      'the manage wildcard',
      { action: 'manage', subject: 'user' },
      'action "manage" is reserved',
    ],
    [
      'the all wildcard',
      { action: 'read', subject: 'all' },
      'subject "all" is reserved',
    ],
    [
      'an empty fields list',
      { action: 'read', subject: 'user', fields: [] },
      'fields is empty; leave it out to cover every field',
    ],
    [
      'a blank field',
      { action: 'read', subject: 'user', fields: [' '] },
      'fields has a blank entry',
    ],
    [
      'a blank field among named ones',
      { action: 'read', subject: 'user', fields: ['name', ''] },
      'fields has a blank entry',
    ],
    [
      'a field naming an array position',
      { action: 'read', subject: 'user', fields: ['items.0.secret'] },
      'fields name array positions or numeric keys, which fields are checked without; name the field beneath them',
    ],
    [
      'a field naming a multi-digit array position',
      { action: 'read', subject: 'user', fields: ['items.12.secret'] },
      'fields name array positions or numeric keys, which fields are checked without; name the field beneath them',
    ],
    [
      'a field pattern',
      { action: 'read', subject: 'user', fields: ['name', 'profile.*'] },
      'fields name patterns, which are not supported',
    ],
    ['a blank subject', { action: 'read', subject: '' }, 'subject is blank'],
    [
      'an empty action list',
      { action: [], subject: 'user' },
      'action must be a string or a non-empty list of strings',
    ],
  ])('refuses %s', (_label, rule, problem) => {
    expect(authorityRuleProblems([rule], 'role:admin')).toEqual([
      `role:admin rule 0: ${problem}`,
    ]);
  });

  // Stored rules arrive as parsed JSON, whatever their shape.
  it('refuses conditions, naming row scope', () => {
    expect(
      authorityRuleProblems(
        JSON.parse(
          '[{"action":"read","subject":"user","conditions":{"ownerId":1}}]',
        ),
        'rules',
      ),
    ).toEqual([
      'rules rule 0: conditions are not supported; which rows a caller reaches is row scope',
    ]);
  });

  // CASL reads null fields as every field, so a rule meant to name some
  // would cover the whole subject.
  it('refuses fields stored as null', () => {
    expect(
      authorityRuleProblems(
        JSON.parse('[{"action":"read","subject":"user","fields":null}]'),
        'rules',
      ),
    ).toEqual(['rules rule 0: fields must be a list of strings']);
  });

  it('refuses stored rules of the wrong types without throwing', () => {
    expect(
      authorityRuleProblems(
        JSON.parse(
          '[null, {"action":1,"subject":["user",2],"fields":"name","inverted":"yes","reason":3,"extra":true}]',
        ),
        'rules',
      ),
    ).toEqual([
      'rules rule 0: must be a plain object',
      'rules rule 1: unknown property "extra"',
      'rules rule 1: action must be a string or a non-empty list of strings',
      'rules rule 1: subject must be a string or a non-empty list of strings',
      'rules rule 1: fields must be a list of strings',
      'rules rule 1: inverted must be a boolean',
      'rules rule 1: reason must be a string',
    ]);
  });

  it('refuses what a rule engine would read but the check could not see', () => {
    class RuleWithConditions {
      action = 'read';
      subject = 'user';
      get conditions() {
        return { ownerId: 1 };
      }
    }
    const inherited: unknown = Object.assign(
      Object.create({ conditions: { ownerId: 1 } }),
      { action: 'read', subject: 'user' },
    );
    const hidden = Object.defineProperty(
      { action: 'read', subject: 'user' },
      'conditions',
      { value: { ownerId: 1 }, enumerable: false },
    );
    const getter = Object.defineProperty({ subject: 'user' }, 'action', {
      get: () => 'read',
      enumerable: true,
    });

    expect(
      authorityRuleProblems(
        JSON.parse(JSON.stringify([{ action: 'read', subject: 'user' }])),
        'rules',
      ),
    ).toEqual([]);
    expect(
      authorityRuleProblems(
        [new RuleWithConditions(), inherited, hidden, getter],
        'rules',
      ),
    ).toEqual([
      'rules rule 0: must be a plain object',
      'rules rule 1: must be a plain object',
      'rules rule 2: conditions are not supported; which rows a caller reaches is row scope',
      'rules rule 3: "action" must be a value, not a getter',
    ]);
  });

  it('refuses rules that are not a list', () => {
    expect(authorityRuleProblems(JSON.parse('{}'), 'rules')).toEqual([
      'rules: rules must be an array',
    ]);
  });
});

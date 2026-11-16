import { createAccessAbility } from '../create-access-ability.util.js';

describe(createAccessAbility.name, () => {
  it('allows nothing without rules', () => {
    expect(createAccessAbility([]).can('read', 'user')).toEqual(false);
  });

  it('lets a deny win over an allow that comes after it', () => {
    const ability = createAccessAbility([
      { action: 'delete', subject: 'user', inverted: true },
      { action: 'delete', subject: 'user' },
    ]);

    expect(ability.can('delete', 'user')).toEqual(false);
    expect(ability.relevantRuleFor('delete', 'user')?.inverted).toEqual(true);
  });

  it('matches a field and everything beneath it', () => {
    const ability = createAccessAbility([
      { action: 'read', subject: 'user', fields: ['address'] },
    ]);

    expect(ability.can('read', 'user', 'address')).toEqual(true);
    expect(ability.can('read', 'user', 'address.city')).toEqual(true);
    expect(ability.can('read', 'user', 'addressBook')).toEqual(false);
    expect(ability.can('read', 'user', 'name')).toEqual(false);
  });

  it('never treats a field as a pattern', () => {
    const ability = createAccessAbility([
      { action: 'read', subject: 'user', fields: ['tags.*'] },
    ]);

    expect(ability.can('read', 'user', 'tags.first')).toEqual(false);
  });
});

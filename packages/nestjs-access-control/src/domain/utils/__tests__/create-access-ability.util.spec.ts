import { createAccessAbility } from '../create-access-ability.util.js';

describe(createAccessAbility.name, () => {
  it('allows nothing without rules', () => {
    expect(createAccessAbility([]).can('read:any', 'user')).toEqual(false);
  });

  it('lets a deny win over an allow that comes after it', () => {
    const ability = createAccessAbility([
      { action: 'delete:own', subject: 'user', inverted: true },
      { action: 'delete:own', subject: 'user' },
    ]);

    expect(ability.can('delete:own', 'user')).toEqual(false);
    expect(ability.relevantRuleFor('delete:own', 'user')?.inverted).toEqual(
      true,
    );
  });

  it('matches a field and everything beneath it', () => {
    const ability = createAccessAbility([
      { action: 'read:any', subject: 'user', fields: ['address'] },
    ]);

    expect(ability.can('read:any', 'user', 'address')).toEqual(true);
    expect(ability.can('read:any', 'user', 'address.city')).toEqual(true);
    expect(ability.can('read:any', 'user', 'addressBook')).toEqual(false);
    expect(ability.can('read:any', 'user', 'name')).toEqual(false);
  });

  it('never treats a field as a pattern', () => {
    const ability = createAccessAbility([
      { action: 'read:any', subject: 'user', fields: ['tags.*'] },
    ]);

    expect(ability.can('read:any', 'user', 'tags.first')).toEqual(false);
  });
});

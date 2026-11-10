import { PossessionEnum } from '../../enums/possession.enum.js';
import { canReadAccessField } from '../can-read-access-field.util.js';
import { createAccessAbility } from '../create-access-ability.util.js';
import { projectAccessFields } from '../project-access-fields.util.js';

describe(projectAccessFields.name, () => {
  const only =
    (...paths: string[]) =>
    (path: string) =>
      paths.includes(path);

  it('keeps only allowed leaf paths', () => {
    expect(
      projectAccessFields(
        { id: 1, password: 'p', profile: { ssn: 's', city: 'c' } },
        only('id', 'profile.city'),
      ),
    ).toEqual({ id: 1, profile: { city: 'c' } });
  });

  it('drops an object none of whose fields are allowed', () => {
    expect(
      projectAccessFields({ id: 1, profile: { ssn: 's' } }, only('id')),
    ).toEqual({ id: 1 });
  });

  // toEqual ignores keys holding undefined; a dropped field must be gone.
  it('drops an array none of whose items keep a field', () => {
    expect(
      projectAccessFields(
        { id: 1, items: [{ cost: 2 }] },
        only('id', 'items.amount'),
      ),
    ).toStrictEqual({ id: 1 });
  });

  it('drops an empty array that is not allowed', () => {
    expect(projectAccessFields({ id: 1, tags: [] }, only('id'))).toStrictEqual({
      id: 1,
    });
  });

  it('keeps an empty array that is allowed', () => {
    expect(projectAccessFields({ tags: [] }, only('tags'))).toStrictEqual({
      tags: [],
    });
  });

  it('defines kept fields as ordinary writable properties', () => {
    expect(
      Object.getOwnPropertyDescriptors(
        projectAccessFields({ id: 1 }, only('id')),
      ),
    ).toEqual({
      id: { value: 1, writable: true, enumerable: true, configurable: true },
    });
  });

  it('filters every item of an array', () => {
    expect(
      projectAccessFields(
        [
          { id: 1, secret: 'a' },
          { id: 2, secret: 'b' },
        ],
        only('id'),
      ),
    ).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('filters the items of a page, keeping the page itself', () => {
    expect(
      projectAccessFields(
        {
          data: [{ id: 1, password: 'p' }],
          limit: 10,
          count: 1,
          total: 1,
          page: 1,
          pageCount: 1,
        },
        only('id'),
      ),
    ).toEqual({
      data: [{ id: 1 }],
      limit: 10,
      count: 1,
      total: 1,
      page: 1,
      pageCount: 1,
    });
  });

  it('filters a data field that is not a page like any other field', () => {
    expect(
      projectAccessFields({ data: [{ id: 1, secret: 's' }] }, only('data.id')),
    ).toEqual({ data: [{ id: 1 }] });
  });

  it('filters nested arrays of objects by path without positions', () => {
    expect(
      projectAccessFields(
        {
          items: [
            { amount: 1, cost: 2 },
            { amount: 3, cost: 4 },
          ],
        },
        only('items.amount'),
      ),
    ).toEqual({ items: [{ amount: 1 }, { amount: 3 }] });
  });

  it('filters class instances as they go over the wire', () => {
    class Money {
      toJSON() {
        return '12.50';
      }
    }
    class User {
      constructor(
        public id = 1,
        public password = 'p',
        public balance = new Money(),
      ) {}
    }

    expect(projectAccessFields(new User(), only('id', 'balance'))).toEqual({
      id: 1,
      balance: new Money(),
    });
  });

  it('filters what toJSON sends, not the instance own properties', () => {
    class Person {
      constructor(
        private readonly first = 'Ada',
        private readonly last = 'Lovelace',
      ) {}
      toJSON() {
        return { name: `${this.first} ${this.last}`, initials: 'AL' };
      }
    }

    expect(projectAccessFields(new Person(), only('name'))).toEqual({
      name: 'Ada Lovelace',
    });
  });

  it('projects an instance with toJSON into a plain object, so its toJSON cannot send the fields again', () => {
    class Payslip {
      readonly #salary = 1234500;
      constructor(public name = 'Ada') {}
      toJSON() {
        return { name: this.name, salary: this.#salary };
      }
    }

    const projected = projectAccessFields(new Payslip(), only('name'));

    expect(Object.getPrototypeOf(projected)).toBe(Object.prototype);
    expect(JSON.stringify(projected)).toEqual('{"name":"Ada"}');
  });

  it('filters arrays nested in arrays', () => {
    expect(
      projectAccessFields(
        { matrix: [[{ secret: 1, ok: 2 }], [{ ok: 3 }]] },
        only('matrix.ok'),
      ),
    ).toEqual({ matrix: [[{ ok: 2 }], [{ ok: 3 }]] });
  });

  it('checks numeric keys without them, as write checks do', () => {
    expect(
      projectAccessFields(
        { scores: { '0': { secret: 1, ok: 2 } } },
        only('scores.ok'),
      ),
    ).toEqual({ scores: { '0': { ok: 2 } } });
  });

  // With the filter's own check, where CASL reads an empty path as none.
  it('hides a numeric top-level key from a caller limited to named fields', () => {
    const ability = createAccessAbility([
      { action: 'read:any', subject: 'user', fields: ['id'] },
    ]);

    expect(
      projectAccessFields({ id: 1, '0': 'secret' }, (path) =>
        canReadAccessField(
          ability,
          { possession: PossessionEnum.ANY, resource: 'user' },
          path,
        ),
      ),
    ).toStrictEqual({ id: 1 });
  });

  it('keeps a __proto__ key as plain data', () => {
    const projected = projectAccessFields(
      JSON.parse('{"__proto__":{"polluted":true},"id":1}'),
      only('id', '__proto__.polluted'),
    );

    expect(Object.getPrototypeOf(projected)).toBe(Object.prototype);
    expect(Object.keys(projected ?? {})).toEqual(['__proto__', 'id']);
  });

  it('keeps a class instance prototype, so a later serializer recognises it', () => {
    class UserDto {
      constructor(
        public id = 1,
        public password = 'p',
      ) {}
    }

    const projected = projectAccessFields(
      new UserDto(),
      only('id', 'password'),
    );

    expect(projected).toBeInstanceOf(UserDto);
    expect(projected).toEqual(new UserDto());
  });

  it('hides a denied getter the kept prototype carries', () => {
    class Employee {
      constructor(
        public firstName = 'John',
        public salaryCents = 1234500,
      ) {}
      get salary() {
        return `$${this.salaryCents / 100}`;
      }
      get greeting() {
        return `Hi ${this.firstName}`;
      }
    }

    const projected = projectAccessFields(
      new Employee(),
      only('firstName', 'greeting'),
    );

    expect(projected).toBeInstanceOf(Employee);
    expect(Reflect.get(Object(projected), 'salary')).toBeUndefined();
    expect(Reflect.get(Object(projected), 'greeting')).toEqual('Hi John');
    expect(projected).toEqual({ firstName: 'John' });
    expect(Object.getOwnPropertyDescriptors(projected)).toEqual({
      firstName: {
        value: 'John',
        writable: true,
        enumerable: true,
        configurable: true,
      },
      salary: {
        value: undefined,
        writable: true,
        enumerable: false,
        configurable: true,
      },
    });
  });

  it('hides a denied method the kept prototype carries', () => {
    class Employee {
      constructor(public salaryCents = 1234500) {}
      salaryText() {
        return `salary ${this.salaryCents / 100}`;
      }
    }

    const projected = projectAccessFields(new Employee(), only());

    expect(Reflect.get(Object(projected), 'salaryText')).toBeUndefined();
  });

  it('hides denied getters of a nested instance with no own fields', () => {
    class Profile {
      readonly #ssn = 'secret-ssn';
      get ssn() {
        return this.#ssn;
      }
      get city() {
        return 'Orlando';
      }
    }

    const projected = projectAccessFields(
      { id: 1, profile: new Profile() },
      (path) => path !== 'profile.ssn',
    );
    const profile: unknown = Reflect.get(Object(projected), 'profile');

    expect(profile).toBeInstanceOf(Profile);
    expect(Reflect.get(Object(profile), 'ssn')).toBeUndefined();
    expect(Reflect.get(Object(profile), 'city')).toEqual('Orlando');
  });

  it('keeps a nested instance with no own fields as is when nothing on it is denied', () => {
    const tags = new Map([['a', 1]]);

    expect(
      Reflect.get(Object(projectAccessFields({ tags }, () => true)), 'tags'),
    ).toBe(tags);
  });

  it('drops a nested instance with no own fields that is not allowed', () => {
    expect(
      projectAccessFields({ id: 1, tags: new Map() }, only('id')),
    ).toStrictEqual({ id: 1 });
  });

  it('filters the class instances of a page', () => {
    class Row {
      constructor(
        public id = 1,
        public secret = 's',
      ) {}
    }

    const page = projectAccessFields(
      { data: [new Row()], count: 1, total: 1, page: 1, pageCount: 1 },
      only('id'),
    );

    expect(page).toEqual({
      data: [{ id: 1 }],
      count: 1,
      total: 1,
      page: 1,
      pageCount: 1,
    });
  });

  it('keeps a leaf value as it is, dates included', () => {
    const born = new Date(0);

    expect(projectAccessFields({ born }, only('born'))).toEqual({ born });
  });

  // A value with no fields can't be filtered: it shows whole or not at all.
  it('shows a value with no fields to a caller who may read the resource', () => {
    expect(projectAccessFields('text', () => true)).toEqual('text');
    expect(projectAccessFields(null, () => true)).toBeNull();
  });

  it('hides a value with no fields from a caller who may not', () => {
    expect(projectAccessFields('text', only())).toBeUndefined();
    expect(projectAccessFields(['a', 'b'], only())).toEqual([]);
  });

  it('hides what toJSON turns into a value with no fields', () => {
    expect(
      projectAccessFields({ secret: 's', toJSON: () => 'serialized' }, only()),
    ).toBeUndefined();
  });

  it('filters the fields of a page wrapper other than its counters', () => {
    expect(
      projectAccessFields(
        {
          data: [{ id: 1, secret: 's' }],
          count: 1,
          total: 1,
          page: 1,
          pageCount: 1,
          limit: 10,
          secret: 'wrapper',
        },
        only('id'),
      ),
    ).toStrictEqual({
      data: [{ id: 1 }],
      count: 1,
      total: 1,
      page: 1,
      pageCount: 1,
      limit: 10,
    });
  });

  it('keeps only the named counters of a page wrapper, whatever else is a number', () => {
    expect(
      projectAccessFields(
        {
          data: [],
          count: 0,
          total: 0,
          page: 1,
          pageCount: 0,
          secret: 42,
          meta: 'shown',
        },
        only('meta'),
      ),
    ).toStrictEqual({
      meta: 'shown',
      count: 0,
      total: 0,
      page: 1,
      pageCount: 0,
      data: [],
    });
  });

  it('filters an object with page-like keys that are not counters as a record', () => {
    expect(
      projectAccessFields(
        {
          data: [{ id: 1, secret: 's' }],
          count: 'one',
          total: 1,
          page: 1,
          pageCount: 1,
        },
        only('data.id'),
      ),
    ).toStrictEqual({ data: [{ id: 1 }] });
  });
});

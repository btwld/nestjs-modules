import {
  accessFieldPaths,
  normalizeAccessFieldPath,
} from '../access-field-paths.util.js';

describe(normalizeAccessFieldPath.name, () => {
  it.each([
    ['name', 'name'],
    ['items.0.amount', 'items.amount'],
    ['a.12.b.3', 'a.b'],
    ['v2.2fa.3', 'v2.2fa'],
    // Nothing would be left: kept, so only rules covering every field match.
    ['0', '0'],
    ['12.3', '12.3'],
  ])('%s becomes %s', (path, expected) => {
    expect(normalizeAccessFieldPath(path)).toEqual(expected);
  });
});

describe(accessFieldPaths.name, () => {
  it('lists leaf paths, without array positions', () => {
    expect(
      accessFieldPaths({
        name: 'n',
        address: { city: 'c', geo: { lat: 1 } },
        items: [{ amount: 1 }, { amount: 2, label: 'x' }],
        tags: ['a', 'b'],
        empty: {},
        none: [],
      }).sort(),
    ).toEqual(
      [
        'name',
        'address.city',
        'address.geo.lat',
        'items.amount',
        'items.label',
        'tags',
        'empty',
        'none',
      ].sort(),
    );
  });

  it('lists the fields of every item of a batch', () => {
    expect(accessFieldPaths([{ a: 1 }, { b: 2 }])).toEqual(['a', 'b']);
  });

  it('reads class instances as they go over the wire', () => {
    class Money {
      toJSON() {
        return '12.50';
      }
    }
    class Order {
      constructor(
        public total = new Money(),
        public owner = { id: 1 },
      ) {}
    }

    expect(accessFieldPaths(new Order()).sort()).toEqual(['owner.id', 'total']);
  });

  it('lists what toJSON sends, not the instance own properties', () => {
    class Person {
      constructor(private readonly first = 'Ada') {}
      toJSON() {
        return { name: this.first };
      }
    }

    expect(accessFieldPaths(new Person())).toEqual(['name']);
  });

  it('lists nothing for a value with no fields', () => {
    expect(accessFieldPaths('text')).toEqual([]);
    expect(accessFieldPaths(null)).toEqual([]);
  });
});

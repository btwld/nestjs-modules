import { AppendOnlyAggregate } from '../append-only-aggregate.js';
import { DomainAggregate } from '../domain-aggregate.js';
import { MutableAggregate } from '../mutable-aggregate.js';

interface Props {
  name: string;
}

class Plain extends DomainAggregate<Props> {}

class Mutable extends MutableAggregate<Props> {
  rename(name: string): void {
    this.props = { ...this.props, name };
    this.incrementVersion();
  }
}

class AppendOnly extends AppendOnlyAggregate<Props> {}

const created = new Date('2024-01-01');
const updated = new Date('2024-01-02');

describe('DomainAggregate', () => {
  it('emits only its id and props', () => {
    expect(new Plain('a', { name: 'x' }).toPlain()).toEqual({
      id: 'a',
      name: 'x',
    });
  });

  it('copies props rather than holding the caller’s object', () => {
    const props = { name: 'x' };
    const aggregate = new Plain('a', props);
    props.name = 'changed';

    expect(aggregate.toPlain().name).toBe('x');
  });
});

describe('MutableAggregate', () => {
  /**
   * Pins the shape every existing aggregate persists through, so moving the
   * class out of `DomainAggregate` provably changed nothing.
   */
  it('emits id, version, props and every audit date', () => {
    const aggregate = new Mutable('a', { name: 'x' }, 3, {
      dateCreated: created,
      dateUpdated: updated,
      dateDeleted: null,
    });

    expect(aggregate.toPlain()).toEqual({
      id: 'a',
      version: 3,
      name: 'x',
      dateCreated: created,
      dateUpdated: updated,
      dateDeleted: null,
    });
  });

  it('starts at version 1 with fresh audit dates', () => {
    const aggregate = new Mutable('a', { name: 'x' });

    expect(aggregate.version).toBe(1);
    expect(aggregate.meta.dateCreated).toBeInstanceOf(Date);
    expect(aggregate.meta.dateDeleted).toBeNull();
  });

  it('bumps the version from a mutation method', () => {
    const aggregate = new Mutable('a', { name: 'x' });
    aggregate.rename('y');

    expect(aggregate.version).toBe(2);
    expect(aggregate.toPlain().name).toBe('y');
  });

  it('stamps an update without touching the creation date', () => {
    const aggregate = new Mutable('a', { name: 'x' }, 1, {
      dateCreated: created,
      dateUpdated: created,
      dateDeleted: null,
    });
    aggregate.stampUpdated();

    expect(aggregate.meta.dateCreated).toBe(created);
    expect(aggregate.meta.dateUpdated.getTime()).toBeGreaterThan(
      created.getTime(),
    );
  });

  it('stamps a deletion', () => {
    const aggregate = new Mutable('a', { name: 'x' });
    aggregate.stampDeleted();

    expect(aggregate.meta.dateDeleted).toBeInstanceOf(Date);
  });
});

describe('AppendOnlyAggregate', () => {
  /**
   * Matches an append-only entity's columns exactly — no version, no updated
   * or deleted date — so a mapper can persist `toPlain()` as-is.
   */
  it('emits id, props and dateCreated, and nothing else', () => {
    expect(new AppendOnly('a', { name: 'x' }, created).toPlain()).toEqual({
      id: 'a',
      name: 'x',
      dateCreated: created,
    });
  });

  /**
   * The aggregate owns its creation date: the value stamped here is the value
   * stored, not a database default.
   */
  it('stamps dateCreated at construction', () => {
    const before = Date.now();
    const aggregate = new AppendOnly('a', { name: 'x' });

    expect(aggregate.dateCreated.getTime()).toBeGreaterThanOrEqual(before);
    expect(aggregate.toPlain().dateCreated).toBe(aggregate.dateCreated);
  });

  it('carries no mutation helpers', () => {
    const aggregate = new AppendOnly('a', { name: 'x' });

    expect('version' in aggregate).toBe(false);
    expect('stampUpdated' in aggregate).toBe(false);
    expect('stampDeleted' in aggregate).toBe(false);
  });
});

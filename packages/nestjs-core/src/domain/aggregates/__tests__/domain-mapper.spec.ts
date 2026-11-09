import { AppendOnlyAggregate } from '../append-only-aggregate.js';
import { DomainAggregate } from '../domain-aggregate.js';
import { DomainMapper } from '../domain-mapper.js';

interface NoteProps {
  text: string;
}

class Note extends DomainAggregate<NoteProps> {
  get text(): string {
    return this.props.text;
  }
}

/**
 * A stored row with no version or audit columns, such as an append-only
 * record. The mapper must accept and return it as declared; this file failing
 * to compile is the regression.
 */
interface NoteRow {
  id: string;
  text: string;
}

class NoteMapper extends DomainMapper<NoteRow, Note> {
  createAggregate(row: NoteRow): Note {
    return new Note(row.id, { text: row.text });
  }

  toPersistence(note: Note): NoteRow {
    return { id: note.id, text: note.text };
  }
}

interface EntryProps {
  amount: string;
}

class Entry extends AppendOnlyAggregate<EntryProps> {}

interface EntryRow {
  id: string;
  amount: string;
  dateCreated: Date;
}

class EntryMapper extends DomainMapper<EntryRow, Entry> {
  createAggregate(row: EntryRow): Entry {
    const { id, dateCreated, ...props } = row;
    return new Entry(id, props, dateCreated);
  }

  toPersistence(entry: Entry): EntryRow {
    return entry.toPlain();
  }
}

describe('DomainMapper', () => {
  /**
   * An append-only aggregate's `toPlain()` matches its row exactly, so the
   * mapper can return it untranslated.
   */
  it('round-trips an append-only aggregate through toPlain()', () => {
    const mapper = new EntryMapper();
    const row: EntryRow = {
      id: 'e1',
      amount: '10.00',
      dateCreated: new Date('2024-01-01'),
    };

    expect(mapper.toPersistence(mapper.toDomain(row))).toEqual(row);
  });

  it('maps a row without version or audit columns both ways', () => {
    const mapper = new NoteMapper();
    const row: NoteRow = { id: 'n1', text: 'hello' };

    const note = mapper.toDomain(row);

    expect(note.id).toBe('n1');
    expect(note.text).toBe('hello');
    expect(mapper.toPersistence(note)).toEqual(row);
  });
});

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

class NoteMapper extends DomainMapper<NoteRow, NoteProps, Note> {
  createAggregate(row: NoteRow): Note {
    return new Note(row.id, { text: row.text });
  }

  toPersistence(note: Note): NoteRow {
    return { id: note.id, text: note.text };
  }
}

describe('DomainMapper', () => {
  it('maps a row without version or audit columns both ways', () => {
    const mapper = new NoteMapper();
    const row: NoteRow = { id: 'n1', text: 'hello' };

    const note = mapper.toDomain(row);

    expect(note.id).toBe('n1');
    expect(note.text).toBe('hello');
    expect(mapper.toPersistence(note)).toEqual(row);
  });
});

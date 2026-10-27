import { fileCreateSchema } from '../file-create.schema.js';
import { fileSchema } from '../file.schema.js';

const validFile = {
  id: 'abc',
  version: 1,
  dateCreated: new Date('2026-01-01'),
  dateUpdated: new Date('2026-01-02'),
  dateDeleted: null,
  serviceKey: 's3',
  fileName: 'docs/a.pdf',
  contentType: 'application/pdf',
  status: 'active',
};

describe('fileSchema', () => {
  it('accepts a valid file', () => {
    expect(fileSchema.parse(validFile)).toEqual(validFile);
  });

  it('accepts every status', () => {
    for (const status of ['pending', 'active', 'removing', 'remove-failed']) {
      expect(fileSchema.parse({ ...validFile, status }).status).toEqual(status);
    }
  });

  it('rejects an unknown status', () => {
    expect(() => fileSchema.parse({ ...validFile, status: 'gone' })).toThrow();
  });

  it('strips unknown keys', () => {
    const result = fileSchema.parse({ ...validFile, _internal: 'x' });
    expect(result).not.toHaveProperty('_internal');
  });
});

describe('fileCreateSchema', () => {
  const validCreate = {
    serviceKey: 's3',
    fileName: 'docs/a.pdf',
    contentType: 'application/pdf',
  };

  it('accepts a valid create payload', () => {
    expect(fileCreateSchema.parse(validCreate)).toEqual(validCreate);
  });

  it.each(['serviceKey', 'fileName', 'contentType'])(
    'rejects an empty %s',
    (field) => {
      expect(() =>
        fileCreateSchema.parse({ ...validCreate, [field]: '' }),
      ).toThrow();
    },
  );

  it('does not accept a status from the client', () => {
    const result = fileCreateSchema.parse({ ...validCreate, status: 'active' });
    expect(result).not.toHaveProperty('status');
  });
});

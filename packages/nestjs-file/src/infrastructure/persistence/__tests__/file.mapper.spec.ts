import { createMockFileEntity } from '../../../__tests__/helpers/mock.helpers.js';
import { FileMapper } from '../file.mapper.js';
import { type FileEntityInterface } from '../interfaces/file-entity.interface.js';

describe(FileMapper.name, () => {
  const mapper = new FileMapper();

  it('maps the own columns to the aggregate', () => {
    const entity = createMockFileEntity({ size: 2048 });

    expect(mapper.toDomain(entity).toPlain()).toEqual(entity);
  });

  it('reads a size a 64-bit integer column hydrated as a string', () => {
    // As a Postgres bigint column hydrates: the row's type says number.
    const entity: FileEntityInterface = {
      ...createMockFileEntity(),
      ...JSON.parse('{ "size": "5000000000" }'),
    };

    expect(mapper.toDomain(entity).size).toEqual(5_000_000_000);
  });
});

import { Repository } from 'typeorm';

import { type OwnerEntityFixture } from './owner-entity.fixture';

export class OwnerRepositoryFixture extends Repository<OwnerEntityFixture> {}

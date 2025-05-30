import { Seeder } from '@concepta/typeorm-seeding';

import { PhotoFactoryFixture } from './photo.factory.fixture';

export class PhotoSeederFixture extends Seeder {
  public async run(): Promise<void> {
    await this.factory(PhotoFactoryFixture).createMany(15);
  }
}

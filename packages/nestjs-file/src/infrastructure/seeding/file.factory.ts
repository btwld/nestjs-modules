import { faker } from '@faker-js/faker';

import { Factory } from '@concepta/typeorm-seeding';

import { type FileInterface } from '../../domain/interfaces/file.interface.js';

/**
 * File factory. Seeds active files; set `serviceKey` to a registered
 * storage service.
 */
export class FileFactory extends Factory<FileInterface> {
  protected async entity(file: FileInterface): Promise<FileInterface> {
    file.serviceKey = 'default';
    file.fileName = `${faker.string.uuid()}/${faker.system.fileName()}`;
    file.contentType = faker.system.mimeType();
    file.status = 'active';

    return file;
  }
}

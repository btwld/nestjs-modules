import { Entity } from 'typeorm';

import { FileSqliteEntity } from '../../../infrastructure/persistence/typeorm/file-sqlite.entity.js';

@Entity()
export class FileEntityFixture extends FileSqliteEntity {}

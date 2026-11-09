import { Column, Entity } from 'typeorm';

import { CommonMariadbEntity } from '../../mariadb/entities/common-mariadb.entity.js';

@Entity('durable_note')
export class DurableNoteEntityFixture extends CommonMariadbEntity {
  @Column({ type: 'varchar' })
  text!: string;
}

import { Column, Entity } from 'typeorm';

import { CommonSqliteEntity } from '../../../sqlite/entities/common-sqlite.entity.js';
import { TestInterfaceFixture } from '../interface/test-entity.interface.fixture.js';

@Entity()
export class TestEntityFixture
  extends CommonSqliteEntity
  implements TestInterfaceFixture
{
  @Column()
  firstName!: string;

  @Column({ type: 'varchar', nullable: true })
  lastName!: string | null;
}

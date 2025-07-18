import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('devices')
export class DeviceEntity {
  @PrimaryGeneratedColumn('uuid')
  deviceKey!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;
}

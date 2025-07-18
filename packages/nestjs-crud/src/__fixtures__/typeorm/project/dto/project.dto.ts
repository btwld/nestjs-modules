import { Expose } from 'class-transformer';

export class ProjectDto {
  @Expose()
  id!: string;

  @Expose()
  name?: string;

  @Expose()
  description?: string;

  @Expose()
  isActive?: boolean;

  @Expose()
  companyId?: number;
}

import { Expose, Type } from 'class-transformer';

export class NameDto {
  @Expose()
  first!: string | null;

  @Expose()
  last!: string | null;
}

export class UserDto {
  @Expose()
  id!: string;

  @Expose()
  email!: string;

  @Expose()
  isActive!: boolean;

  @Expose()
  companyId?: number;

  @Expose()
  deletedAt?: Date;

  @Expose()
  @Type(() => NameDto)
  name!: NameDto;
}

import { IsString, IsEmail, IsNumber, IsOptional } from 'class-validator';

export class TestModelUpdateDto {
  @IsNumber({})
  id!: number;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail({ require_tld: false })
  email?: string;

  @IsOptional()
  @IsNumber({})
  age?: number;
}

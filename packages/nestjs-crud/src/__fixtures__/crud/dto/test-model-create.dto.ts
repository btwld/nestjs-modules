import { IsString, IsEmail, IsNumber, IsNotEmpty } from 'class-validator';

export class TestModelCreateDto {
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @IsNotEmpty()
  @IsEmail({ require_tld: false })
  email!: string;

  @IsNotEmpty()
  @IsNumber({})
  age!: number;
}

import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  /** User email address. @example user@example.com */
  @IsEmail()
  email: string;

  /** User password. @example strong-password */
  @IsString()
  @MinLength(8)
  password: string;
}

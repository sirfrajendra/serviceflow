import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../generated/prisma/client.js';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsEnum(UserRole)
  role: UserRole;
}
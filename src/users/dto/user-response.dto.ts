import { UserRole } from '../../generated/prisma/client.js';

export class UserResponseDto {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
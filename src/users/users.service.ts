import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { GetUsersDto } from './dto/get-user.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GetUsersDto) {
    const { page, limit, search, role, isActive } = query;

    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          {
            firstName: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
          {
            lastName: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
          {
            email: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
        ],
      }),

      ...(role && {
        role,
      }),

      ...(isActive !== undefined && {
        isActive,
      }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        omit: {
          password: true,
        },
      }),

      this.prisma.user.count({
        where,
      }),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      omit: {
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  } 

  async create(createUserDto: CreateUserDto) {
    const email = createUserDto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      12,
    );

    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        role: createUserDto.role,
      },
      omit: {
        password: true,
      },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    let normalizedEmail: string | undefined;

    if (updateUserDto.email !== undefined) {
      normalizedEmail = updateUserDto.email.trim().toLowerCase();

      const emailUser = await this.prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

      if (emailUser && emailUser.id !== id) {
        throw new ConflictException('Email is already registered');
      }
    }

    const data = {
      ...(normalizedEmail !== undefined && {
        email: normalizedEmail,
      }),

      ...(updateUserDto.firstName !== undefined && {
        firstName: updateUserDto.firstName,
      }),

      ...(updateUserDto.lastName !== undefined && {
        lastName: updateUserDto.lastName,
      }),

      ...(updateUserDto.role !== undefined && {
        role: updateUserDto.role,
      }),

      ...(updateUserDto.password !== undefined && {
        password: await bcrypt.hash(updateUserDto.password, 12),
      }),
    };

    return this.prisma.user.update({
      where: { id },
      data,
      omit: {
        password: true,
      },
    });
  }

  async updateStatus(
    id: number,
    updateUserStatusDto: UpdateUserStatusDto,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: {
        id,
      },
      data: {
        isActive: updateUserStatusDto.isActive,
      },
      omit: {
        password: true,
      },
    });
  }

  async remove(id: number) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return {
      message: 'User deleted successfully',
    };
  }

  private toUserResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
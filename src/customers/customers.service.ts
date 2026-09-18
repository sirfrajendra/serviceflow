import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { GetCustomersDto } from './dto/get-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { UpdateUserStatusDto } from '../users/dto/update-user-status.dto.js';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto) {
    const email = createCustomerDto.email.trim().toLowerCase();

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // Hash password before storing it
    const hashedPassword = await bcrypt.hash(
      createCustomerDto.password,
      12,
    );

    // Create User + CustomerProfile together
    const customer = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName: createCustomerDto.firstName,
          lastName: createCustomerDto.lastName,
          role: 'CUSTOMER',
        },
      });

      const profile = await tx.customerProfile.create({
        data: {
          userId: user.id,
          phone: createCustomerDto.phone,
          address: createCustomerDto.address,
          city: createCustomerDto.city,
          state: createCustomerDto.state,
          zipCode: createCustomerDto.zipCode,
        },
      });

      return {
        user,
        profile,
      };
    });

    // Never return the password
    const { password, ...userWithoutPassword } = customer.user;

    return {
      ...userWithoutPassword,
      profile: customer.profile,
    };
  }

  async findOne(id: number) {
    const customer = await this.prisma.user.findUnique({
      where: {
        id,
        role: 'CUSTOMER',
      },
      omit: {
        password: true,
      },
      include: {
        customerProfile: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async findAll(query: GetCustomersDto) {
    const { page, limit, search } = query;

    const skip = (page - 1) * limit;

    const where = {
      role: 'CUSTOMER' as const,
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
    };

    const [customers, total] = await Promise.all([
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
        include: {
          customerProfile: true,
        },
      }),

      this.prisma.user.count({
        where,
      }),
    ]);

    return {
      data: customers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto) {
    const existingCustomer = await this.prisma.user.findFirst({
      where: {
        id,
        role: 'CUSTOMER',
      },
    });

    if (!existingCustomer) {
      throw new NotFoundException('Customer not found');
    }

    let normalizedEmail: string | undefined;

    if (updateCustomerDto.email !== undefined) {
      normalizedEmail = updateCustomerDto.email.trim().toLowerCase();

      const emailUser = await this.prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

      if (emailUser && emailUser.id !== id) {
        throw new ConflictException('Email is already registered');
      }
    }

    const hashedPassword =
      updateCustomerDto.password !== undefined
        ? await bcrypt.hash(updateCustomerDto.password, 12)
        : undefined;

    const customer = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: {
          id,
        },
        data: {
          ...(normalizedEmail !== undefined && {
            email: normalizedEmail,
          }),
          ...(updateCustomerDto.firstName !== undefined && {
            firstName: updateCustomerDto.firstName,
          }),
          ...(updateCustomerDto.lastName !== undefined && {
            lastName: updateCustomerDto.lastName,
          }),
          ...(hashedPassword !== undefined && {
            password: hashedPassword,
          }),
        },
        omit: {
          password: true,
        },
      });

      const profile = await tx.customerProfile.update({
        where: {
          userId: id,
        },
        data: {
          ...(updateCustomerDto.phone !== undefined && {
            phone: updateCustomerDto.phone,
          }),
          ...(updateCustomerDto.address !== undefined && {
            address: updateCustomerDto.address,
          }),
          ...(updateCustomerDto.city !== undefined && {
            city: updateCustomerDto.city,
          }),
          ...(updateCustomerDto.state !== undefined && {
            state: updateCustomerDto.state,
          }),
          ...(updateCustomerDto.zipCode !== undefined && {
            zipCode: updateCustomerDto.zipCode,
          }),
        },
      });

      return {
        user,
        profile,
      };
    });

    return customer;
  }

  async updateStatus(
    id: number,
    updateUserStatusDto: UpdateUserStatusDto,
  ) {
    const existingCustomer = await this.prisma.user.findFirst({
      where: {
        id,
        role: 'CUSTOMER',
      },
    });

    if (!existingCustomer) {
      throw new NotFoundException('Customer not found');
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
      include: {
        customerProfile: true,
      },
    });
  }
}
import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Param,
  Query,
  Patch,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards.js';
import { RolesGuard } from '../auth/guards/role.guards.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../generated/prisma/client.js';

import { CustomersService } from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { GetCustomersDto } from './dto/get-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { UpdateUserStatusDto } from '../users/dto/update-user-status.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto.js';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  findAll(@Query() query: GetCustomersDto) {
    return this.customersService.findAll(query);
  }

  @Get('me')
  @Roles(UserRole.CUSTOMER)
  findMyProfile(@CurrentUser() user: { userId: number }) {
    return this.customersService.findOne(user.userId);
  }

  @Patch('me')
  @Roles(UserRole.CUSTOMER)
  updateMyProfile(
    @CurrentUser() user: { userId: number },
    @Body() updateMyProfileDto: UpdateMyProfileDto,
  ) {
    return this.customersService.update(
      user.userId,
      updateMyProfileDto,
    );
  }
  
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(Number(id));
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(
      Number(id),
      updateCustomerDto,
    );
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  updateStatus(
    @Param('id') id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ) {
    return this.customersService.updateStatus(
      Number(id),
      updateUserStatusDto,
    );
  }
}
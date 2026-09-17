import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  @Get('users')
  async getUsers() {
    return this.prisma.user.findMany();
  }
}

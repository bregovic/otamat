import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
    constructor(private prisma: PrismaService) { }

    @Get()
    check() {
        return { status: 'Server is running', timestamp: new Date().toISOString() };
    }

    @Get('db')
    async checkDb() {
        try {
            const userCount = await this.prisma.user.count();
            return { status: 'Database connected', userCount };
        } catch (error) {
            return { status: 'Database connection failed', error: error.message };
        }
    }
}

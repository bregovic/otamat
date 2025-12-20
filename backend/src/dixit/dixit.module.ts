import { Module } from '@nestjs/common';
import { DixitService } from './dixit.service';
import { DixitGateway } from './dixit.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { DixitController } from './dixit.controller';

@Module({
    imports: [PrismaModule],
    controllers: [DixitController],
    providers: [DixitGateway, DixitService],
    exports: [DixitService],
})
export class DixitModule { }

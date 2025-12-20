import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameModule } from './game/game.module';
import { DixitModule } from './dixit/dixit.module';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { QuizModule } from './quiz/quiz.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [GameModule, DixitModule, PrismaModule, AuthModule, QuizModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule { }

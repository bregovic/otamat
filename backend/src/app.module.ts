import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameModule } from './game/game.module';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { QuizModule } from './quiz/quiz.module';

@Module({
  imports: [GameModule, PrismaModule, AuthModule, QuizModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

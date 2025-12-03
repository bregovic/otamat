import { Module } from '@nestjs/common';
import { GameGateway } from './game/game.gateway';
import { QuizModule } from '../quiz/quiz.module';

@Module({
  imports: [QuizModule],
  providers: [GameGateway]
})
export class GameModule { }

import { Controller, Get, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QuizService } from './quiz.service';

@Controller('quiz')
export class QuizController {
    constructor(private quizService: QuizService) { }

    @UseGuards(AuthGuard('jwt'))
    @Post()
    create(@Request() req, @Body() body) {
        return this.quizService.createQuiz(req.user.userId, body);
    }

    @Get('public')
    findAllPublic() {
        return this.quizService.findAllPublic();
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('my')
    findAllMy(@Request() req) {
        return this.quizService.findAllMy(req.user.userId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.quizService.findOne(id);
    }
}

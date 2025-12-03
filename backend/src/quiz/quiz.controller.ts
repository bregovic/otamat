import { Controller, Get, Post, Delete, Body, UseGuards, Request, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QuizService } from './quiz.service';

@Controller('quiz')
export class QuizController {
    constructor(private quizService: QuizService) { }

    @UseGuards(AuthGuard('jwt'))
    @Post()
    create(@Request() req: any, @Body() body: any) {
        return this.quizService.createQuiz(req.user.userId, body);
    }

    @Get('public')
    findAllPublic() {
        return this.quizService.findAllPublic();
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('my')
    findAllMy(@Request() req: any) {
        return this.quizService.findAllMy(req.user.userId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.quizService.findOne(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete(':id')
    remove(@Param('id') id: string, @Request() req: any) {
        return this.quizService.remove(id, req.user.userId);
    }
}

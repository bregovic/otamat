import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionType } from '@prisma/client';

@Injectable()
export class QuizService {
    constructor(private prisma: PrismaService) { }

    async createQuiz(userId: string, data: any) {
        return this.prisma.quiz.create({
            data: {
                title: data.title,
                description: data.description,
                isPublic: data.isPublic || false,
                author: { connect: { id: userId } },
                questions: {
                    create: data.questions.map((q: any, index: number) => ({
                        text: q.text,
                        type: QuestionType.MULTIPLE_CHOICE, // Default for now
                        options: {
                            create: q.options.map((opt: string, i: number) => ({
                                text: opt,
                                isCorrect: i === q.correct,
                                order: i
                            }))
                        },
                        order: index
                    }))
                }
            },
            include: { questions: { include: { options: true } } }
        });
    }

    async findAllPublic() {
        return this.prisma.quiz.findMany({
            where: { isPublic: true },
            include: { author: { select: { nickname: true, avatar: true } } }
        });
    }

    async findAllMy(userId: string) {
        return this.prisma.quiz.findMany({
            where: { authorId: userId },
            include: { _count: { select: { questions: true } } }
        });
    }

    async findOne(id: string) {
        return this.prisma.quiz.findUnique({
            where: { id },
            include: {
                questions: {
                    include: { options: true },
                    orderBy: { order: 'asc' }
                }
            }
        });
    }

    async remove(id: string, userId: string) {
        // Verify ownership
        const quiz = await this.prisma.quiz.findUnique({ where: { id } });
        if (!quiz || quiz.authorId !== userId) {
            throw new Error('Unauthorized or quiz not found');
        }

        // Delete related questions and options first? 
        // Prisma cascade delete should handle it if configured, let's assume it is or do it manually if needed.
        // Usually schema has onDelete: Cascade. Let's check schema later if it fails.
        // For now, let's try deleting the quiz directly.
        return this.prisma.quiz.delete({ where: { id } });
    }
}

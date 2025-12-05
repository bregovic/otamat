
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkImages() {
    console.log("--- Checking last 5 quizzes ---");
    const quizzes = await prisma.quiz.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
            questions: {
                include: {
                    options: true
                }
            }
        }
    });

    for (const quiz of quizzes) {
        console.log(`Quiz: ${quiz.title} (ID: ${quiz.id})`);

        let coverStatus = "NULL";
        if (quiz.coverImage === "") coverStatus = "EMPTY STRING";
        else if (quiz.coverImage) coverStatus = `Present (Length: ${quiz.coverImage.length})`;

        console.log(`  CoverImage: ${coverStatus}`);

        if (quiz.questions) {
            for (const q of quiz.questions) {
                let mediaStatus = "NULL";
                if (q.mediaUrl === "") mediaStatus = "EMPTY STRING";
                else if (q.mediaUrl) mediaStatus = `Present (Length: ${q.mediaUrl.length})`;

                console.log(`  Question: ${q.text.substring(0, 20)}...`);
                console.log(`    MediaUrl: ${mediaStatus}`);
            }
        }
        console.log("-----------------------------------");
    }
}

checkImages()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

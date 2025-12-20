
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const prisma = new PrismaClient();

async function importCards(directoryPath: string) {
    if (!fs.existsSync(directoryPath)) {
        console.error(`Directory not found: ${directoryPath}`);
        return;
    }

    const files = fs.readdirSync(directoryPath);
    console.log(`Found ${files.length} files in ${directoryPath}`);

    let count = 0;
    for (const file of files) {
        if (!file.match(/\.(jpg|jpeg|png|webp)$/i)) {
            console.log(`Skipping non-image file: ${file}`);
            continue;
        }

        const filePath = path.join(directoryPath, file);
        const buffer = fs.readFileSync(filePath);

        try {
            console.log(`Processing ${file}...`);
            const processedBuffer = await sharp(buffer)
                .resize({ width: 800, height: 1200, fit: 'inside' })
                .jpeg({ quality: 80 })
                .toBuffer();

            const base64Data = `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;

            // Check if card with this filename already exists to avoid duplicates
            const existing = await prisma.dixitCard.findFirst({
                where: { fileName: file }
            });

            if (existing) {
                console.log(`Card ${file} already exists, skipping.`);
            } else {
                await prisma.dixitCard.create({
                    data: {
                        data: base64Data,
                        fileName: file
                    }
                });
                console.log(`Imported ${file}`);
                count++;
            }

        } catch (error) {
            console.error(`Failed to process ${file}:`, error);
        }
    }

    console.log(`Finished! Imported ${count} new cards.`);
    await prisma.$disconnect();
}

const targetDir = process.argv[2];
if (!targetDir) {
    console.log("Usage: npx ts-node scripts/import_cards.ts <path_to_images>");
} else {
    importCards(targetDir);
}

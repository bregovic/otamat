import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

async function importCards() {
    // 1. Read CSV file
    const csvPath = "C:\\Users\\Wendulka\\Documents\\Webhry\\TimesUp\\tiu_data_full_cz_with_bizar.csv";

    if (!fs.existsSync(csvPath)) {
        console.error(`File not found: ${csvPath}`);
        return;
    }

    console.log("Reading CSV...");
    const fileContent = fs.readFileSync(csvPath, 'utf-8');

    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    console.log(`Found ${records.length} records. Processing...`);

    let added = 0;
    let skipped = 0;

    for (const record of records as any[]) {
        const { value, level, category } = record;

        if (!value) continue;

        // Check for duplicates
        const existing = await prisma.timesUpCard.findFirst({
            where: { value: value }
        });

        if (existing) {
            skipped++;
            // Optional: Update category/level if needed?
            // console.log(`Skipping ${value} (already exists)`);
        } else {
            await prisma.timesUpCard.create({
                data: {
                    value,
                    level: parseInt(level) || 1, // Default to level 1 if missing
                    category: category || 'General'
                }
            });
            process.stdout.write('.'); // Progress indicator
            added++;
        }
    }

    console.log(`\n\nImport finished!`);
    console.log(`Added: ${added}`);
    console.log(`Skipped: ${skipped}`);
}

importCards()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

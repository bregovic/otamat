const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'sablona_kvizu (3).xlsx';

try {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    const workbook = XLSX.readFile(filePath);
    workbook.SheetNames.forEach(sheetName => {
        console.log(`\n--- Sheet: ${sheetName} ---`);
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        jsonData.slice(0, 5).forEach((row, index) => {
            console.log(`Row ${index}:`, row);
        });
    });

} catch (error) {
    console.error("Error reading Excel file:", error);
}

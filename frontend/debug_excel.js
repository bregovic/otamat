const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'C:\\Users\\Wendulka\\Documents\\Webhry\\OtaMat\\sablona_kvizu (2).xlsx';

try {
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });

    console.log("Sheets:", wb.SheetNames);

    const wsInfo = wb.Sheets["Quiz Info"];
    if (!wsInfo) {
        console.error("Missing 'Quiz Info' sheet");
    } else {
        const infoData = XLSX.utils.sheet_to_json(wsInfo);
        console.log("Quiz Info Data:", infoData);
    }

    const wsQuestions = wb.Sheets["Questions"];
    if (!wsQuestions) {
        console.error("Missing 'Questions' sheet");
    } else {
        const questionsData = XLSX.utils.sheet_to_json(wsQuestions);
        console.log("Questions Data Sample (first 2):", questionsData.slice(0, 2));
        console.log("Total Questions:", questionsData.length);

        // Simulate parsing logic
        const parsedQuestions = questionsData.map((row) => {
            const options = [];
            for (let i = 1; i <= 4; i++) {
                if (row[`Option ${i}`] !== undefined) {
                    options.push({
                        text: row[`Option ${i}`],
                        isCorrect: row[`Option ${i} Correct`] === "Yes",
                        imageUrl: row[`Option ${i} Image`] || ""
                    });
                }
            }
            return {
                text: row.Question || "",
                type: row.Type || "MULTIPLE_CHOICE",
                timeLimit: parseInt(row.TimeLimit) || 30,
                mediaUrl: row.Image || "",
                options: options
            };
        });
        console.log("Parsed Questions Sample:", JSON.stringify(parsedQuestions.slice(0, 1), null, 2));
    }

} catch (e) {
    console.error("Error reading file:", e);
}

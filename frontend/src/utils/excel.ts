import * as XLSX from 'xlsx';

export const exportQuizToExcel = (quiz: any) => {
    // Helper to safe string
    const safeString = (str: string) => {
        if (!str) return "";
        if (str.length > 32000) return "[IMAGE TOO LARGE FOR EXCEL]";
        return str;
    };

    // 1. Quiz Info Sheet
    const quizInfo = [{
        Title: quiz.title,
        Description: quiz.description || "",
        CoverImage: safeString(quiz.coverImage),
        IsPublic: quiz.isPublic ? "Yes" : "No"
    }];

    // 2. Questions Sheet
    const questions = quiz.questions.map((q: any) => {
        const row: any = {
            Question: q.text,
            Type: q.type,
            TimeLimit: q.timeLimit,
            Image: safeString(q.mediaUrl)
        };

        // Add options
        if (q.options) {
            q.options.forEach((opt: any, i: number) => {
                row[`Option ${i + 1}`] = opt.text;
                row[`Option ${i + 1} Correct`] = opt.isCorrect ? "Yes" : "No";
                if (opt.imageUrl) {
                    row[`Option ${i + 1} Image`] = safeString(opt.imageUrl);
                }
            });
        }

        return row;
    });

    const wb = XLSX.utils.book_new();

    const wsInfo = XLSX.utils.json_to_sheet(quizInfo);
    XLSX.utils.book_append_sheet(wb, wsInfo, "Quiz Info");

    const wsQuestions = XLSX.utils.json_to_sheet(questions);
    XLSX.utils.book_append_sheet(wb, wsQuestions, "Questions");

    // Generate file
    XLSX.writeFile(wb, `${quiz.title.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
};

export const importQuizFromExcel = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const wb = XLSX.read(data, { type: 'array' });

                // 1. Parse Quiz Info
                const wsInfo = wb.Sheets["Quiz Info"];
                if (!wsInfo) throw new Error("Chybí list 'Quiz Info'");
                const infoData = XLSX.utils.sheet_to_json(wsInfo);
                const info: any = infoData[0];

                if (!info || !info.Title) throw new Error("Chybí název kvízu v 'Quiz Info'");

                const quiz: any = {
                    title: info.Title,
                    description: info.Description || "",
                    coverImage: info.CoverImage || "",
                    isPublic: info.IsPublic === "Yes",
                    questions: []
                };

                // 2. Parse Questions
                const wsQuestions = wb.Sheets["Questions"];
                if (wsQuestions) {
                    const questionsData = XLSX.utils.sheet_to_json(wsQuestions);

                    quiz.questions = questionsData.map((row: any) => {
                        const options = [];

                        // Try to find up to 4 options
                        for (let i = 1; i <= 4; i++) {
                            if (row[`Option ${i}`] !== undefined) {
                                options.push({
                                    text: row[`Option ${i}`],
                                    isCorrect: row[`Option ${i} Correct`] === "Yes",
                                    imageUrl: row[`Option ${i} Image`] || ""
                                });
                            }
                        }

                        // If True/False and no options defined, create defaults
                        if (row.Type === 'TRUE_FALSE' && options.length === 0) {
                            options.push({ text: "Pravda", isCorrect: true }); // Default, user should check
                            options.push({ text: "Lež", isCorrect: false });
                        }

                        return {
                            text: row.Question || "",
                            type: row.Type || "MULTIPLE_CHOICE",
                            timeLimit: parseInt(row.TimeLimit) || 30,
                            mediaUrl: row.Image || "",
                            options: options
                        };
                    });
                }

                resolve(quiz);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

export const downloadTemplate = () => {
    // 1. Quiz Info Sheet Template
    const quizInfo = [{
        Title: "Název kvízu",
        Description: "Popis kvízu (volitelné)",
        CoverImage: "URL obrázku (volitelné)",
        IsPublic: "No"
    }];

    // 2. Questions Sheet Template
    const questions = [{
        Question: "Příklad otázky?",
        Type: "MULTIPLE_CHOICE",
        TimeLimit: 30,
        Image: "",
        "Option 1": "Možnost A",
        "Option 1 Correct": "Yes",
        "Option 1 Image": "",
        "Option 2": "Možnost B",
        "Option 2 Correct": "No",
        "Option 2 Image": "",
        "Option 3": "",
        "Option 3 Correct": "",
        "Option 3 Image": "",
        "Option 4": "",
        "Option 4 Correct": "",
        "Option 4 Image": ""
    }];

    const wb = XLSX.utils.book_new();

    const wsInfo = XLSX.utils.json_to_sheet(quizInfo);
    XLSX.utils.book_append_sheet(wb, wsInfo, "Quiz Info");

    const wsQuestions = XLSX.utils.json_to_sheet(questions);
    XLSX.utils.book_append_sheet(wb, wsQuestions, "Questions");

    // Generate file
    XLSX.writeFile(wb, "sablona_kvizu.xlsx");
};

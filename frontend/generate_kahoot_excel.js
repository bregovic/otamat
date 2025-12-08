import * as XLSX from 'xlsx';

const quizData = {
    title: "Retro",
    questions: [
        {
            text: "o jakou se jedná postavičku?",
            mediaUrl: "https://media.kahoot.it/58235252-0d12-4217-a06f-65239243922d_opt",
            options: [
                { text: "Alf", isCorrect: true },
                { text: "E.T.", isCorrect: false },
                { text: "Yoda", isCorrect: false },
                { text: "Gremlin", isCorrect: false }
            ],
            timeLimit: 30
        },
        {
            text: "jak se jmenuje tento přístroj.",
            mediaUrl: "https://media.kahoot.it/8701e828-5645-420a-85b4-4b576081516f_opt",
            options: [
                { text: "Walkman", isCorrect: true },
                { text: "Discman", isCorrect: false },
                { text: "MP3 přehrávač", isCorrect: false },
                { text: "Rádio", isCorrect: false }
            ],
            timeLimit: 30
        },
        {
            text: "K čemu se nepoužívaly Céčka?",
            mediaUrl: "https://media.kahoot.it/6987e974-924b-449e-918d-80674254714d_opt",
            options: [
                { text: "Jako platidlo", isCorrect: false },
                { text: "Ke hraní čáry", isCorrect: false },
                { text: "Jako módní doplněk", isCorrect: false },
                { text: "K jídlu", isCorrect: true }
            ],
            timeLimit: 30
        },
        {
            text: "Kdy bylo vytvořeno Tamagotchi?",
            mediaUrl: "https://media.kahoot.it/19597793-784f-42e6-993d-49520845511d_opt",
            options: [
                { text: "1990", isCorrect: false },
                { text: "1996", isCorrect: true },
                { text: "2000", isCorrect: false },
                { text: "1985", isCorrect: false }
            ],
            timeLimit: 30
        },
        {
            text: "Jak se jmenuje tato hra?",
            mediaUrl: "https://media.kahoot.it/c6559775-814d-4860-9669-74674554484d_opt",
            options: [
                { text: "Tetris", isCorrect: false },
                { text: "Pac-Man", isCorrect: true },
                { text: "Snake", isCorrect: false },
                { text: "Space Invaders", isCorrect: false }
            ],
            timeLimit: 30
        },
        {
            text: "Co je na obrázku?",
            mediaUrl: "https://media.kahoot.it/58235252-0d12-4217-a06f-65239243922d_opt", // Placeholder URL, update if needed
            options: [
                { text: "Disketa", isCorrect: true },
                { text: "CD", isCorrect: false },
                { text: "Kazeta", isCorrect: false },
                { text: "Flash disk", isCorrect: false }
            ],
            timeLimit: 30
        },
        {
            text: "Kdo je na obrázku?",
            mediaUrl: "https://media.kahoot.it/58235252-0d12-4217-a06f-65239243922d_opt", // Placeholder URL, update if needed
            options: [
                { text: "Michael Jackson", isCorrect: true },
                { text: "Elvis Presley", isCorrect: false },
                { text: "Freddie Mercury", isCorrect: false },
                { text: "David Bowie", isCorrect: false }
            ],
            timeLimit: 30
        },
        {
            text: "Jak se jmenuje tento seriál?",
            mediaUrl: "https://media.kahoot.it/58235252-0d12-4217-a06f-65239243922d_opt", // Placeholder URL, update if needed
            options: [
                { text: "Přátelé", isCorrect: true },
                { text: "Beverly Hills 90210", isCorrect: false },
                { text: "Pobřežní hlídka", isCorrect: false },
                { text: "Krok za krokem", isCorrect: false }
            ],
            timeLimit: 30
        },
        {
            text: "Co to je?",
            mediaUrl: "https://media.kahoot.it/58235252-0d12-4217-a06f-65239243922d_opt", // Placeholder URL, update if needed
            options: [
                { text: "Rubikova kostka", isCorrect: true },
                { text: "Hlavolam", isCorrect: false },
                { text: "Kostka", isCorrect: false },
                { text: "Hračka", isCorrect: false }
            ],
            timeLimit: 30
        }
    ]
};

// Create workbook and worksheet
const wb = XLSX.utils.book_new();
const wsData = [
    ["Název kvízu", quizData.title],
    [],
    ["Otázka", "Obrázek (URL)", "Čas (s)", "Odpověď 1", "Správně 1", "Odpověď 2", "Správně 2", "Odpověď 3", "Správně 3", "Odpověď 4", "Správně 4"]
];

quizData.questions.forEach(q => {
    const row = [
        q.text,
        q.mediaUrl || "",
        q.timeLimit,
        q.options[0]?.text || "", q.options[0]?.isCorrect ? "ANO" : "NE",
        q.options[1]?.text || "", q.options[1]?.isCorrect ? "ANO" : "NE",
        q.options[2]?.text || "", q.options[2]?.isCorrect ? "ANO" : "NE",
        q.options[3]?.text || "", q.options[3]?.isCorrect ? "ANO" : "NE"
    ];
    wsData.push(row);
});

const ws = XLSX.utils.aoa_to_sheet(wsData);
XLSX.utils.book_append_sheet(wb, ws, "Kvíz");

// Write to file
XLSX.writeFile(wb, 'kahoot_retro_export.xlsx');
console.log("Excel file created successfully.");

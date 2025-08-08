// build.js

const { Client } = require("@notionhq/client");
const fs = require("fs");
require("dotenv").config();

// Initialize the Notion client with your API key
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

/**
 * Main function to run the script
 */
async function main() {
  console.log("Fetching data from Notion...");
  try {
    const pages = await getDatabasePages();
    const questions = processPages(pages);

    if (questions.length === 0) {
      console.warn("⚠️ No questions were processed. Check property names in the script against your Notion DB.");
      return;
    }
    
    console.log(`Successfully processed ${questions.length} questions.`);
    
    // Ensure the output directory exists
    const outputDir = './dist';
    if (!fs.existsSync(outputDir)){
        fs.mkdirSync(outputDir);
    }

    // Write the necessary files for the website
    fs.writeFileSync(`${outputDir}/index.html`, generateHtml(questions));
    fs.writeFileSync(`${outputDir}/style.css`, getCss());
    fs.writeFileSync(`${outputDir}/script.js`, getJavaScript());

    console.log("✅ Successfully created your interactive quiz website in the 'dist' folder!");

  } catch (error) {
    console.error("❌ An error occurred:", error);
  }
}

/**
 * Fetches all pages from the Notion database
 */
async function getDatabasePages() {
  const pages = [];
  let cursor = undefined;

  while (true) {
    const { results, next_cursor } = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
    });
    pages.push(...results);
    if (!next_cursor) {
      break;
    }
    cursor = next_cursor;
  }
  return pages;
}

/**
 * Processes the raw page data from Notion into a clean question format
 */
function processPages(pages) {
  // Helper functions to safely extract data from Notion's complex objects
  const getText = (property) => property?.[0]?.plain_text || null;
  const getTitle = (property) => property?.[0]?.plain_text || null;
  const getSelect = (property) => property?.select?.name || null;
  const getMultiSelect = (property) => property?.map(opt => opt.name) || [];

  return pages.map(page => {
    const props = page.properties;

    // Collect all options that are not empty
    const options = [];
    const optionPrefixes = ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'ΣΤ'];
    const optionColumns = ['Επιλογή Α', 'Επιλογή Β', 'Επιλογή Γ', 'Επιλογή Δ', 'Επιλογή Ε', 'Επιλογή ΣΤ'];
    
    for (let i = 0; i < optionColumns.length; i++) {
        const optionText = getText(props[optionColumns[i]]?.rich_text);
        if (optionText) {
            options.push({ letter: optionPrefixes[i], text: optionText });
        }
    }
    
    const questionData = {
      id: page.id,
      question: getTitle(props["Εκφώνηση"]?.title),
      options: options,
      correctAnswers: getMultiSelect(props["Σωστή/ές απάντηση/εις"]?.multi_select),
      justification: getText(props["Αιτιολόγηση"]?.rich_text),
      category: getSelect(props["Μάθημα"]?.select) || "Uncategorized"
    };

    return questionData;
  }).filter(q => q.question && q.options.length > 0); // Only include questions that have text and options
}

/**
 * Generates the main HTML file content
 */
function generateHtml(questions) {
  // We embed the question data directly into the HTML as a JSON object.
  // The client-side JavaScript will use this data to build the quiz.
  return `
    <!DOCTYPE html>
    <html lang="el">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MedPollaplis | Interactive Quiz</title>
        <link rel="stylesheet" href="style.css">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
    </head>
    <body>
        <div class="container">
            <header class="site-header">
                <h1>MedPollaplis Quiz</h1>
                <div class="filter-container">
                    <label for="category-filter">Filter by Subject:</label>
                    <select id="category-filter"></select>
                </div>
            </header>
            <main id="quiz-container"></main>
        </div>
        
        <script>
            const questionsData = ${JSON.stringify(questions)};
        </script>
        <script src="script.js"></script>
    </body>
    </html>
  `;
}

/**
 * Returns the CSS styles as a string
 */
function getCss() {
  return `
    :root {
      --background-color: #f4f7f9;
      --card-background: #ffffff;
      --text-color: #2c3e50;
      --primary-color: #3498db;
      --light-gray: #e1e5e8;
      --correct-color: #2ecc71;
      --incorrect-color: #e74c3c;
      --correct-bg: #e9f9f0;
      --incorrect-bg: #fbecec;
    }
    body {
      background-color: var(--background-color);
      color: var(--text-color);
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 1rem;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    .site-header {
      text-align: center;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--light-gray);
    }
    .site-header h1 {
      color: var(--primary-color);
      margin: 0;
    }
    .filter-container {
      margin-top: 1rem;
    }
    #category-filter {
      padding: 0.5rem;
      border-radius: 6px;
      border: 1px solid var(--light-gray);
      font-size: 1rem;
    }
    .question-card {
      background-color: var(--card-background);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      border: 1px solid var(--light-gray);
    }
    .question-card[data-answered="true"] .option {
        cursor: not-allowed;
    }
    .question-text {
      font-size: 1.2rem;
      font-weight: 500;
      margin: 0 0 1.5rem 0;
      line-height: 1.6;
    }
    .options-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .option {
      display: flex;
      align-items: center;
      padding: 0.75rem;
      border: 1px solid var(--light-gray);
      border-radius: 8px;
      margin-bottom: 0.5rem;
      cursor: pointer;
      transition: background-color 0.2s ease, border-color 0.2s ease;
    }
    .option:hover {
      background-color: #eef6fc;
      border-color: var(--primary-color);
    }
    .option-letter {
      background-color: var(--primary-color);
      color: white;
      font-weight: 700;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      margin-right: 1rem;
      flex-shrink: 0;
    }
    .option.correct {
        background-color: var(--correct-bg);
        border-color: var(--correct-color);
        font-weight: 500;
    }
    .option.incorrect {
        background-color: var(--incorrect-bg);
        border-color: var(--incorrect-color);
    }
    .justification {
      background-color: var(--background-color);
      border-left: 4px solid var(--primary-color);
      padding: 1rem;
      margin-top: 1.5rem;
      border-radius: 0 8px 8px 0;
      display: none; /* Initially hidden */
    }
    .justification p {
      margin: 0;
      line-height: 1.7;
    }
  `;
}

/**
 * Returns the client-side JavaScript as a string
 */
function getJavaScript() {
  return `
    document.addEventListener('DOMContentLoaded', () => {
      const quizContainer = document.getElementById('quiz-container');
      const categoryFilter = document.getElementById('category-filter');
      let currentCategory = 'all';

      function setupFilters() {
        const categories = ['All Subjects', ...new Set(questionsData.map(q => q.category))];
        categoryFilter.innerHTML = categories.map(c => \`<option value="\${c}">\${c}</option>\`).join('');
        
        categoryFilter.addEventListener('change', (e) => {
          currentCategory = e.target.value;
          renderQuestions();
        });
      }

      function renderQuestions() {
        quizContainer.innerHTML = '';
        const filteredQuestions = questionsData.filter(q => currentCategory === 'All Subjects' || q.category === currentCategory);

        filteredQuestions.forEach(q => {
          const card = document.createElement('div');
          card.className = 'question-card';
          card.dataset.questionId = q.id;

          const optionsHtml = q.options.map(opt => \`
            <li class="option" data-letter="\${opt.letter}">
              <span class="option-letter">\${opt.letter}</span>
              <span class="option-text">\${opt.text}</span>
            </li>
          \`).join('');

          card.innerHTML = \`
            <p class="question-text">\${q.question}</p>
            <ul class="options-list">\${optionsHtml}</ul>
            \${q.justification ? \`<div class="justification"><p>\${q.justification}</p></div>\` : ''}
          \`;

          quizContainer.appendChild(card);
        });
      }

      quizContainer.addEventListener('click', (e) => {
        const selectedOption = e.target.closest('.option');
        if (!selectedOption) return;

        const parentCard = selectedOption.closest('.question-card');
        if (parentCard.dataset.answered === 'true') return;

        parentCard.dataset.answered = 'true';

        const questionId = parentCard.dataset.questionId;
        const question = questionsData.find(q => q.id === questionId);
        const selectedLetter = selectedOption.dataset.letter;

        // Check if the answer is correct
        if (question.correctAnswers.includes(selectedLetter)) {
          selectedOption.classList.add('correct');
        } else {
          selectedOption.classList.add('incorrect');
        }

        // Highlight all correct answers
        parentCard.querySelectorAll('.option').forEach(opt => {
          if (question.correctAnswers.includes(opt.dataset.letter)) {
            opt.classList.add('correct');
          }
        });

        // Show justification if it exists
        const justificationEl = parentCard.querySelector('.justification');
        if (justificationEl) {
          justificationEl.style.display = 'block';
        }
      });
      
      // Initial setup
      setupFilters();
      renderQuestions();
    });
  `;
}

// Run the script
main();
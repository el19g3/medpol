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

    console.log("✅ Successfully created your website in the 'dist' folder!");

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
  // Helper functions to safely extract data
  const getText = (property) => property?.[0]?.plain_text || null;
  const getTitle = (property) => property?.[0]?.plain_text || null;
  const getSelect = (property) => property?.select?.name || null;
  const getMultiSelect = (property) => property?.map(opt => opt.name) || [];

  return pages.map(page => {
    const props = page.properties;

    // Collect all options that are not empty
    const options = [];
    const optionPrefixes = ['Α.', 'Β.', 'Γ.', 'Δ.', 'Ε.', 'ΣΤ.'];
    const optionColumns = ['Επιλογή Α', 'Επιλογή Β', 'Επιλογή Γ', 'Επιλογή Δ', 'Επιλογή Ε', 'Επιλογή ΣΤ'];
    
    for (let i = 0; i < optionColumns.length; i++) {
        const optionText = getText(props[optionColumns[i]]?.rich_text);
        if (optionText) {
            options.push(`${optionPrefixes[i]} ${optionText}`);
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
  }).filter(q => q.question && q.options.length > 0);
}

/**
 * Generates the main HTML file content
 */
function generateHtml(questions) {
  return `
    <!DOCTYPE html>
    <html lang="el">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MedPollaplis | Medical Questions</title>
        <link rel="stylesheet" href="style.css">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
    </head>
    <body>
        <div class="container">
            <header class="site-header">
                <h1>MedPollaplis Questions</h1>
                <div class="filter-container">
                    <label for="category-filter">Select a Subject to Begin</label>
                    <select id="category-filter"></select>
                </div>
            </header>
            <main id="quiz-container">
                <p class="initial-prompt">Please select a subject from the dropdown above.</p>
            </main>
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
      --accent-color: #2ecc71;
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
      margin: 0 0 1rem 0;
    }
    .filter-container label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    #category-filter {
      padding: 0.5rem;
      border-radius: 6px;
      border: 1px solid var(--light-gray);
      font-size: 1rem;
      min-width: 250px;
    }
    .initial-prompt {
        text-align: center;
        color: #7f8c8d;
        font-size: 1.2rem;
        padding: 3rem 0;
    }
    .question-card {
      background-color: var(--card-background);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      border: 1px solid var(--light-gray);
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
      margin: 0 0 1.5rem 0;
    }
    .options-list li {
      margin-bottom: 0.5rem;
      line-height: 1.6;
      padding: 0.5rem;
      border-left: 3px solid var(--light-gray);
    }
    .show-answer-btn {
        background-color: var(--primary-color);
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        font-weight: 500;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.2s ease;
    }
    .show-answer-btn:hover {
        background-color: #2980b9;
    }
    .answer-reveal {
      background-color: #ecf0f1;
      border-left: 4px solid var(--accent-color);
      padding: 1rem;
      margin-top: 1.5rem;
      border-radius: 0 8px 8px 0;
      display: none; /* Hidden by default */
    }
    .answer-reveal p {
      margin: 0;
      line-height: 1.7;
    }
    .answer-reveal p:first-child {
        font-weight: bold;
        margin-bottom: 0.5rem;
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
      
      // --- Setup Filter Dropdown ---
      function setupFilters() {
        const categories = [...new Set(questionsData.map(q => q.category))];
        categories.sort(); // Sort categories alphabetically
        
        // Add the default, disabled option first
        categoryFilter.innerHTML = \`<option value="" selected disabled>Select a Subject...</option>\`;
        
        // Add all other categories
        categories.forEach(c => {
            const option = document.createElement('option');
            option.value = c;
            option.textContent = c;
            categoryFilter.appendChild(option);
        });
      }

      // --- Render Questions for a Selected Category ---
      function renderQuestions(selectedCategory) {
        // Clear previous questions
        quizContainer.innerHTML = '';
        
        // Find questions that match the selected category
        const filteredQuestions = questionsData.filter(q => q.category === selectedCategory);

        if (filteredQuestions.length === 0) {
            quizContainer.innerHTML = '<p class="initial-prompt">No questions found for this subject.</p>';
            return;
        }
        
        // Create and append a card for each question
        filteredQuestions.forEach(q => {
          const card = document.createElement('div');
          card.className = 'question-card';
          
          const optionsHtml = q.options.map(opt => \`<li>\${opt}</li>\`).join('');
          
          const answerHtml = \`
            <p>Correct Answer(s): \${q.correctAnswers.join(', ')}</p>
            \${q.justification ? \`<p>\${q.justification}</p>\` : ''}
          \`;

          card.innerHTML = \`
            <p class="question-text">\${q.question}</p>
            <ul class="options-list">\${optionsHtml}</ul>
            <button class="show-answer-btn">Show Answer</button>
            <div class="answer-reveal">\${answerHtml}</div>
          \`;

          quizContainer.appendChild(card);
        });
      }

      // --- Event Listeners ---
      
      // When the user changes the selected subject in the dropdown
      categoryFilter.addEventListener('change', () => {
        const selectedCategory = categoryFilter.value;
        if (selectedCategory) {
          renderQuestions(selectedCategory);
        } else {
          quizContainer.innerHTML = '<p class="initial-prompt">Please select a subject from the dropdown above.</p>';
        }
      });

      // When the user clicks anywhere in the quiz area (to handle all "Show Answer" buttons)
      quizContainer.addEventListener('click', (e) => {
        // Check if the clicked element is a show-answer button
        if (e.target.classList.contains('show-answer-btn')) {
          const btn = e.target;
          const answerDiv = btn.nextElementSibling; // The .answer-reveal div

          // Toggle visibility and button text
          const isHidden = answerDiv.style.display === 'none' || answerDiv.style.display === '';
          answerDiv.style.display = isHidden ? 'block' : 'none';
          btn.textContent = isHidden ? 'Hide Answer' : 'Show Answer';
        }
      });
      
      // --- Initial Page Load ---
      setupFilters();
    });
  `;
}

// Run the script
main();
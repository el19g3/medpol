// build.js - Final Version

const { Client } = require("@notionhq/client");
const fs = require("fs");
require("dotenv").config();

// Initialize the Notion client with your API key
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

async function main() {
  console.log("Fetching data from Notion...");
  try {
    const pages = await getDatabasePages();
    const questions = processPages(pages);

    if (questions.length === 0) {
      console.warn("⚠️ No questions were processed. Please double-check your Notion column names match the names in this script.");
      return;
    }
    
    console.log(`Successfully processed ${questions.length} questions.`);
    
    const outputDir = './dist';
    if (!fs.existsSync(outputDir)){
        fs.mkdirSync(outputDir);
    }

    fs.writeFileSync(`${outputDir}/index.html`, generateHtml(questions));
    fs.writeFileSync(`${outputDir}/style.css`, getCss());
    fs.writeFileSync(`${outputDir}/script.js`, getJavaScript());

    console.log("✅ Successfully created your final website in the 'dist' folder!");

  } catch (error) {
    console.error("❌ An error occurred:", error);
  }
}

async function getDatabasePages() {
  const pages = [];
  let cursor = undefined;
  while (true) {
    const { results, next_cursor } = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
    });
    pages.push(...results);
    if (!next_cursor) break;
    cursor = next_cursor;
  }
  return pages;
}

function processPages(pages) {
  const getText = (property) => property?.[0]?.plain_text || null;
  const getTitle = (property) => property?.[0]?.plain_text || null;
  const getSelect = (property) => property?.select?.name || null;
  const getMultiSelect = (property) => property?.map(opt => opt.name) || [];

  return pages.map(page => {
    const props = page.properties;
    
    const options = [];
    const optionColumns = ['Επιλογή Α', 'Επιλογή Β', 'Επιλογή Γ', 'Επιλογή Δ', 'Επιλογή Ε', 'Επιλογή ΣΤ'];
    
    for (const columnName of optionColumns) {
        const optionText = getText(props[columnName]?.rich_text);
        if (optionText) {
            options.push(optionText);
        }
    }
    
    const questionData = {
      id: page.id,
      question: getTitle(props["Εκφώνηση"]?.title),
      options: options,
      // THE FIX IS HERE: Using the correct property name from the debug log.
      correctAnswers: getMultiSelect(props["Σωστή απάντηση"]?.multi_select),
      justification: getText(props["Αιτιολόγηση"]?.rich_text),
      category: getSelect(props["Μάθημα"]?.select) || "Uncategorized"
    };

    return questionData;
  }).filter(q => q.question && q.options.length > 0);
}

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
        <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Roboto+Slab:wght@500;700&display=swap" rel="stylesheet">
    </head>
    <body>
        <div class="app-container">
            <header class="site-header">
                <div class="logo">MedPollaplis</div>
                <div class="filter-container">
                    <label for="category-filter">Select a Subject</label>
                    <select id="category-filter"></select>
                </div>
            </header>
            <main id="quiz-container">
                <div class="initial-prompt">
                    <h2>Welcome!</h2>
                    <p>Please select a subject from the dropdown menu above to begin.</p>
                </div>
            </main>
            <footer id="pagination-container"></footer>
        </div>
        
        <script>
            const questionsData = ${JSON.stringify(questions)};
        </script>
        <script src="script.js"></script>
    </body>
    </html>
  `;
}

function getCss() {
  return `
    :root {
      --background-color: #f0f2f5;
      --card-background: #ffffff;
      --text-color: #333d47;
      --heading-color: #1a2c42;
      --primary-color: #007aff;
      --light-gray: #dce1e6;
      --accent-color: #34c759;
      --border-radius: 12px;
      --shadow: 0 5px 15px rgba(0, 0, 0, 0.07);
    }
    body {
      background-color: var(--background-color);
      color: var(--text-color);
      font-family: 'Lato', sans-serif;
      margin: 0;
    }
    .app-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .site-header {
      background-color: var(--card-background);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--light-gray);
      box-shadow: var(--shadow);
    }
    .logo {
      font-family: 'Roboto Slab', serif;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--heading-color);
    }
    .filter-container label {
      display: none;
    }
    #category-filter {
      padding: 0.6rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--light-gray);
      font-size: 1rem;
      font-family: 'Lato', sans-serif;
      min-width: 250px;
      background-color: #f8f9fa;
    }
    main {
      flex: 1;
      max-width: 840px;
      width: 100%;
      margin: 0 auto;
      padding: 2rem;
      box-sizing: border-box;
    }
    .initial-prompt {
        text-align: center;
        color: #6c757d;
        padding: 4rem 0;
    }
    .initial-prompt h2 {
        font-family: 'Roboto Slab', serif;
    }
    .question-card {
      background-color: var(--card-background);
      border-radius: var(--border-radius);
      padding: 2rem;
      margin-bottom: 1.5rem;
      box-shadow: var(--shadow);
      border: 1px solid var(--light-gray);
    }
    .question-text {
      font-size: 1.3rem;
      font-weight: 700;
      font-family: 'Roboto Slab', serif;
      color: var(--heading-color);
      margin: 0 0 1.5rem 0;
      line-height: 1.5;
    }
    .options-list {
      list-style: none;
      padding: 0;
      margin: 0 0 1.5rem 0;
    }
    .options-list li {
      margin-bottom: 0.75rem;
      line-height: 1.6;
      padding: 0.5rem;
    }
    .show-answer-btn {
        background-color: var(--primary-color);
        color: white;
        border: none;
        padding: 0.8rem 1.6rem;
        font-size: 1rem;
        font-weight: 700;
        border-radius: 8px;
        cursor: pointer;
        transition: transform 0.2s ease, background-color 0.2s ease;
    }
    .show-answer-btn:hover {
        background-color: #0056b3;
        transform: translateY(-2px);
    }
    .answer-reveal {
      background-color: #e9f5ff;
      border-left: 4px solid var(--primary-color);
      padding: 1.25rem;
      margin-top: 1.5rem;
      border-radius: 0 8px 8px 0;
      display: none; /* Hidden by default */
    }
    .answer-reveal p { margin: 0; line-height: 1.7; }
    .answer-reveal p:first-child { font-weight: bold; margin-bottom: 0.75rem; color: var(--heading-color); }
    footer {
        padding: 2rem;
        text-align: center;
    }
    .pagination-controls button {
        background-color: var(--card-background);
        color: var(--primary-color);
        border: 1px solid var(--light-gray);
        padding: 0.6rem 1.2rem;
        margin: 0 0.5rem;
        font-size: 1rem;
        font-weight: 700;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .pagination-controls button:hover {
        background-color: var(--primary-color);
        color: white;
    }
    .pagination-controls button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    #page-info {
        display: inline-block;
        min-width: 100px;
        font-weight: 500;
    }
  `;
}

function getJavaScript() {
  return `
    document.addEventListener('DOMContentLoaded', () => {
      const quizContainer = document.getElementById('quiz-container');
      const categoryFilter = document.getElementById('category-filter');
      const paginationContainer = document.getElementById('pagination-container');
      
      let allQuestions = [];
      let currentPage = 1;
      const questionsPerPage = 15;

      function setupFilters() {
        const categories = [...new Set(questionsData.map(q => q.category))];
        categories.sort((a, b) => a.localeCompare(b, 'el'));
        
        categoryFilter.innerHTML = '<option value="" selected disabled>Select a Subject...</option>';
        
        categories.forEach(c => {
            const option = document.createElement('option');
            option.value = c;
            option.textContent = c;
            categoryFilter.appendChild(option);
        });
      }

      function renderQuestions() {
        quizContainer.innerHTML = '';
        const startIndex = (currentPage - 1) * questionsPerPage;
        const endIndex = startIndex + questionsPerPage;
        const paginatedQuestions = allQuestions.slice(startIndex, endIndex);

        if (paginatedQuestions.length === 0) {
            quizContainer.innerHTML = '<div class="initial-prompt"><h2>No questions found for this subject.</h2></div>';
            return;
        }
        
        paginatedQuestions.forEach(q => {
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
      
      function setupPagination() {
          paginationContainer.innerHTML = '';
          const pageCount = Math.ceil(allQuestions.length / questionsPerPage);
          
          if (pageCount <= 1) return;

          const prevButton = document.createElement('button');
          prevButton.id = 'prev-btn';
          prevButton.textContent = 'Previous';
          prevButton.disabled = currentPage === 1;

          const nextButton = document.createElement('button');
          nextButton.id = 'next-btn';
          nextButton.textContent = 'Next';
          nextButton.disabled = currentPage === pageCount;

          const pageInfo = document.createElement('span');
          pageInfo.id = 'page-info';
          pageInfo.textContent = \`Page \${currentPage} of \${pageCount}\`;

          paginationContainer.append(prevButton, pageInfo, nextButton);
      }

      categoryFilter.addEventListener('change', () => {
        const selectedCategory = categoryFilter.value;
        if (selectedCategory) {
          allQuestions = questionsData.filter(q => q.category === selectedCategory);
          currentPage = 1;
          renderQuestions();
          setupPagination();
        }
      });
      
      paginationContainer.addEventListener('click', (e) => {
          if (e.target.id === 'next-btn' && !e.target.disabled) {
              currentPage++;
          } else if (e.target.id === 'prev-btn' && !e.target.disabled) {
              currentPage--;
          }
          renderQuestions();
          setupPagination();
          window.scrollTo(0, 0);
      });

      quizContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('show-answer-btn')) {
          const btn = e.target;
          const answerDiv = btn.nextElementSibling;
          const isHidden = answerDiv.style.display === 'none' || answerDiv.style.display === '';
          answerDiv.style.display = isHidden ? 'block' : 'none';
          btn.textContent = isHidden ? 'Hide Answer' : 'Show Answer';
        }
      });
      
      setupFilters();
    });
  `;
}

main();
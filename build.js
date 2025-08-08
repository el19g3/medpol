// build.js - Final Version with Search, Flagging, Random Quiz, and New Design

const { Client } = require("@notionhq/client");
const fs = require("fs");
require("dotenv").config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

async function main() {
  console.log("Fetching data from Notion...");
  try {
    const pages = await getDatabasePages();
    const questions = processPages(pages);

    if (questions.length === 0) {
      console.warn("⚠️ No questions were processed. This might happen if all your questions are missing a title ('Εκφώνηση').");
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

    console.log("✅ Successfully created your final, upgraded website in the 'dist' folder!");

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
    const getRichText = (property) => property?.rich_text?.[0]?.plain_text || null;
    const getTitle = (property) => property?.title?.[0]?.plain_text || null;
    const getSelect = (property) => property?.select?.name || null;
    const getMultiSelect = (property) => property?.multi_select?.map(opt => opt.name) || [];

    return pages.map(page => {
        const props = page.properties;
        
        const options = [];
        const optionColumns = ['Επιλογή Α', 'Επιλογή Β', 'Επιλογή Γ', 'Επιλογή Δ', 'Επιλογή Ε', 'Επιλογή ΣΤ'];
        
        for (const columnName of optionColumns) {
            const optionText = getRichText(props[columnName]);
            if (optionText) {
                options.push(optionText);
            }
        }
        
        const questionData = {
            id: page.id,
            question: getTitle(props["Εκφώνηση"]),
            options: options,
            correctAnswers: getMultiSelect(props["Σωστή απάντηση"]),
            justification: getRichText(props["Αιτιολόγηση"]),
            category: getSelect(props["Μάθημα"]) || "Uncategorized"
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Roboto+Slab:wght@500;700&display=swap" rel="stylesheet">
    </head>
    <body>
        <div class="app-container">
            <header class="site-header">
                <div class="logo">MedPollaplis</div>
                <div class="controls-container">
                    <div class="search-wrapper">
                         <input type="search" id="search-bar" placeholder="Search in this subject...">
                    </div>
                    <select id="category-filter"></select>
                </div>
            </header>
            
            <div class="toolbar">
                <div id="mode-selector">
                    <button id="mode-all" class="mode-btn active" title="View all questions">All Questions</button>
                    <button id="mode-quiz" class="mode-btn" title="Start a random quiz">Random Quiz</button>
                </div>
                <div id="quiz-options" class="hidden">
                    <input type="number" id="quiz-count" value="20" min="5" max="100">
                    <button id="start-quiz-btn">Start</button>
                </div>
            </div>

            <main id="quiz-container">
                <div class="initial-prompt">
                    <h2>Welcome!</h2>
                    <p>Please select a subject from the dropdown menu above to begin.</p>
                </div>
            </main>
            <footer id="pagination-container"></footer>
        </div>
        
        <script>
            // Embed the data directly for the client-side script to use
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
      --background-color: #f4f5f7;
      --card-background: #ffffff;
      --text-color: #3d4752;
      --heading-color: #172b4d;
      --primary-color: #0052cc;
      --light-gray: #dfe1e6;
      --accent-color: #00875a;
      --flag-color: #ffab00;
      --border-radius: 10px;
      --shadow: 0 4px 8px -2px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31);
    }
    body {
      background-color: var(--background-color);
      color: var(--text-color);
      font-family: 'Inter', sans-serif;
      margin: 0;
      line-height: 1.6;
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
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .logo {
      font-family: 'Roboto Slab', serif;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--heading-color);
    }
    .controls-container {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .search-wrapper {
        position: relative;
    }
    #search-bar {
        padding: 0.6rem 1rem;
        border-radius: 6px;
        border: 1px solid var(--light-gray);
        font-size: 0.9rem;
        min-width: 280px;
        transition: border-color 0.2s;
    }
    #search-bar:focus {
        outline: none;
        border-color: var(--primary-color);
    }
    #category-filter {
      padding: 0.6rem 1rem;
      border-radius: 6px;
      border: 1px solid var(--light-gray);
      font-size: 1rem;
      font-family: 'Inter', sans-serif;
      min-width: 250px;
      background-color: #f8f9fa;
    }
    .toolbar {
        background-color: #fafbfc;
        padding: 0.75rem 2rem;
        border-bottom: 1px solid var(--light-gray);
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .mode-btn {
        padding: 0.5rem 1rem;
        border: 1px solid transparent;
        background-color: transparent;
        color: #42526e;
        font-weight: 500;
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.2s;
    }
    .mode-btn.active {
        background-color: #e9eaf0;
        color: var(--primary-color);
    }
    #quiz-options input {
        width: 60px;
        padding: 0.5rem;
        text-align: center;
        border: 1px solid var(--light-gray);
        border-radius: 6px;
    }
    #start-quiz-btn {
        background-color: var(--accent-color);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
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
        color: #6b778c;
        padding: 4rem 0;
    }
    .initial-prompt h2 {
        font-family: 'Roboto Slab', serif;
        color: var(--heading-color);
    }
    .question-card {
      background-color: var(--card-background);
      border-radius: var(--border-radius);
      padding: 1.5rem 2rem;
      margin-bottom: 1.5rem;
      box-shadow: var(--shadow);
      position: relative;
      transition: transform 0.2s;
    }
    .question-card:hover {
        transform: translateY(-3px);
    }
    .flag-btn {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.5rem;
    }
    .flag-btn svg {
        width: 24px;
        height: 24px;
        fill: #c1c7d0;
        transition: fill 0.2s, transform 0.2s;
    }
    .flag-btn:hover svg {
        fill: var(--flag-color);
        transform: scale(1.1);
    }
    .flag-btn.flagged svg {
        fill: var(--flag-color);
    }
    .question-text {
      font-size: 1.2rem;
      font-weight: 500;
      font-family: 'Roboto Slab', serif;
      color: var(--heading-color);
      margin: 0 0 1.5rem 0;
      line-height: 1.5;
      padding-right: 2rem; /* space for flag */
    }
    .options-list {
      list-style: none;
      padding: 0;
      margin: 0 0 1.5rem 0;
    }
    .options-list li {
      margin-bottom: 0.75rem;
      line-height: 1.6;
      padding-left: 1rem;
      border-left: 3px solid var(--light-gray);
    }
    .show-answer-btn {
        background-color: var(--primary-color);
        color: white;
        border: none;
        padding: 0.7rem 1.4rem;
        font-size: 0.9rem;
        font-weight: 700;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .show-answer-btn:hover {
        background-color: #0041a3;
        transform: translateY(-2px);
    }
    .answer-reveal {
      background-color: #f4f5f7;
      border-left: 4px solid var(--accent-color);
      padding: 1.25rem;
      margin-top: 1.5rem;
      border-radius: 0 8px 8px 0;
      display: none;
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
        color: #5e6c84;
    }
    .hidden {
        display: none !important;
    }
  `;
}

function getJavaScript() {
  return `
    document.addEventListener('DOMContentLoaded', () => {
      // --- DOM Elements ---
      const quizContainer = document.getElementById('quiz-container');
      const categoryFilter = document.getElementById('category-filter');
      const paginationContainer = document.getElementById('pagination-container');
      const searchBar = document.getElementById('search-bar');
      const modeAllBtn = document.getElementById('mode-all');
      const modeQuizBtn = document.getElementById('mode-quiz');
      const quizOptions = document.getElementById('quiz-options');
      const startQuizBtn = document.getElementById('start-quiz-btn');
      const quizCountInput = document.getElementById('quiz-count');

      // --- State Management ---
      let currentQuestions = [];
      let currentPage = 1;
      let appMode = 'all'; // 'all' or 'quiz'
      const questionsPerPage = 15;
      let flaggedQuestions = JSON.parse(localStorage.getItem('flaggedQuestions')) || [];

      // --- Helper Functions ---
      const saveFlagged = () => localStorage.setItem('flaggedQuestions', JSON.stringify(flaggedQuestions));
      const isFlagged = (id) => flaggedQuestions.includes(id);
      
      // --- Setup ---
      function setupFilters() {
        const categories = ['Flagged for Review', ...new Set(questionsData.map(q => q.category))];
        categories.sort((a, b) => {
            if (a === 'Flagged for Review') return -1;
            if (b === 'Flagged for Review') return 1;
            return a.localeCompare(b, 'el');
        });
        
        categoryFilter.innerHTML = '<option value="" selected disabled>Select a Subject...</option>';
        
        categories.forEach(c => {
            const option = document.createElement('option');
            option.value = c;
            option.textContent = c;
            categoryFilter.appendChild(option);
        });
      }

      // --- Rendering ---
      function render() {
        quizContainer.innerHTML = '';
        const startIndex = (currentPage - 1) * questionsPerPage;
        const endIndex = startIndex + questionsPerPage;
        const paginatedQuestions = currentQuestions.slice(startIndex, endIndex);

        if (paginatedQuestions.length === 0) {
            quizContainer.innerHTML = '<div class="initial-prompt"><h2>No questions found.</h2><p>Try a different subject or clear your search.</p></div>';
            paginationContainer.innerHTML = '';
            return;
        }
        
        paginatedQuestions.forEach(q => {
          const card = document.createElement('div');
          card.className = 'question-card';
          card.dataset.questionId = q.id;
          
          const optionsHtml = q.options.map(opt => \`<li>\${opt}</li>\`).join('');
          const answerHtml = \`<p>Correct Answer(s): \${q.correctAnswers.join(', ')}</p>\${q.justification ? \`<p>\${q.justification}</p>\` : ''}\`;
          const flagIcon = \`
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4.5V20L5.426 18.911C6.012 18.475 6.76 18.25 7.5 18.25C8.24 18.25 8.988 18.475 9.574 18.911L12 20.822L14.426 18.911C15.012 18.475 15.76 18.25 16.5 18.25C17.24 18.25 17.988 18.475 18.574 18.911L20 20V4.5C20 4.22386 19.7761 4 19.5 4H4.5C4.22386 4 4 4.22386 4 4.5Z" stroke="#42526E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          \`;

          card.innerHTML = \`
            <button class="flag-btn \${isFlagged(q.id) ? 'flagged' : ''}" title="Flag for review">
              \${flagIcon}
            </button>
            <p class="question-text">\${q.question}</p>
            <ul class="options-list">\${optionsHtml}</ul>
            <button class="show-answer-btn">Show Answer</button>
            <div class="answer-reveal">\${answerHtml}</div>
          \`;
          quizContainer.appendChild(card);
        });
        setupPagination();
      }
      
      function setupPagination() {
          paginationContainer.innerHTML = '';
          const pageCount = Math.ceil(currentQuestions.length / questionsPerPage);
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

          paginationContainer.innerHTML = '<div class="pagination-controls"></div>';
          paginationContainer.firstChild.append(prevButton, pageInfo, nextButton);
      }
      
      function updateQuestionList() {
        const selectedCategory = categoryFilter.value;
        const searchTerm = searchBar.value.toLowerCase();
        
        let filtered = [];

        if (selectedCategory === 'Flagged for Review') {
            filtered = questionsData.filter(q => isFlagged(q.id));
        } else if (selectedCategory) {
            filtered = questionsData.filter(q => q.category === selectedCategory);
        }

        if (searchTerm) {
            filtered = filtered.filter(q => 
                q.question.toLowerCase().includes(searchTerm) || 
                q.options.some(opt => opt.toLowerCase().includes(searchTerm))
            );
        }

        currentQuestions = filtered;
        currentPage = 1;
        render();
      }

      // --- Event Listeners ---
      categoryFilter.addEventListener('change', updateQuestionList);
      searchBar.addEventListener('input', updateQuestionList);

      modeAllBtn.addEventListener('click', () => {
        appMode = 'all';
        modeAllBtn.classList.add('active');
        modeQuizBtn.classList.remove('active');
        quizOptions.classList.add('hidden');
        updateQuestionList();
      });

      modeQuizBtn.addEventListener('click', () => {
        appMode = 'quiz';
        modeQuizBtn.classList.add('active');
        modeAllBtn.classList.remove('active');
        quizOptions.classList.remove('hidden');
      });

      startQuizBtn.addEventListener('click', () => {
        const selectedCategory = categoryFilter.value;
        if (!selectedCategory || selectedCategory === 'Flagged for Review') {
            alert('Please select a subject to start a quiz.');
            return;
        }
        let quizPool = questionsData.filter(q => q.category === selectedCategory);
        // Fisher-Yates shuffle
        for (let i = quizPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [quizPool[i], quizPool[j]] = [quizPool[j], quizPool[i]];
        }
        const count = parseInt(quizCountInput.value, 10);
        currentQuestions = quizPool.slice(0, count);
        currentPage = 1;
        render();
      });
      
      paginationContainer.addEventListener('click', (e) => {
          const targetId = e.target.id;
          if (targetId === 'next-btn' && !e.target.disabled) currentPage++;
          else if (targetId === 'prev-btn' && !e.target.disabled) currentPage--;
          else return;
          
          render();
          window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      quizContainer.addEventListener('click', (e) => {
        const showAnswerBtn = e.target.closest('.show-answer-btn');
        const flagBtn = e.target.closest('.flag-btn');

        if (showAnswerBtn) {
          const answerDiv = showAnswerBtn.nextElementSibling;
          const isHidden = answerDiv.style.display === 'none' || answerDiv.style.display === '';
          answerDiv.style.display = isHidden ? 'block' : 'none';
          showAnswerBtn.textContent = isHidden ? 'Hide Answer' : 'Show Answer';
        }

        if (flagBtn) {
          const card = flagBtn.closest('.question-card');
          const questionId = card.dataset.questionId;
          
          if (isFlagged(questionId)) {
            flaggedQuestions = flaggedQuestions.filter(id => id !== questionId);
            flagBtn.classList.remove('flagged');
          } else {
            flaggedQuestions.push(questionId);
            flagBtn.classList.add('flagged');
          }
          saveFlagged();
        }
      });
      
      // --- Initial Page Load ---
      setupFilters();
    });
  `;
}

// Run the script
main();

// build.js - Final Version with Aesthetic Overhaul

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
                <div class="toolbar-left">
                    <button id="show-all-answers-btn" class="toolbar-btn">Show All Answers</button>
                </div>
                <div class="toolbar-right">
                    <label for="questions-per-page">Questions per page:</label>
                    <select id="questions-per-page">
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="75">75</option>
                        <option value="100">100</option>
                    </select>
                </div>
            </div>

            <main id="quiz-container">
                <div class="initial-prompt">
                    <h2>Welcome!</h2>
                    <p>Please select a subject from the dropdown menu above to begin.</p>
                </div>
            </main>
            <div id="pagination-container"></div>
            <footer class="site-footer-main">
                <p>MedPollaplis Study Tool</p>
            </footer>
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
      --background-color: #f8f9fa;
      --card-background: #ffffff;
      --text-color: #495057;
      --heading-color: #212529;
      --primary-color: #4c6ef5;
      --primary-hover: #4263eb;
      --light-gray: #dee2e6;
      --accent-color: #12b886;
      --flag-color: #fcc419;
      --border-radius: 12px;
      --shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
      --font-primary: 'Inter', sans-serif;
      --font-secondary: 'Roboto Slab', serif;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    body {
      background-color: var(--background-color);
      color: var(--text-color);
      font-family: var(--font-primary);
      margin: 0;
      line-height: 1.7;
    }
    .app-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .site-header {
      background-color: var(--card-background);
      padding: 1.25rem 2.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--light-gray);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .logo {
      font-family: var(--font-secondary);
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--heading-color);
    }
    .controls-container {
        display: flex;
        align-items: center;
        gap: 1.5rem;
    }
    .search-wrapper {
        position: relative;
    }
    #search-bar {
        padding: 0.75rem 1.25rem;
        border-radius: 8px;
        border: 1px solid var(--light-gray);
        font-size: 1rem;
        min-width: 300px;
        transition: all 0.2s ease-in-out;
    }
    #search-bar:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(76, 110, 245, 0.2);
    }
    #category-filter {
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      border: 1px solid var(--light-gray);
      font-size: 1rem;
      font-family: var(--font-primary);
      min-width: 280px;
      background-color: #fff;
    }
    .toolbar {
        background-color: #f1f3f5;
        padding: 0.75rem 2.5rem;
        border-bottom: 1px solid var(--light-gray);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
    }
    .toolbar-btn {
        padding: 0.6rem 1.2rem;
        border: 1px solid var(--light-gray);
        background-color: var(--card-background);
        color: #495057;
        font-weight: 500;
        cursor: pointer;
        border-radius: 8px;
        transition: all 0.2s;
    }
    .toolbar-btn:hover {
        background-color: #e9ecef;
        border-color: #ced4da;
    }
    .toolbar-right {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: var(--heading-color);
    }
    #questions-per-page {
        padding: 0.6rem;
        border-radius: 8px;
        border: 1px solid var(--light-gray);
    }
    main {
      flex: 1;
      max-width: 900px;
      width: 100%;
      margin: 0 auto;
      padding: 2.5rem;
      box-sizing: border-box;
    }
    .initial-prompt {
        text-align: center;
        color: #868e96;
        padding: 5rem 0;
    }
    .initial-prompt h2 {
        font-family: var(--font-secondary);
        color: var(--heading-color);
        font-size: 2rem;
    }
    .question-card {
      background-color: var(--card-background);
      border-radius: var(--border-radius);
      padding: 2.5rem;
      margin-bottom: 2rem;
      box-shadow: var(--shadow);
      position: relative;
      animation: fadeIn 0.5s ease-out forwards;
    }
    .flag-btn {
        position: absolute;
        top: 1.5rem;
        right: 1.5rem;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.5rem;
    }
    .flag-btn svg {
        width: 24px;
        height: 24px;
        stroke: #adb5bd;
        fill: none;
        transition: all 0.2s;
    }
    .flag-btn:hover svg {
        stroke: var(--flag-color);
        transform: scale(1.1);
    }
    .flag-btn.flagged svg {
        stroke: var(--flag-color);
        fill: var(--flag-color);
    }
    .question-text {
      font-size: 1.4rem;
      font-weight: 700;
      font-family: var(--font-secondary);
      color: var(--heading-color);
      margin: 0 0 2rem 0;
      line-height: 1.5;
      padding-right: 2.5rem; /* space for flag */
    }
    .options-list {
      list-style: none;
      padding: 0;
      margin: 0 0 2rem 0;
    }
    .options-list li {
      margin-bottom: 1rem;
      line-height: 1.7;
      padding-left: 1.25rem;
      border-left: 4px solid var(--light-gray);
    }
    .show-answer-btn {
        background-color: var(--primary-color);
        color: white;
        border: none;
        padding: 0.8rem 1.8rem;
        font-size: 1rem;
        font-weight: 700;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .show-answer-btn:hover {
        background-color: var(--primary-hover);
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(76, 110, 245, 0.3);
    }
    .answer-reveal {
      background-color: #f1f3f5;
      border-left: 4px solid var(--accent-color);
      padding: 1.5rem;
      margin-top: 2rem;
      border-radius: 0 8px 8px 0;
      display: none;
    }
    .answer-reveal p { margin: 0; line-height: 1.7; }
    .answer-reveal p:first-child { font-weight: bold; margin-bottom: 0.75rem; color: var(--heading-color); }
    #pagination-container {
        padding: 2.5rem;
        text-align: center;
    }
    .pagination-controls button {
        background-color: var(--card-background);
        color: var(--primary-color);
        border: 1px solid var(--light-gray);
        padding: 0.75rem 1.5rem;
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
        border-color: var(--primary-color);
    }
    .pagination-controls button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    #page-info {
        display: inline-block;
        min-width: 120px;
        font-weight: 500;
        color: #5e6c84;
    }
    .site-footer-main {
        background-color: #343a40;
        color: #f8f9fa;
        text-align: center;
        padding: 1.5rem;
        margin-top: 2rem;
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
      const showAllAnswersBtn = document.getElementById('show-all-answers-btn');
      const questionsPerPageSelect = document.getElementById('questions-per-page');

      // --- State Management ---
      let currentQuestions = [];
      let currentPage = 1;
      let questionsPerPage = 25;
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
              <path d="M5.27292 3.11331C5.1983 2.96937 5.03137 2.875 4.85292 2.875H4.5C4.22386 2.875 4 3.09886 4 3.375V21L5.426 19.911C6.012 19.475 6.76 19.25 7.5 19.25C8.24 19.25 8.988 19.475 9.574 19.911L12 21.822L14.426 19.911C15.012 19.475 15.76 19.25 16.5 19.25C17.24 19.25 17.988 19.475 18.574 19.911L20 21V3.375C20 3.09886 19.7761 2.875 19.5 2.875H19.1471C18.9686 2.875 18.8017 2.96937 18.7271 3.11331L16.5 7.625L14.2729 3.11331C14.1983 2.96937 14.0314 2.875 13.8529 2.875H10.1471C9.96863 2.875 9.8017 2.96937 9.72708 3.11331L7.5 7.625L5.27292 3.11331Z"/>
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
      questionsPerPageSelect.addEventListener('change', (e) => {
        questionsPerPage = parseInt(e.target.value, 10);
        currentPage = 1;
        render();
      });

      showAllAnswersBtn.addEventListener('click', () => {
        const isShowingAll = showAllAnswersBtn.textContent === 'Hide All Answers';
        quizContainer.querySelectorAll('.question-card').forEach(card => {
            const btn = card.querySelector('.show-answer-btn');
            const answerDiv = card.querySelector('.answer-reveal');
            answerDiv.style.display = isShowingAll ? 'none' : 'block';
            btn.textContent = isShowingAll ? 'Show Answer' : 'Hide Answer';
        });
        showAllAnswersBtn.textContent = isShowingAll ? 'Show All Answers' : 'Hide All Answers';
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

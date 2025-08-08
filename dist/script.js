
    document.addEventListener('DOMContentLoaded', () => {
      const quizContainer = document.getElementById('quiz-container');
      const categoryFilter = document.getElementById('category-filter');
      const paginationContainer = document.getElementById('pagination-container');
      
      let allQuestions = [];
      let currentPage = 1;
      const questionsPerPage = 20;

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
          
          const optionsHtml = q.options.map(opt => `<li>${opt}</li>`).join('');
          
          const answerHtml = `
            <p>Correct Answer(s): ${q.correctAnswers.join(', ')}</p>
            ${q.justification ? `<p>${q.justification}</p>` : ''}
          `;

          card.innerHTML = `
            <p class="question-text">${q.question}</p>
            <ul class="options-list">${optionsHtml}</ul>
            <button class="show-answer-btn">Show Answer</button>
            <div class="answer-reveal">${answerHtml}</div>
          `;

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
          pageInfo.textContent = `Page ${currentPage} of ${pageCount}`;

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
  
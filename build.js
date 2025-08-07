// Import necessary libraries
const { Client } = require("@notionhq/client");
const { config } = require("dotenv");
const fs = require("fs");

// Load environment variables from .env file
config();

// Initialize the Notion client
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

// Main function to fetch data and build the site
async function main() {
  try {
    console.log("Fetching questions from Notion...");
    const response = await notion.databases.query({
      database_id: databaseId,
    });

    const questions = response.results.map(page => {
      // Helper functions to safely get data from different Notion property types
      const getPlainText = (property) => property?.[0]?.plain_text || null;
      const getSelectName = (property) => property?.select?.name || null;

      // This part is new: We assemble the options from separate columns
      const options = [];
      const optionPrefixes = ['Α.', 'Β.', 'Γ.', 'Δ.', 'Ε.'];
      const optionColumns = ['Επιλογή Α', 'Επιλογή Β', 'Επιλογή Γ', 'Επιλογή Δ', 'Επιλογή Ε'];

      for (let i = 0; i < optionColumns.length; i++) {
        const optionText = getPlainText(page.properties[optionColumns[i]]?.rich_text);
        if (optionText) { // Only add the option if the cell is not empty
          options.push(`${optionPrefixes[i]} ${optionText}`);
        }
      }
      
      // We return a clean object for each question
      return {
        // IMPORTANT: If your category/subject column has a different name, change "Κλινική Ανοσολογία" here.
        // It should match the name of the column you use for grouping (e.g., a "Select" property).
        category: getSelectName(page.properties["Κλινική Ανοσολογία"]),
        question: getPlainText(page.properties["Ερωτήσεις Πολλαπλής Επιλογής"]?.title),
        correctAnswer: getSelectName(page.properties["Σωστή Απάντηση"]),
        options: options,
      };
    }).filter(q => q.question); // Filter out any empty rows

    console.log(`Found ${questions.length} questions.`);

    // Generate HTML content using the new structure
    const htmlContent = generateHTML(questions);

    // Create a 'dist' directory if it doesn't exist
    if (!fs.existsSync("dist")) {
      fs.mkdirSync("dist");
    }

    // Write the HTML file
    fs.writeFileSync("dist/index.html", htmlContent);
    console.log("✅ Website built successfully in the 'dist' folder!");

  } catch (error) {
    console.error("❌ Error building website:", error);
  }
}

// Function to generate the final HTML from the questions data
function generateHTML(questions) {
  // First, we group the questions by their category
  const questionsByCategory = questions.reduce((acc, q) => {
    const category = q.category || "Uncategorized"; // Use "Uncategorized" if no category is set
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(q);
    return acc;
  }, {});

  // Then, we build the HTML for each category section
  let allCategoriesHtml = Object.entries(questionsByCategory).map(([category, questionsInSection]) => {
    const questionCards = questionsInSection.map(q => `
      <div class="card">
        <p class="question-text">${q.question}</p>
        <ul class="options">
          ${q.options.map(opt => `<li>${opt}</li>`).join('')}
        </ul>
        ${q.correctAnswer ? `<div class="answer-box">${q.correctAnswer}</div>` : ''}
      </div>
    `).join('');

    return `
      <div class="category-section">
        <h1 class="category-title">${category}</h1>
        ${questionCards}
      </div>
    `;
  }).join('');

  // This is the full HTML template with new CSS to match your design
  return `
    <!DOCTYPE html>
    <html lang="el">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MedPollaplis - Medical Questions</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        body {
          background-color: #191919;
          color: #e3e3e3;
          font-family: 'Roboto', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 2rem;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        .category-title {
          font-size: 1.5rem;
          color: #ffffff;
          border-bottom: 1px solid #3a3a3a;
          padding-bottom: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .card {
          background-color: #2d2d2d;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .question-text {
          font-size: 1.1rem;
          font-weight: 500;
          line-height: 1.5;
          margin: 0 0 1rem 0;
        }
        .options {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .options li {
          margin-bottom: 0.5rem;
          line-height: 1.6;
        }
        .answer-box {
          display: inline-block;
          background-color: #404040;
          border: 1px solid #555;
          border-radius: 6px;
          padding: 0.25rem 0.75rem;
          margin-top: 1rem;
          font-weight: 700;
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${allCategoriesHtml}
      </div>
    </body>
    </html>
  `;
}

// Run the main function
main();
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
      const getPlainText = (property) => property?.[0]?.plain_text || null;
      const getSelectName = (property) => property?.select?.name || null;

      const options = [];
      const optionPrefixes = ['Α.', 'Β.', 'Γ.', 'Δ.', 'Ε.'];
      const optionColumns = ['Επιλογή Α', 'Επιλογή Β', 'Επιλογή Γ', 'Επιλογή Δ', 'Επιλογή Ε'];

      for (let i = 0; i < optionColumns.length; i++) {
        const optionText = getPlainText(page.properties[optionColumns[i]]?.rich_text);
        if (optionText) {
          options.push(`${optionPrefixes[i]} ${optionText}`);
        }
      }
      
      return {
        question: getPlainText(page.properties["Ερωτήσεις Πολλαπλής Επιλογής"]?.title),
        correctAnswer: getSelectName(page.properties["Σωστή Απάντηση"]),
        options: options,
      };
    }).filter(q => q.question); // Only keep rows that have a question text

    if (questions.length === 0) {
      console.warn("⚠️ Warning: No questions found after filtering. Check your Notion column names in build.js!");
    } else {
      console.log(`Found and processed ${questions.length} questions.`);
    }

    // Generate HTML content
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

// Function to generate the final HTML (simplified without categories)
function generateHTML(questions) {
  const questionCards = questions.map(q => `
    <div class="card">
      <p class="question-text">${q.question}</p>
      <ul class="options">
        ${q.options.map(opt => `<li>${opt}</li>`).join('')}
      </ul>
      ${q.correctAnswer ? `<div class="answer-box">${q.correctAnswer}</div>` : ''}
    </div>
  `).join('');

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
        body { background-color: #191919; color: #e3e3e3; font-family: 'Roboto', sans-serif; margin: 0; padding: 2rem; }
        .container { max-width: 800px; margin: 0 auto; }
        .page-title { font-size: 1.8rem; text-align: center; margin-bottom: 2rem; }
        .card { background-color: #2d2d2d; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .question-text { font-size: 1.1rem; font-weight: 500; line-height: 1.5; margin: 0 0 1rem 0; }
        .options { list-style: none; padding: 0; margin: 0; }
        .options li { margin-bottom: 0.5rem; line-height: 1.6; }
        .answer-box { display: inline-block; background-color: #404040; border: 1px solid #555; border-radius: 6px; padding: 0.25rem 0.75rem; margin-top: 1rem; font-weight: 700; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 class="page-title">MedPollaplis Questions</h1>
        ${questionCards}
      </div>
    </body>
    </html>
  `;
}

main();
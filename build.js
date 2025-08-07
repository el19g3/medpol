// Part 1: These lines are like listing the tools we need from the toolbox.
// We are telling the program we need the Notion client and the 'dotenv' tool.
const { Client } = require("@notionhq/client");
const { config } = require("dotenv");
const fs = require("fs"); // 'fs' is a built-in tool for working with files.

// This line tells our program to open the '.env' file and load our secrets.
config();

// Part 2: Here we set up our connection to Notion.
// It creates a new Notion client and gives it the secret key for authentication.
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

// Part 3: This is the main task for our "robot".
// We define a function that will fetch the data and build the website.
async function buildSite() {
  console.log("Starting... Going to Notion to get the questions.");

  try {
    // This command tells our Notion client to get all the items from our database.
    const response = await notion.databases.query({
      database_id: databaseId,
    });
    
    // Notion data is a bit complicated, so this next part cleans it up for us.
    const questions = response.results.map(page => {
      // This is a small helper to safely get text out of a Notion property.
      const getPlainText = (property) => property?.[0]?.plain_text || "Not Available";

      // We create a simple, clean object for each question.
      return {
        question: getPlainText(page.properties.Question?.title),
        correctAnswer: getPlainText(page.properties["Correct Answer"]?.rich_text),
        options: page.properties.Answers?.multi_select.map(opt => opt.name) || [],
      };
    });

    console.log(`Success! Found ${questions.length} questions.`);
    console.log("Now, building the HTML file...");

    // Part 4: Now we generate the HTML for the webpage.
    // HTML is the language that web browsers use to display content.
    const questionCardsHTML = questions.map(q => `
      <div class="card">
        <h2>${q.question}</h2>
        <ul class="options">
          ${q.options.map(opt => `<li>${opt}</li>`).join('')}
        </ul>
        <details>
          <summary>Show Answer</summary>
          <p><strong>Correct Answer:</strong> ${q.correctAnswer}</p>
        </details>
      </div>
    `).join('');

    // This is the full template for our final webpage.
    // It includes some basic CSS for styling to make it look nice.
    const finalHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MedPollaplis - Medical Questions</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f0f2f5; color: #1c1e21; margin: 0; padding: 20px; }
          .container { max-width: 800px; margin: 0 auto; }
          h1 { color: #333; text-align: center; margin-bottom: 40px; }
          .card { background: #ffffff; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
          .card h2 { margin-top: 0; font-size: 1.25em; }
          .options { list-style: none; padding: 0; margin: 16px 0; }
          .options li { background-color: #e7f3ff; border: 1px solid #cce0ff; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
          details { margin-top: 16px; }
          summary { cursor: pointer; font-weight: 600; color: #007bff; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>MedPollaplis Questions</h1>
          ${questionCardsHTML}
        </div>
      </body>
      </html>
    `;

    // Part 5: Save the final product.
    // This creates a folder called 'dist' (for "distribution") and saves our HTML file inside it.
    if (!fs.existsSync("dist")) {
      fs.mkdirSync("dist");
    }
    fs.writeFileSync("dist/index.html", finalHtml);

    console.log("All done! Your website has been created in the 'dist' folder.");

  } catch (error) {
    console.error("Oh no! Something went wrong:", error.message);
  }
}

// This final line runs the main task we defined above.
buildSite();
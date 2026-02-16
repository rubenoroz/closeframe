const mammoth = require("mammoth");
const fs = require("fs");
const path = require("path");

const legalDocsDir = "/Users/univa/Documents/TuSet/Documentos Closerlens";
const outputDir = "app/legal/content";

fs.mkdirSync(outputDir, { recursive: true });

const files = fs.readdirSync(legalDocsDir).filter(file => file.endsWith(".docx"));

files.forEach(async (file) => {
    const filePath = path.join(legalDocsDir, file);
    const result = await mammoth.convertToMarkdown({ path: filePath });
    const outputFilename = file.replace(".docx", ".md").toLowerCase();
    const outputPath = path.join(outputDir, outputFilename);

    fs.writeFileSync(outputPath, result.value);
    console.log(`Converted ${file} to ${outputFilename}`);
});

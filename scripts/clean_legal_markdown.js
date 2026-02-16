const fs = require('fs');
const path = require('path');

const contentDir = path.join(process.cwd(), 'app/legal/content');

if (!fs.existsSync(contentDir)) {
    console.error('Content directory not found:', contentDir);
    process.exit(1);
}

const files = fs.readdirSync(contentDir).filter(file => file.endsWith('.md'));

files.forEach(file => {
    const filePath = path.join(contentDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // 1. Remove backslashes before special characters
    content = content.replace(/\\([().])/g, '$1');

    // 2. Fix double underscores used for bolding, changing them to double asterisks for better compatibility
    // Sometimes it appears as "__Text: __Description", we want "**Text:** Description"

    // Replace "__Text__" with "**Text**"
    content = content.replace(/__(.*?)__/g, '**$1**');

    // Handle odd cases where it might be "__Text: __" -> "**Text:** "
    content = content.replace(/__ (.*?) __/g, '**$1**');

    // Clean up remaining isolated underscores if they look like artifacts
    // content = content.replace(/__/g, ''); // Be careful with this one

    // 3. Fix Headers: "# 1. DEFINICIONES" -> "## 1. Definiciones" (Auto-capitalization fix might be too aggressive, let's just fix the spacing)

    // 4. General cleanup
    content = content.replace(/\n\n\n+/g, '\n\n'); // Max 2 newlines

    fs.writeFileSync(filePath, content);
    console.log(`Cleaned ${file}`);
});

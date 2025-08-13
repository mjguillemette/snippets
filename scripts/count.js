// count-components.js
const fs = require('fs/promises');
const path = require('path');

// --- Configuration ---
const projectRoot = '.'; // Current directory
const filesToScan = ['.jsx', '.tsx', '.js']; // File extensions to look for
const folderToIgnore = 'node_modules';
const targetPackage = '@nextui-org/react';
// --------------------

const componentCounts = new Map();

async function analyzeFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Regex to find imports from the target package. It's the same logic as the PowerShell script.
    const importRegex = new RegExp(`import\\s+(.+?)\\s+from\\s+['"]${targetPackage}['"]`, 'g');
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importSpecifiers = match[1];

      // Clean up aliases and braces to get a simple list of components
      const cleanedSpecifiers = importSpecifiers
        .replace(/\s+as\s+[\w\d\$_]+/g, '') // Remove 'as Alias'
        .replace(/\{|\}/g, ','); // Replace braces with commas

      const components = cleanedSpecifiers
        .split(',')
        .map(c => c.trim())
        .filter(c => c); // Filter out empty strings

      // Count each component
      for (const component of components) {
        componentCounts.set(component, (componentCounts.get(component) || 0) + 1);
      }
    }
  } catch (err) {
    console.error(`Could not read file ${filePath}: ${err.message}`);
  }
}

async function walkDirectory(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      if (file.name !== folderToIgnore) {
        await walkDirectory(fullPath);
      }
    } else if (filesToScan.includes(path.extname(file.name))) {
      await analyzeFile(fullPath);
    }
  }
}

async function main() {
  console.log('🔍 Starting analysis...');
  await walkDirectory(projectRoot);
  
  if (componentCounts.size === 0) {
    console.log('No NextUI components found.');
    return;
  }
  
  // Sort results by count
  const sortedComponents = [...componentCounts.entries()].sort((a, b) => b[1] - a[1]);
  
  console.log('\n📊 NextUI Component Usage Report:');
  console.table(Object.fromEntries(sortedComponents));
}

main();
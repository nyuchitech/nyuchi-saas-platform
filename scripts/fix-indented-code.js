#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Fix indented code blocks with spacing issues
 */
function fixIndentedCodeBlocks(content) {
  let fixed = content;
  
  // Fix indented code blocks - add blank lines around them when inside lists
  const lines = fixed.split('\n');
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || '';
    const prevLine = lines[i - 1] || '';
    
    // If this is an indented code block start
    if (line.match(/^\s{3,}```/)) {
      // Add blank line before if previous line isn't blank
      if (prevLine.trim() !== '') {
        result.push('');
      }
    }
    
    result.push(line);
    
    // If this is an indented code block end
    if (line.match(/^\s{3,}```/) && !line.match(/```\w/)) {
      // Add blank line after if next line isn't blank
      if (nextLine.trim() !== '') {
        result.push('');
      }
    }
  }
  
  return result.join('\n');
}

/**
 * Process markdown files for indented code blocks
 */
function processFile(filePath) {
  try {
    console.log(`Fixing indented code blocks: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    const fixed = fixIndentedCodeBlocks(content);
    
    if (content !== fixed) {
      fs.writeFileSync(filePath, fixed, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
    } else {
      console.log(`🔄 No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Files to fix
const markdownFiles = [
  'docs/ENVIRONMENT_SETUP.md',
  'SETUP_COMPLETE.md'
];

console.log('🔧 Fixing indented code blocks...\n');

markdownFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    processFile(fullPath);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('\n🎉 Indented code block fixing complete!');

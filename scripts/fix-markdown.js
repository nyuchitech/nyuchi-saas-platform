#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Fix common markdown linting issues
 */
function fixMarkdown(content) {
  let fixed = content;
  
  // Fix MD026 - Remove trailing punctuation from headings
  fixed = fixed.replace(/^(#{1,6}\s+.*)[!.](\s*)$/gm, '$1$2');
  
  // Fix MD012 - Remove multiple consecutive blank lines (max 1)
  fixed = fixed.replace(/\n\s*\n\s*\n/g, '\n\n');
  fixed = fixed.replace(/\n{3,}/g, '\n\n');
  
  // Split into lines for better processing
  const lines = fixed.split('\n');
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || '';
    const prevLine = lines[i - 1] || '';
    
    // Fix MD022 - Add blank lines around headings
    if (line.match(/^#{1,6}\s+/)) {
      // Add blank line before heading if previous line isn't blank
      if (prevLine.trim() !== '' && result.length > 0) {
        result.push('');
      }
      result.push(line);
      // Add blank line after heading if next line isn't blank
      if (nextLine.trim() !== '' && nextLine !== undefined) {
        result.push('');
      }
    }
    // Fix MD032 - Add blank lines around lists
    else if (line.match(/^[-*+]\s+/) || line.match(/^\d+\.\s+/)) {
      // Add blank line before list if previous line isn't blank
      if (prevLine.trim() !== '' && !prevLine.match(/^[-*+]\s+/) && !prevLine.match(/^\d+\.\s+/) && result.length > 0) {
        result.push('');
      }
      result.push(line);
      // Add blank line after list if next line isn't blank and isn't another list item
      if (nextLine.trim() !== '' && !nextLine.match(/^[-*+]\s+/) && !nextLine.match(/^\d+\.\s+/) && nextLine !== undefined) {
        result.push('');
      }
    }
    // Fix MD031 - Add blank lines around fenced code blocks
    else if (line.match(/^```/)) {
      // Add blank line before code block if previous line isn't blank
      if (prevLine.trim() !== '' && result.length > 0) {
        result.push('');
      }
      result.push(line);
      // Add blank line after code block if next line isn't blank
      if (nextLine.trim() !== '' && nextLine !== undefined && !line.includes('```') !== nextLine.includes('```')) {
        result.push('');
      }
    }
    else {
      result.push(line);
    }
  }
  
  fixed = result.join('\n');
  
  // Fix MD040 - Add language to fenced code blocks without language
  fixed = fixed.replace(/^```\s*$/gm, '```text');
  
  // Fix MD034 - Wrap bare URLs
  fixed = fixed.replace(/(\s)(http[s]?:\/\/[^\s)]+)(\s|$)/g, '$1<$2>$3');
  
  // Fix MD009 - Remove trailing spaces
  fixed = fixed.replace(/[ \t]+$/gm, '');
  
  // Final cleanup - ensure no more than one consecutive blank line
  fixed = fixed.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return fixed;
}

/**
 * Process markdown files
 */
function processFile(filePath) {
  try {
    console.log(`Fixing: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    const fixed = fixMarkdown(content);
    
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
  'SETUP_COMPLETE.md',
  'SETUP_VERIFICATION.md', 
  'SUPABASE_SETUP_COMPLETE.md',
  'DATABASE_SETUP_COMPLETE.md',
  'SECURITY_UPDATE_SUMMARY.md'
];

console.log('🔧 Fixing markdown files...\n');

markdownFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    processFile(fullPath);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('\n🎉 Markdown fixing complete!');

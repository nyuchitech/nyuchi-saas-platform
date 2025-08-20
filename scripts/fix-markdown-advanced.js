#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Advanced markdown fixer that handles all common issues
 */
function fixMarkdown(content) {
  // Split content into lines for line-by-line processing
  const lines = content.split('\n');
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];
    const prevLine = lines[i - 1];
    
    // Skip if this line is empty and the previous line was also empty (MD012)
    if (line.trim() === '' && prevLine && prevLine.trim() === '') {
      continue;
    }
    
    // Handle headings (MD022)
    if (line.match(/^#{1,6}\s+/)) {
      // Remove trailing punctuation from headings (MD026)
      let cleanedLine = line.replace(/[!.]+$/, '');
      
      // Add blank line before heading if needed
      if (result.length > 0 && prevLine && prevLine.trim() !== '') {
        result.push('');
      }
      
      result.push(cleanedLine);
      
      // Add blank line after heading if needed
      if (nextLine && nextLine.trim() !== '') {
        result.push('');
      }
      continue;
    }
    
    // Handle list items (MD032)
    if (line.match(/^[-*+]\s+/) || line.match(/^\d+\.\s+/)) {
      const isFirstListItem = !prevLine || (!prevLine.match(/^[-*+]\s+/) && !prevLine.match(/^\d+\.\s+/));
      const isLastListItem = !nextLine || (!nextLine.match(/^[-*+]\s+/) && !nextLine.match(/^\d+\.\s+/));
      
      // Add blank line before first list item
      if (isFirstListItem && result.length > 0 && prevLine && prevLine.trim() !== '') {
        result.push('');
      }
      
      result.push(line);
      
      // Add blank line after last list item
      if (isLastListItem && nextLine && nextLine.trim() !== '') {
        result.push('');
      }
      continue;
    }
    
    // Handle fenced code blocks (MD031, MD040)
    if (line.match(/^```/)) {
      // Add language if missing (MD040)
      let codeBlockLine = line;
      if (line === '```') {
        codeBlockLine = '```text';
      }
      
      // Add blank line before code block if needed
      if (result.length > 0 && prevLine && prevLine.trim() !== '') {
        result.push('');
      }
      
      result.push(codeBlockLine);
      
      // If this is a closing code block, add blank line after
      if (line === '```' && nextLine && nextLine.trim() !== '') {
        result.push('');
      }
      continue;
    }
    
    // Handle indented code blocks within lists (MD031)
    if (line.match(/^\s{3,}```/)) {
      // Add blank line before indented code block if needed
      if (result.length > 0 && prevLine && prevLine.trim() !== '' && !prevLine.match(/^\s*$/)) {
        result.push('');
      }
      
      result.push(line);
      
      // Add blank line after indented code block if needed
      if (nextLine && nextLine.trim() !== '' && !nextLine.match(/^\s*$/)) {
        result.push('');
      }
      continue;
    }
    
    // Regular line processing
    let processedLine = line;
    
    // Fix bare URLs (MD034)
    processedLine = processedLine.replace(/(\s|^)(https?:\/\/[^\s)]+)(\s|$)/g, '$1<$2>$3');
    
    // Remove trailing spaces (MD009)
    processedLine = processedLine.replace(/[ \t]+$/, '');
    
    result.push(processedLine);
  }
  
  // Join lines and do final cleanup
  let fixed = result.join('\n');
  
  // Final pass to ensure no triple+ newlines
  fixed = fixed.replace(/\n{3,}/g, '\n\n');
  
  // Clean up any remaining issues
  fixed = fixed.trim() + '\n';
  
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
  'SECURITY_UPDATE_SUMMARY.md',
  'ALL_MARKDOWN_PROBLEMS_RESOLVED.md',
  'MARKDOWN_FIXES_COMPLETE.md',
  'TYPESCRIPT_ERRORS_RESOLVED.md'
];

console.log('🔧 Advanced markdown fixing...\n');

markdownFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    processFile(fullPath);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('\n🎉 Advanced markdown fixing complete!');

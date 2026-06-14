// admin_script_replacement.js — Script to replace the admin.html script block
const fs = require('fs');
const path = require('path');

const adminPath = path.join('c:\\Users\\ARIKITHOTA HEMA\\Desktop\\manner the way of style\\admin.html');
let content = fs.readFileSync(adminPath, 'utf8');

const lines = content.split('\n');

// Find the line index of the opening <script> (line 684, 0-indexed = 683)
const scriptStartIdx = 683;

// Find the closing </script> for this block
let scriptEndIdx = -1;
for (let i = scriptStartIdx + 1; i < lines.length; i++) {
  if (lines[i].trim() === '</script>') {
    // Check if this is the main script block (not the header one)
    if (i > 800) { // Main block should be past line 800
      scriptEndIdx = i;
      break;
    }
  }
}

console.log('Script block:', scriptStartIdx + 1, 'to', scriptEndIdx + 1);
console.log('Line at start:', lines[scriptStartIdx]);
console.log('Line at end:', lines[scriptEndIdx]);

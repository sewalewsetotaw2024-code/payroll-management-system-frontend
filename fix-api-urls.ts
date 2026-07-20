import * as fs from 'fs';
import * as path from 'path';

const frontendDir = path.join('d:', 'Render Deployment', 'payroll-management-system-frontend', 'src');

function walk(dir: string, callback: (filepath: string) => void) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walk(filepath, callback);
    } else {
      callback(filepath);
    }
  }
}

let modifiedCount = 0;

walk(frontendDir, (filepath) => {
  if (!filepath.endsWith('.ts') && !filepath.endsWith('.tsx')) return;
  
  let content = fs.readFileSync(filepath, 'utf8');
  let changed = false;

  // Handle authApi.ts
  if (filepath.endsWith('authApi.ts')) {
    if (content.includes("import.meta.env.VITE_AUTH_API_URL || '/api/v1'")) {
      content = content.replace(
        "import.meta.env.VITE_AUTH_API_URL || '/api/v1'",
        "import.meta.env.VITE_AUTH_API_URL || (import.meta.env.PROD ? 'https://adiu-okr.onrender.com/api/v1' : '/api/v1')"
      );
      changed = true;
    }
  } 
  else {
    // For all other files, replace '/api/v1' with `import.meta.env.VITE_API_URL || '/api/v1'`
    // but only if it's an exact match or part of a string
    
    // Replace hardcoded baseURLs
    const regex1 = /baseURL:\s*['"]\/api\/v1([^'"]*)['"]/g;
    if (regex1.test(content)) {
      content = content.replace(regex1, "baseURL: `${import.meta.env.VITE_API_URL || '/api/v1'}$1`");
      changed = true;
    }

    const regex2 = /baseURL=\s*['"]\/api\/v1([^'"]*)['"]/g; // like baseURL="/api/v1..."
    if (regex2.test(content)) {
        content = content.replace(regex2, 'baseURL: `${import.meta.env.VITE_API_URL || \'/api/v1\'}$1`');
        changed = true;
    }
    
    // Replace fetch paths
    const regex3 = /fetch\(\s*['"]\/api\/v1([^'"]*)['"]/g;
    if (regex3.test(content)) {
      content = content.replace(regex3, "fetch(`${import.meta.env.VITE_API_URL || '/api/v1'}$1`");
      changed = true;
    }

    // Replace template literals: `/api/v1/something/${id}`
    const regex4 = /`\/api\/v1([^`]*)`/g;
    if (regex4.test(content)) {
      content = content.replace(regex4, "`${import.meta.env.VITE_API_URL || '/api/v1'}$1`");
      changed = true;
    }

    // Replace standalone const API_BASE_URL = '/api/v1...';
    const regex5 = /=\s*['"]\/api\/v1([^'"]*)['"];/g;
    if (regex5.test(content)) {
      content = content.replace(regex5, "= `${import.meta.env.VITE_API_URL || '/api/v1'}$1`;");
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`Modified ${filepath}`);
    modifiedCount++;
  }
});

console.log(`Modified ${modifiedCount} files.`);

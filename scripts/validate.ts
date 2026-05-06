#!/usr/bin/env node

/**
 * Validation Script - Checks that the recruitment platform is properly configured
 * Run with: npx tsx scripts/validate.ts
 */

import fs from 'fs';
import path from 'path';

interface ValidationResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: ValidationResult[] = [];

// Check 1: Essential files exist
const essentialFiles = [
  'src/App.tsx',
  'src/pages/Jobs.tsx',
  'src/pages/auth/Login.tsx',
  'src/pages/auth/Signup.tsx',
  'src/pages/dashboard/ApplicantDashboard.tsx',
  'src/pages/dashboard/RecruiterDashboard.tsx',
  'src/pages/dashboard/AdminDashboard.tsx',
  'api/auth/login.ts',
  'api/auth/register.ts',
  'api/auth/me.ts',
  'vercel.json',
  'package.json',
];

essentialFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    results.push({
      name: `File exists: ${file}`,
      status: 'pass',
      message: '✓',
    });
  } else {
    results.push({
      name: `File exists: ${file}`,
      status: 'fail',
      message: '✗ Missing',
    });
  }
});

// Check 2: dist/ folder exists
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  const hasIndex = fs.existsSync(path.join(distPath, 'index.html'));
  results.push({
    name: 'Build output (dist/)',
    status: hasIndex ? 'pass' : 'fail',
    message: hasIndex ? '✓ index.html found' : '✗ index.html missing',
  });
} else {
  results.push({
    name: 'Build output (dist/)',
    status: 'warn',
    message: '⚠ dist/ not found - run "npm run build"',
  });
}

// Check 3: package.json has required scripts
const packageJson = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
);

const requiredScripts = ['build', 'dev', 'db:migrate'];
requiredScripts.forEach(script => {
  if (packageJson.scripts && packageJson.scripts[script]) {
    results.push({
      name: `NPM script: ${script}`,
      status: 'pass',
      message: `✓ "${packageJson.scripts[script]}"`,
    });
  } else {
    results.push({
      name: `NPM script: ${script}`,
      status: 'fail',
      message: '✗ Missing',
    });
  }
});

// Check 4: vercel.json is valid
try {
  const vercelJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf-8')
  );
  
  if (vercelJson.outputDirectory && vercelJson.rewrites) {
    results.push({
      name: 'vercel.json configuration',
      status: 'pass',
      message: '✓ Valid SPA configuration',
    });
  } else {
    results.push({
      name: 'vercel.json configuration',
      status: 'warn',
      message: '⚠ Missing required fields',
    });
  }
} catch (e) {
  results.push({
    name: 'vercel.json configuration',
    status: 'fail',
    message: '✗ Invalid JSON',
  });
}

// Check 5: API endpoints exist
const apiFiles = [
  'api/auth/login.ts',
  'api/auth/register.ts',
  'api/auth/me.ts',
  'api/orgs/index.ts',
  'api/orgs/jobs.ts',
  'api/jobs/candidates.ts',
];

const apiFound = apiFiles.filter(file => 
  fs.existsSync(path.join(process.cwd(), file))
).length;

results.push({
  name: 'API endpoints',
  status: apiFound >= 5 ? 'pass' : 'warn',
  message: `✓ ${apiFound}/${apiFiles.length} endpoints found`,
});

// Print results
console.log('\n📋 Recruitment Platform Validation Report\n');
console.log('═'.repeat(60));

let passCount = 0;
let failCount = 0;
let warnCount = 0;

results.forEach(result => {
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} ${result.name}`);
  console.log(`   ${result.message}\n`);
  
  if (result.status === 'pass') passCount++;
  else if (result.status === 'fail') failCount++;
  else warnCount++;
});

console.log('═'.repeat(60));
console.log(`\n📊 Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failures\n`);

if (failCount > 0) {
  console.log('🔴 FAILED: Fix errors before deployment\n');
  process.exit(1);
} else if (warnCount > 0) {
  console.log('🟡 WARNING: Some items need attention\n');
  console.log('Next steps:');
  console.log('1. Run: npm run build');
  console.log('2. Run: npm run dev');
  console.log('3. Visit: http://localhost:8081\n');
  process.exit(0);
} else {
  console.log('🟢 SUCCESS: All checks passed!\n');
  console.log('Next steps:');
  console.log('1. Push changes: git push origin v0/recruitment-platform-ui-ed25522b');
  console.log('2. Verify deployment in Vercel Dashboard');
  console.log('3. Test at: https://your-vercel-domain.com/\n');
  process.exit(0);
}

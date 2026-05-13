#!/usr/bin/env node
/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * AgentHR Setup Script
 * Auto-generates secure SESSION_SECRET and JWT_SECRET
 * ============================================================
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const ENV_FILE = path.join(rootDir, '.env');
const ENV_EXAMPLE = path.join(rootDir, '.env.example');

console.log('');
console.log('============================================');
console.log('  AgentHR Setup');
console.log('  © Diploy - diploy.in');
console.log('============================================');
console.log('');

/**
 * Generate a cryptographically secure random string
 */
function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

/**
 * Check if .env file exists, if not copy from .env.example
 */
function ensureEnvFile() {
  if (!fs.existsSync(ENV_FILE)) {
    if (!fs.existsSync(ENV_EXAMPLE)) {
      console.error('❌ Error: .env.example file not found!');
      console.error('   Please ensure you have the complete AgentHR package.');
      process.exit(1);
    }
    console.log('📄 Creating .env file from .env.example...');
    fs.copyFileSync(ENV_EXAMPLE, ENV_FILE);
    console.log('   ✓ .env file created');
    return true;
  }
  console.log('📄 Found existing .env file');
  return false;
}

/**
 * Update a value in the .env file
 */
function updateEnvValue(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  }
  // If key doesn't exist, add it
  return content + `\n${key}=${value}`;
}

/**
 * Check if a secret needs to be generated
 */
function needsGeneration(value) {
  if (!value) return true;
  const placeholders = [
    'WILL_BE_AUTO_GENERATED',
    'your_session_secret',
    'your_jwt_secret',
    'ANY_LONG_RANDOM_KEY',
    'CHANGE_ME',
    'your_secret_here',
  ];
  return placeholders.some(p => value.toLowerCase().includes(p.toLowerCase()));
}

/**
 * Main setup function
 */
function main() {
  // Step 1: Ensure .env file exists
  const isNewFile = ensureEnvFile();
  
  // Step 2: Read current .env content
  let envContent = fs.readFileSync(ENV_FILE, 'utf8');
  
  // Step 3: Parse current values
  const lines = envContent.split('\n');
  const values = {};
  lines.forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) {
      values[match[1]] = match[2];
    }
  });
  
  // Step 4: Generate secrets if needed
  let updated = false;
  
  // SESSION_SECRET
  if (needsGeneration(values['SESSION_SECRET'])) {
    const sessionSecret = generateSecureSecret(64);
    envContent = updateEnvValue(envContent, 'SESSION_SECRET', sessionSecret);
    console.log('🔐 Generated new SESSION_SECRET (64 characters)');
    updated = true;
  } else {
    console.log('✓  SESSION_SECRET already configured');
  }
  
  // JWT_SECRET
  if (needsGeneration(values['JWT_SECRET'])) {
    const jwtSecret = generateSecureSecret(64);
    envContent = updateEnvValue(envContent, 'JWT_SECRET', jwtSecret);
    console.log('🔐 Generated new JWT_SECRET (64 characters)');
    updated = true;
  } else {
    console.log('✓  JWT_SECRET already configured');
  }
  
  // Step 5: Write updated content
  if (updated) {
    fs.writeFileSync(ENV_FILE, envContent);
    console.log('');
    console.log('✅ Security secrets generated successfully!');
  } else {
    console.log('');
    console.log('✅ All security secrets are already configured.');
  }
  
  // Step 6: Print next steps
  console.log('');
  console.log('============================================');
  console.log('  Next Steps:');
  console.log('============================================');
  console.log('');
  console.log('  1. Edit .env file and configure:');
  console.log('     - DATABASE_URL (PostgreSQL connection)');
  console.log('     - ELEVENLABS_API_KEY');
  console.log('     - TWILIO_ACCOUNT_SID & TWILIO_AUTH_TOKEN');
  console.log('     - SMTP settings for email');
  console.log('     - Payment gateway credentials (Stripe, etc.)');
  console.log('');
  console.log('  2. Initialize database:');
  console.log('     npm run db:push');
  console.log('     npm run db:seed');
  console.log('');
  console.log('  3. Build and start:');
  console.log('     npm run build');
  console.log('     npm run start');
  console.log('');
  console.log('============================================');
  console.log('');
}

main();

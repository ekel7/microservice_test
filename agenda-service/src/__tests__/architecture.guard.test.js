/**
 * Architecture guard — fails the suite if dependency rules are violated.
 *
 * Rules (see docs/HEXAGONAL_MIGRATION.md):
 * 1. domain/      → zero infrastructure dependencies (express, supabase,
 *                   adapters, middleware). Luxon is the accepted domain lib.
 * 2. application/ → may require domain/ and itself only. Never infrastructure
 *                   or HTTP. Dependencies arrive injected via factories.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..');

function walkJsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') return [];
      return walkJsFiles(full);
    }
    return full.endsWith('.js') ? [full] : [];
  });
}

const FORBIDDEN_FOR_DOMAIN = [
  /require\(['"]express['"]\)/,
  /require\(['"]@supabase\//,
  /require\(['"][^'"]*config\/supabase/,
  /require\(['"][^'"]*infrastructure\//,
  /require\(['"][^'"]*middleware\//,
];

const FORBIDDEN_FOR_APPLICATION = [
  /require\(['"]express['"]\)/,
  /require\(['"]@supabase\//,
  /require\(['"][^'"]*config\/supabase/,
  /require\(['"][^'"]*infrastructure\//,
  /require\(['"][^'"]*middleware\//,
];

function findViolations(layer, forbiddenPatterns) {
  const violations = [];
  walkJsFiles(path.join(SRC, layer)).forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    forbiddenPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        violations.push(`${path.relative(SRC, file)} violates: ${pattern}`);
      }
    });
  });
  return violations;
}

describe('architecture guard', () => {
  test('domain/ has zero infrastructure dependencies', () => {
    expect(findViolations('domain', FORBIDDEN_FOR_DOMAIN)).toEqual([]);
  });

  test('application/ depends only on domain/ (injected dependencies)', () => {
    expect(findViolations('application', FORBIDDEN_FOR_APPLICATION)).toEqual([]);
  });

  test('supabase-js is required ONLY inside infrastructure/persistence', () => {
    const offenders = walkJsFiles(SRC).filter(file => {
      if (path.join(SRC, 'infrastructure', 'persistence') !== file.substring(0, path.join(SRC, 'infrastructure', 'persistence').length)) {
        return /require\(['"]@supabase\/supabase-js['"]\)/.test(fs.readFileSync(file, 'utf8'));
      }
      return false;
    });
    expect(offenders).toEqual([]);
  });
});

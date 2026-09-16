import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { collectRepositories, updateSnapshot } from './update-github-stars.mjs';

test('repository aliases, subpaths and repeated links share a single fetch', () => {
  assert.deepEqual(collectRepositories([
    { links: { code: 'https://github.com/Owner/Repo/tree/main' } },
    { links: { code: 'https://github.com/owner/repo.git' } },
    { links: { code: 'https://github.com.evil.example/owner/repo' } }
  ], [{ titleLinks: { Work: 'https://github.com/OWNER/REPO' }, link: 'https://github.com/org' }]), ['owner/repo']);
});

test('an outage preserves previous counts and timestamps without inventing zero', async () => {
  const before = { count: 27, updatedAt: '2026-09-15T00:00:00Z' };
  const result = await updateSnapshot(['o/a', 'o/b', 'o/c', 'o/d'], { repositories: { 'o/b': before } }, async (url) => {
    if (url.endsWith('/a')) return { ok: true, json: async () => ({ stargazers_count: 0 }) };
    if (url.endsWith('/d')) return { ok: true, json: async () => ({ stargazers_count: 'bad' }) };
    return { ok: false, status: 403 };
  }, '2026-09-16T00:00:00Z');
  assert.equal(result.updated, 1);
  assert.equal(result.snapshot.repositories['o/a'].count, 0);
  assert.deepEqual(result.snapshot.repositories['o/b'], before);
  assert.equal(result.snapshot.repositories['o/c'], undefined);
  assert.equal(result.snapshot.repositories['o/d'], undefined);
  assert.equal(result.failures.length, 3);
});

test('preloaded script matches the published JSON and covers all current code links', () => {
  const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
  const snapshot = read('assets/github-stars.json');
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync('assets/js/github-stars-data.js', 'utf8'), context);
  assert.equal(JSON.stringify(context.window.GitHubStarSnapshot), JSON.stringify(snapshot));
  const repos = collectRepositories([...read('assets/nus_publications.json'), ...read('assets/smu_publications.json')],
    [...read('assets/nus_events.json'), ...read('assets/smu_events.json')]);
  for (const repo of repos) {
    const value = snapshot.repositories[repo];
    // Unavailable/private repositories may lack a count; do not fail scheduled deployments.
    if (value) {
      assert.ok(Number.isSafeInteger(value.count) && value.count >= 0, repo);
      assert.ok(Number.isFinite(Date.parse(value.updatedAt)), repo);
    }
  }
});

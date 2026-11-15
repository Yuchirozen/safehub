/**
 * SAFEHUB — Publish Repository to GitHub via REST API
 * 
 * Usage:
 *   node scripts/publish-to-github.mjs <GITHUB_TOKEN> [REPO_NAME]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const TOKEN = process.argv[2] || process.env.GITHUB_TOKEN;
const REPO_NAME = process.argv[3] || 'safehub';
const OWNER = 'Yuchirozen';

if (!TOKEN) {
  console.error('❌ Error: GitHub Token required.');
  console.error('Usage: node scripts/publish-to-github.mjs <GITHUB_TOKEN>');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'SAFEHUB-Publisher'
};

async function api(endpoint, options = {}) {
  const url = `https://api.github.com${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.message || `HTTP ${res.status}`;
    throw new Error(`${options.method || 'GET'} ${endpoint} failed: ${errorMsg}`);
  }
  return data;
}

function getFilesToCommit(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (['node_modules', 'dist', '.git'].includes(file) || file.startsWith('.env')) continue;
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(getFilesToCommit(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  console.log(`\n🚀 Initializing GitHub Private Repository: ${OWNER}/${REPO_NAME}...\n`);

  // 1. Verify User
  const user = await api('/user');
  console.log(`👤 Authenticated as: ${user.login}`);

  // 2. Create or verify repo
  let repo;
  try {
    repo = await api(`/repos/${OWNER}/${REPO_NAME}`);
    console.log(`📌 Repository ${OWNER}/${REPO_NAME} exists.`);
  } catch {
    console.log(`📦 Creating private repository ${OWNER}/${REPO_NAME}...`);
    repo = await api('/user/repos', {
      method: 'POST',
      body: JSON.stringify({
        name: REPO_NAME,
        private: true,
        description: 'SAFEHUB — Smart Emergency Shelter & Disaster Response System',
        auto_init: true
      })
    });
    console.log(`✅ Private repository created: ${repo.html_url}`);
  }

  // Ensure repo has at least one commit so Git Database API is initialized
  let parentCommitSha = null;
  try {
    const ref = await api(`/repos/${OWNER}/${REPO_NAME}/git/ref/heads/main`);
    parentCommitSha = ref.object.sha;
  } catch {
    console.log('🌱 Initializing repository with initial README.md commit...');
    const initRes = await api(`/repos/${OWNER}/${REPO_NAME}/contents/README.md`, {
      method: 'PUT',
      body: JSON.stringify({
        message: 'Initial commit',
        content: Buffer.from('# SAFEHUB — Smart Emergency Shelter & Disaster Response System\n\nAutomated AI-assisted emergency shelter mapping, live disaster telemetry, and IoT early-warning grid.\n').toString('base64')
      })
    });
    parentCommitSha = initRes.commit.sha;
    console.log(`✅ Initial commit created: ${parentCommitSha.substring(0, 7)}`);
  }

  // 3. Collect files
  const filePaths = getFilesToCommit(ROOT_DIR);
  console.log(`📂 Uploading ${filePaths.length} project files...`);

  const treeItems = [];
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath);
    
    // Check if binary
    const isBinary = content.some(b => b === 0);
    const blobData = isBinary
      ? { content: content.toString('base64'), encoding: 'base64' }
      : { content: content.toString('utf8'), encoding: 'utf-8' };

    const blob = await api(`/repos/${OWNER}/${REPO_NAME}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify(blobData)
    });

    treeItems.push({
      path: relPath,
      mode: '100644',
      type: 'blob',
      sha: blob.sha
    });

    process.stdout.write(`\r   Progress: [${i + 1}/${filePaths.length}] ${relPath.slice(0, 45).padEnd(45)}`);
  }
  console.log('\n✅ All file blobs created.');

  // 4. Create Tree
  console.log('🌳 Creating Git tree...');
  const tree = await api(`/repos/${OWNER}/${REPO_NAME}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ tree: treeItems })
  });

  // 5. Create Commit
  console.log('📝 Creating commit with all project files...');
  try {
    const ref = await api(`/repos/${OWNER}/${REPO_NAME}/git/ref/heads/main`);
    parentCommitSha = ref.object.sha;
  } catch {}

  const commit = await api(`/repos/${OWNER}/${REPO_NAME}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({
      message: 'feat: Initial SAFEHUB Disaster Response & Emergency Shelter platform',
      tree: tree.sha,
      parents: parentCommitSha ? [parentCommitSha] : []
    })
  });
  console.log(`✅ Commit created: ${commit.sha.substring(0, 7)}`);

  // 6. Update or create branch ref
  console.log('📌 Updating branch ref: main...');
  try {
    await api(`/repos/${OWNER}/${REPO_NAME}/git/refs/heads/main`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commit.sha, force: true })
    });
  } catch {
    await api(`/repos/${OWNER}/${REPO_NAME}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: 'refs/heads/main', sha: commit.sha })
    });
  }

  console.log('\n════════════════════════════════════════════════════════');
  console.log(`🎉 REPOSITORY PUBLISHED SUCCESSFULLY TO GITHUB!`);
  console.log('════════════════════════════════════════════════════════');
  console.log(`   🔗 Repository URL : https://github.com/${OWNER}/${REPO_NAME}`);
  console.log(`   🔒 Visibility     : Private`);
  console.log(`   🌿 Default Branch : main`);
  console.log(`   📦 Total Files    : ${filePaths.length}`);
  console.log('════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ Error publishing to GitHub:', err.message);
  process.exit(1);
});

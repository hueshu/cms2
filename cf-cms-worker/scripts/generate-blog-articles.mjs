#!/usr/bin/env node
/**
 * generate-blog-articles.mjs
 *
 * Generates AI blog articles for long-tail SEO keywords and stores them in
 * articles table via remote D1.
 *
 * Adapted for ALLCUT CMS (Chinese content, articles table).
 *
 * Usage:
 *   node scripts/generate-blog-articles.mjs [options]
 *
 * Options:
 *   --concurrency N    Concurrent API requests (default: 20)
 *   --limit N          Max articles to generate (default: all)
 *   --dry-run          Print prompts for first 5 keywords, no API calls
 *   --push             After generation, push to remote D1
 *   --push-only        Skip generation, just push existing JSONL to remote D1
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Constants & paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const OUTPUT_DIR = join(__dirname, '_ai_content_output');
const PROGRESS_FILE = join(OUTPUT_DIR, '_blog_progress.json');
const REPORT_FILE = join(__dirname, '_seo_analysis', 'long-tail-report.json');

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    concurrency: 20,
    limit: 0,
    dryRun: false,
    push: false,
    pushOnly: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--concurrency':
        opts.concurrency = parseInt(args[++i], 10);
        break;
      case '--limit':
        opts.limit = parseInt(args[++i], 10);
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--push':
        opts.push = true;
        break;
      case '--push-only':
        opts.pushOnly = true;
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        process.exit(1);
    }
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function loadConfig(opts) {
  const baseUrl = process.env.AI_API_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'grok-4-1-fast-non-reasoning';

  if (!opts.dryRun && !opts.pushOnly && (!baseUrl || !apiKey)) {
    console.error('ERROR: AI_API_BASE_URL and AI_API_KEY environment variables are required.');
    process.exit(1);
  }

  return { baseUrl, apiKey, model, ...opts };
}

// ---------------------------------------------------------------------------
// Keyword loading (no filtering for Chinese — use all keywords directly)
// ---------------------------------------------------------------------------

function keywordToSlug(keyword) {
  // For Chinese keywords, use pinyin-like slug from keyword hash
  return keyword
    .replace(/[，。！？、；：""''（）【】]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function loadKeywords() {
  if (!existsSync(REPORT_FILE)) {
    console.error(`ERROR: Keyword report not found at ${REPORT_FILE}`);
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(REPORT_FILE, 'utf8'));
  console.log(`Loaded ${raw.length} keywords from report`);

  // Deduplicate by slug
  const seen = new Set();
  const deduped = [];
  for (const kw of raw) {
    const slug = keywordToSlug(kw.keyword);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    deduped.push({ ...kw, slug });
  }

  console.log(`After dedup: ${deduped.length} unique keywords`);
  return deduped;
}

// ---------------------------------------------------------------------------
// Prompt config
// ---------------------------------------------------------------------------

const DEFAULT_PROMPT_CONFIG = {
  persona: '一个有8年短视频运营经验的自媒体老手',
  siteName: 'ALLCUT官网',
  siteDescription: '一款专业的批量视频剪辑软件',
  audience: '短视频运营者',
  audienceContext: '每天要处理大量视频素材',
  brandExamples: '抖音、快手、视频号、小红书、B站、剪映、PR',
  opinionExamples: '"说实话，大部分人剪辑效率低不是技术问题，是工具没选对"',
  firstPersonExamples: '"我自己做号那会儿，"',
  voiceStarters: '"说真的，" 或 "给你讲个真实案例："',
  numberExamples: '"大概3-5分钟" 而不是 "几分钟"',
  internalLinkTemplate: '<a href="/download">下载ALLCUT试试</a>',
  ctaStyle: '工具好不好，自己试了才知道',
  extraBannedPhrases: [],
  language: 'zh-CN',
  siteId: 'site-004',
};

const UNIVERSAL_BANNED_PHRASES = [
  '在当今时代', '随着科技的发展', '众所周知', '不言而喻',
  '总而言之', '综上所述', '毋庸置疑', '一站式', '赋能', '助力',
  '让我们一起来看看', '接下来我们将', '本文将为您', '下面我们来',
  '深入探讨', '全面解析', '详细介绍', '为您揭秘',
];

function loadPromptConfig() {
  const configPath = join(PROJECT_ROOT, 'seo-blog.config.json');
  let config = { ...DEFAULT_PROMPT_CONFIG };

  if (existsSync(configPath)) {
    try {
      const userConfig = JSON.parse(readFileSync(configPath, 'utf8'));
      config = { ...config, ...userConfig };
      console.log(`Loaded prompt config from ${configPath}`);
    } catch (e) {
      console.warn(`Warning: Failed to parse ${configPath}, using defaults: ${e.message}`);
    }
  }

  return config;
}

function buildSystemPrompt(cfg) {
  const allBanned = [...UNIVERSAL_BANNED_PHRASES, ...(cfg.extraBannedPhrases || [])];

  return `你是${cfg.persona}。你现在为${cfg.siteName}（${cfg.siteDescription}）写文章。

写作风格要求——非常重要：
- 像真人专家写的，不像AI。句子长短要有变化，短句和长句混着来。
- 有些段落用这样的开头：${cfg.voiceStarters} —— 真实的编辑腔调
- 用口语化表达，别太书面。该用"你"就用"你"，别用"您"。
- 偶尔加入第一人称视角：${cfg.firstPersonExamples}
- 用具体但不整的数字：${cfg.numberExamples}
- 该提到真实品牌、产品的时候就提（${cfg.brandExamples}）
- 每篇文章至少有一个稍微带观点的表达——${cfg.opinionExamples}
- 绝对不能用这些AI味短语：${allBanned.map(p => `"${p}"`).join('、')}
- 不要用问答格式开头，不要"Q: ... A: ..."
- 段落长度要有变化：有的1句话，有的4-5句。别每段结构都一样。
- 用破折号——像这样——做插入语
- 偶尔用不完整的句子也行，增加语感。

输出：只输出合法JSON——不要markdown代码块，不要额外说明，只要JSON对象`;
}

function buildPrompt(kw, cfg) {
  return {
    system: buildSystemPrompt(cfg),
    user: `为${cfg.siteName}写一篇博客文章，目标关键词："${kw.keyword}"
分类：${kw.trade_name || kw.trade_slug}

结构要求：
- 800-1500字，用HTML标签（h2, h3, p, ul/li, strong）
- 关键词自然出现3-5次——如果生硬就少用
- 开头要有个钩子，让人知道你理解他们为什么搜这个。别用"你是否在寻找..."这种烂开头。
- 包含真实的操作步骤、具体数字、时间估算
- 内容类型要混合：短列表、叙述段落、偶尔一个"老手建议"
- 文中自然加入一个内链：${cfg.internalLinkTemplate}
- 结尾自然引导——不要硬推销，更像"${cfg.ctaStyle}"

语气：像跟同行朋友聊天那样写，面向${cfg.audience}，${cfg.audienceContext}。专业但不死板，该有态度的地方有态度。

返回JSON：
{
  "title": "吸引人的标题，15-25个中文字",
  "meta_description": "真实的描述，60-80个中文字",
  "content": "<h2>...</h2><p>...</p>...",
  "summary": "1-2句话摘要"
}`
  };
}

// ---------------------------------------------------------------------------
// API calling with retry
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callAI(config, systemPrompt, userPrompt) {
  const url = `${config.baseUrl}/chat/completions`;
  const body = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 4096,
  };

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000),
      });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '0', 10);
        const delay = Math.max(retryAfter * 1000, BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1));
        console.warn(`\n  [429] Rate limited, waiting ${(delay / 1000).toFixed(1)}s before retry ${attempt}/${MAX_RETRIES}`);
        await sleep(delay);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => 'unknown');
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      const usage = data.usage || {};

      if (!content) {
        throw new Error('Empty response content from API');
      }

      const parsed = parseAIResponse(content);
      return { parsed, usage };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`\n  Attempt ${attempt} failed: ${err.message.slice(0, 200)}. Retrying in ${(delay / 1000).toFixed(1)}s...`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('All retries exhausted');
}

function parseAIResponse(text) {
  try { return JSON.parse(text); } catch {}

  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch {}
  }

  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch {}
  }

  throw new Error(`Failed to parse AI response as JSON. First 300 chars: ${text.slice(0, 300)}`);
}

// ---------------------------------------------------------------------------
// Semaphore
// ---------------------------------------------------------------------------

class Semaphore {
  constructor(max) {
    this.max = max;
    this.current = 0;
    this.queue = [];
  }
  async acquire() {
    if (this.current < this.max) { this.current++; return; }
    return new Promise((resolve) => { this.queue.push(resolve); });
  }
  release() {
    this.current--;
    if (this.queue.length > 0) { this.current++; this.queue.shift()(); }
  }
}

// ---------------------------------------------------------------------------
// Progress & resume
// ---------------------------------------------------------------------------

function loadProgress() {
  const completedSlugs = new Set();
  if (existsSync(OUTPUT_DIR)) {
    const files = readdirSync(OUTPUT_DIR).filter(
      (f) => f.startsWith('blog_batch_') && f.endsWith('.jsonl')
    );
    for (const f of files) {
      const lines = readFileSync(join(OUTPUT_DIR, f), 'utf8').split('\n').filter((l) => l.trim());
      for (const line of lines) {
        try { const r = JSON.parse(line); if (r.slug) completedSlugs.add(r.slug); } catch {}
      }
    }
  }

  if (existsSync(PROGRESS_FILE)) {
    try {
      const raw = JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'));
      return { completedSlugs, totalDone: raw.totalDone || completedSlugs.size, totalFailed: raw.totalFailed || 0 };
    } catch {}
  }

  return { completedSlugs, totalDone: completedSlugs.size, totalFailed: 0 };
}

function saveProgress(progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify({
    totalDone: progress.totalDone,
    totalFailed: progress.totalFailed,
    updatedAt: new Date().toISOString(),
  }, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// SQL helpers
// ---------------------------------------------------------------------------

function escapeSql(value) {
  if (value === null || value === undefined) return 'NULL';
  return "'" + String(value).replace(/'/g, "''") + "'";
}

// ---------------------------------------------------------------------------
// Push to remote D1 (adapted for articles table)
// ---------------------------------------------------------------------------

async function pushToRemote(promptCfg) {
  const siteId = promptCfg.siteId || 'site-004';

  console.log('\n========================================');
  console.log('  Pushing blog articles to remote D1');
  console.log(`  Site ID: ${siteId}`);
  console.log('========================================\n');

  const files = readdirSync(OUTPUT_DIR)
    .filter((f) => f.startsWith('blog_batch_') && f.endsWith('.jsonl'))
    .sort();

  if (files.length === 0) {
    console.error('No blog_batch_*.jsonl files found in ' + OUTPUT_DIR);
    process.exit(1);
  }

  const records = [];
  for (const f of files) {
    const lines = readFileSync(join(OUTPUT_DIR, f), 'utf8').split('\n').filter((l) => l.trim());
    for (const line of lines) {
      try {
        const record = JSON.parse(line);
        if (record.slug && record.content) records.push(record);
      } catch {}
    }
  }

  console.log(`Found ${records.length} valid articles from ${files.length} JSONL files`);
  if (records.length === 0) { console.log('No records to push.'); return; }

  // Check existing slugs
  console.log('Checking existing article slugs in remote D1...');
  const existingSlugs = new Set();
  try {
    const raw = execSync(
      `npx wrangler d1 execute cms-database --remote --command="SELECT slug FROM articles WHERE site_id='${siteId}'" --json`,
      { encoding: 'utf8', timeout: 120000, cwd: PROJECT_ROOT, maxBuffer: 50 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const parsed = JSON.parse(raw.trim());
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].results) {
      for (const row of parsed[0].results) existingSlugs.add(row.slug);
    }
  } catch (err) {
    console.warn(`  Warning: Could not check existing slugs: ${err.message.slice(0, 200)}`);
  }

  const newRecords = records.filter((r) => !existingSlugs.has(r.slug));
  console.log(`  Existing articles in DB: ${existingSlugs.size}`);
  console.log(`  New articles to insert: ${newRecords.length}`);

  if (newRecords.length === 0) {
    console.log('All articles already in DB. Nothing to push.');
    return;
  }

  const tmpDir = join(OUTPUT_DIR, '_tmp_sql_blog');
  mkdirSync(tmpDir, { recursive: true });

  const BATCH_SIZE = 50;
  const totalBatches = Math.ceil(newRecords.length / BATCH_SIZE);
  let inserted = 0;
  let failed = 0;

  console.log(`\nGenerating ${totalBatches} SQL batch file(s)...\n`);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, newRecords.length);
    const batch = newRecords.slice(start, end);

    const statements = batch.map((r) => {
      const id = randomUUID();
      return [
        `INSERT OR IGNORE INTO articles (`,
        `  id, site_id, title, slug, content, summary, meta_title, meta_description, status, author, published_at`,
        `) VALUES (`,
        `  ${escapeSql(id)}, ${escapeSql(siteId)}, ${escapeSql(r.title)}, ${escapeSql(r.slug)},`,
        `  ${escapeSql(r.content)}, ${escapeSql(r.summary || r.excerpt || null)},`,
        `  ${escapeSql(r.title)}, ${escapeSql(r.meta_description || null)},`,
        `  'published', 'ALLCUT', datetime('now')`,
        `);`,
      ].join('\n');
    });

    const sqlContent = statements.join('\n\n') + '\n';
    const sqlPath = join(tmpDir, `insert_blog_${String(batchIdx).padStart(4, '0')}.sql`);
    writeFileSync(sqlPath, sqlContent, 'utf8');

    try {
      execSync(
        `npx wrangler d1 execute cms-database --remote --file "${sqlPath}"`,
        { encoding: 'utf8', timeout: 120000, cwd: PROJECT_ROOT, maxBuffer: 50 * 1024 * 1024 }
      );
      inserted += batch.length;
    } catch (err) {
      console.error(`\n  [ERROR] Batch ${batchIdx + 1}/${totalBatches} failed: ${err.message.slice(0, 300)}`);
      failed += batch.length;
    }

    const processed = end;
    if (processed % 200 === 0 || processed === newRecords.length) {
      console.log(`  Progress: ${processed}/${newRecords.length} (${inserted} inserted, ${failed} failed)`);
    }

    try { unlinkSync(sqlPath); } catch {}
  }

  try {
    const remaining = readdirSync(tmpDir);
    if (remaining.length === 0) execSync(`rmdir "${tmpDir}"`, { encoding: 'utf8' });
  } catch {}

  console.log(`\n========================================`);
  console.log(`  Push Summary`);
  console.log(`========================================`);
  console.log(`  Total articles:  ${records.length}`);
  console.log(`  Already in DB:   ${existingSlugs.size}`);
  console.log(`  Inserted:        ${inserted}`);
  console.log(`  Failed:          ${failed}`);
  console.log(`========================================\n`);
}

// ---------------------------------------------------------------------------
// Main generation logic
// ---------------------------------------------------------------------------

async function generate(config) {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const promptCfg = loadPromptConfig();
  const keywords = loadKeywords();
  const progress = loadProgress();
  console.log(`Previous progress: ${progress.totalDone} done, ${progress.totalFailed} failed`);

  const workItems = keywords.filter((kw) => !progress.completedSlugs.has(kw.slug));
  console.log(`\nWork items: ${workItems.length} articles to generate\n`);

  if (workItems.length === 0) {
    console.log('All articles already generated! Use --push to push to remote D1.');
    return;
  }

  const itemsToProcess = config.limit > 0 ? workItems.slice(0, config.limit) : workItems;

  if (config.dryRun) {
    console.log('=== DRY RUN ===\n');
    const samples = itemsToProcess.slice(0, 5);
    for (const kw of samples) {
      const prompt = buildPrompt(kw, promptCfg);
      console.log(`--- "${kw.keyword}" (vol=${kw.search_volume}) ---`);
      console.log(`Slug: ${kw.slug}`);
      console.log(prompt.user.slice(0, 500));
      console.log('...\n');
    }
    console.log(`Total articles to generate: ${itemsToProcess.length}`);
    return;
  }

  const semaphore = new Semaphore(config.concurrency);
  let completed = 0;
  let failedCount = 0;
  const startTime = Date.now();
  let totalTokens = 0;

  const batchFile = join(OUTPUT_DIR, 'blog_batch_0000.jsonl');

  const processKeyword = async (kw) => {
    await semaphore.acquire();
    try {
      const prompt = buildPrompt(kw, promptCfg);
      const { parsed, usage } = await callAI(config, prompt.system, prompt.user);

      totalTokens += usage.total_tokens || 0;

      if (!parsed.title || !parsed.content) {
        throw new Error('Response missing title or content');
      }

      const record = {
        slug: kw.slug,
        keyword: kw.keyword,
        trade_slug: kw.trade_slug,
        search_volume: kw.search_volume,
        title: parsed.title,
        meta_description: parsed.meta_description || null,
        content: parsed.content,
        summary: parsed.summary || parsed.excerpt || null,
      };

      appendFileSync(batchFile, JSON.stringify(record) + '\n', 'utf8');
      progress.completedSlugs.add(kw.slug);
      progress.totalDone++;
      completed++;

      const elapsed = (Date.now() - startTime) / 1000;
      const rate = completed / elapsed;
      const remaining = itemsToProcess.length - completed - failedCount;
      const eta = remaining > 0 ? (remaining / rate / 60).toFixed(1) : '0.0';

      process.stdout.write(
        `\r  Articles: ${completed}/${itemsToProcess.length} | Failed: ${failedCount} | Rate: ${rate.toFixed(1)}/s | ETA: ${eta}m | Tokens: ${(totalTokens / 1000).toFixed(0)}K`
      );

      if (completed % 10 === 0) saveProgress(progress);
    } catch (err) {
      failedCount++;
      progress.totalFailed++;
      console.error(`\n  [ERROR] "${kw.keyword}": ${err.message.slice(0, 200)}`);
    } finally {
      semaphore.release();
    }
  };

  await Promise.all(itemsToProcess.map((kw) => processKeyword(kw)));
  saveProgress(progress);

  const totalElapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log(`\n\n========================================`);
  console.log(`  Generation Complete`);
  console.log(`========================================`);
  console.log(`  Articles:       ${completed} successful, ${failedCount} failed`);
  console.log(`  Total tokens:   ${(totalTokens / 1000).toFixed(0)}K`);
  console.log(`  Time:           ${totalElapsed} minutes`);
  console.log(`  Output:         ${batchFile}`);
  console.log(`========================================\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();
  const config = loadConfig(opts);

  console.log('========================================');
  console.log('  ALLCUT CMS — Generate Blog Articles');
  console.log('========================================');
  console.log(`  Model:       ${config.model}`);
  console.log(`  Concurrency: ${config.concurrency}`);
  console.log(`  Limit:       ${config.limit || 'none'}`);
  console.log(`  Dry run:     ${config.dryRun}`);
  console.log(`  Push:        ${config.push}`);
  console.log(`  Push only:   ${config.pushOnly}`);
  console.log('========================================\n');

  const promptCfg = loadPromptConfig();

  if (config.pushOnly) {
    await pushToRemote(promptCfg);
    return;
  }

  await generate(config);

  if (config.push) {
    await pushToRemote(promptCfg);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

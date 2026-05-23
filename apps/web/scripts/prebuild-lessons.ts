/**
 * Prebuild script: parses all lesson .md files into static TypeScript data.
 * Runs before `vite build` to eliminate the need for a runtime API server.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

// ── Config ──

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_SRC = resolve(__dirname, "..", "src", "lib");

// Local lessons directory (self-contained)
const LESSONS_ROOT = resolve(__dirname, "..", "..", "..", "lessons");

const EXCLUDE_DIRS = new Set(["node_modules", ".git"]);

const SECTION_NAMES: Record<string, string> = {
  "": "บทเรียนหลัก",
  Postgres: "PostgreSQL ขั้นสูง",
  Core: "หลักการออกแบบระบบ",
  Interview: "เทคนิคการสัมภาษณ์",
};

// ── Section type → content emoji mapping ──

const SECTION_EMOJI: Record<string, string> = {
  orient: "🎯",
  attempt: "🧪",
  feedback: "💬",
  explain: "📖",
  extend: "🔬",
  checkpoint: "✅",
  reflect: "🤔",
  // Extended section types
  scenario: "🚨",
  analysis: "🔍",
  timeline: "📊",
  commands: "⌨️",
  patterns: "🧩",
  exercise: "💻",
  solution: "✅",
  resources: "🔗",
  // Shared
  roadmap: "🗺️",
  list: "📋",
  tools: "🛠️",
  related: "📚",
  correct: "✅",
  partial: "⚠️",
  incorrect: "❌",
  search: "🔍",
  pause: "✋",
  celebration: "🎉",
  folder: "📁",
  flag: "🚩",
  psychology: "🤔",
  rss_feed: "📡",
  storage: "💾",
  analytics: "📊",
  robot_2: "🤖",
  timer: "⏱️",
};

// ── Material Symbols mapping (for section title chrome) ──

const ICON_MAP: Record<string, string> = {
  orient: "explore",
  attempt: "science",
  feedback: "forum",
  explain: "menu_book",
  extend: "biotech",
  checkpoint: "fact_check",
  reflect: "psychology",
  // Extended section types
  scenario: "crisis_alert",
  analysis: "query_stats",
  timeline: "timeline",
  commands: "terminal",
  patterns: "pattern",
  exercise: "code",
  solution: "checklist",
  resources: "link",
  // Shared
  roadmap: "map",
  list: "assignment",
  tools: "build",
  related: "library_books",
  correct: "check_circle",
  partial: "warning",
  incorrect: "error",
  search: "search",
  pause: "front_hand",
  celebration: "celebration",
  folder: "folder",
  flag: "flag",
  psychology: "psychology",
  rss_feed: "rss_feed",
  storage: "storage",
  analytics: "analytics",
  robot_2: "robot_2",
  timer: "timer",
};

const EMOJI_TO_TYPE: Record<string, string> = {
  "🎯": "orient",
  "🧪": "attempt",
  "💬": "feedback",
  "📖": "explain",
  "🔬": "extend",
  "✅": "correct",
  "🏆": "correct",
  "❌": "incorrect",
  "🔥": "incorrect",
  "⚠️": "partial",
  "🤔": "reflect",
  "🗺️": "roadmap",
  "📋": "list",
  "🛠️": "tools",
  "📚": "related",
  "🔍": "search",
  "✋": "pause",
  "🎉": "celebration",
  "📁": "folder",
  "🚩": "flag",
  "🧠": "psychology",
  "📡": "rss_feed",
  "💾": "storage",
  "📊": "analytics",
  "🤖": "robot_2",
  "⏱️": "timer",
};

function getIconHtml(type: string, className = ""): string {
  const emoji = SECTION_EMOJI[type] || "📖";
  if (className) {
    return `<span class="${className}">${emoji}</span>`;
  }
  return emoji;
}

// ── Marked setup ──

marked.setOptions({ breaks: true, gfm: true });

const renderer = new marked.Renderer();
const origCode = renderer.code.bind(renderer);
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const langLabel = lang || "plain";
  const escaped = text.replace(/[<>&"]/g, (c: string) => {
    const map: Record<string, string> = { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" };
    return map[c] || c;
  });
  return `<div class="code-block">
  <div class="code-block-header">
    <span class="code-block-lang">${langLabel}</span>
    <button class="code-block-copy" onclick="(function(btn){var pre=btn.parentElement.nextElementSibling;var code=pre.textContent||'';navigator.clipboard.writeText(code).then(function(){var orig=btn.innerHTML;btn.innerHTML='<svg width=14 height=14 viewBox=\\'0 0 24 24\\' fill=none stroke=currentColor stroke-width=2><polyline points=\\'20 6 9 17 4 12\\'/></svg> Copied!';btn.classList.add('copied');setTimeout(function(){btn.innerHTML=orig;btn.classList.remove('copied')},2000)}).catch(function(){btn.textContent='Copy'});})(this)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</button>
  </div>
  <pre><code class="language-${langLabel}">${escaped}</code></pre>
</div>`;
};
marked.setOptions({ renderer });

function md(text: string, section?: string): string {
  // First, handle explicit legacy tags if they still exist
  const legacyTags: Record<string, string> = {
    correct: "check_circle",
    incorrect: "error",
    partial: "warning",
    pause: "front_hand",
    orient: "explore",
    attempt: "science",
    feedback: "forum",
    explain: "menu_book",
    extend: "biotech",
    checkpoint: "fact_check",
    reflect: "psychology",
  };

  for (const [tag, icon] of Object.entries(legacyTags)) {
    const tagRegex = new RegExp(`\\[${tag}\\]`, "g");
    const boldTagRegex = new RegExp(`\\*\\*\\[${tag}\\]\\*\\*`, "g");
    const colorClass =
      tag === "correct" || tag === "checkpoint"
        ? "text-green-600"
        : tag === "incorrect"
          ? "text-red-600"
          : tag === "partial" || tag === "attempt"
            ? "text-amber-600"
            : "text-maha-600";

    text = text.replace(
      boldTagRegex,
      `<span class="material-symbols-outlined ${colorClass}">${icon}</span>`,
    );
    text = text.replace(
      tagRegex,
      `<span class="material-symbols-outlined ${colorClass}">${icon}</span>`,
    );
  }

  // Handle emojis if they still exist — keep as-is (they are already native emoji)

  // KEYWORD AUTO-INJECTION (for the "clean" markdown source)
  // This allows us to remove prefixes from source but keep icons in UI

  // Handle "หยุดตรงนี้" -> pause emoji
  text = text.replace(
    /\*\*(หยุดตรงนี้|ลองคิดสักครู่|หยุดคิดสักนิด|หยุดคิดสัก 30 วินาที|หยุดตรงนี้ก่อน|จดคำตอบไว้ในใจ|ลองร่างวิธีแก้ปัญหาของคุณ|คำนวณและวางกลยุทธ์ในใจก่อน|ซ้อมพูดในใจสัก 10 วินาที|หยุดคิดก่อน|หยุดและวิเคราะห์ก่อน|หยุดคิดสักครู่).*?\*\*/g,
    (match, p1) => {
      return `**<span class="text-amber-600">✋</span> ${p1}**`;
    },
  );

  // Strip 🔗 link prefix used in Related Topics / Resources lists
  text = text.replace(/🔗\s*-\s*/g, "- ");
  text = text.replace(/🔗\s+/g, "");

  const html = marked.parse(resolveWikilinks(text, section), { async: false }) as string;
  return html;
}

// ── HTML entity decoder ──

function unescapeHtml(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/** Truncate text at word boundary, appending ellipsis if cut. */
function truncateText(text: string, maxLen: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  // Cut at last space before maxLen
  const cut = cleaned.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  const boundary = lastSpace > maxLen * 0.6 ? lastSpace : maxLen;
  return cleaned.slice(0, boundary).trim() + "...";
}

// ── Strip "Quick Check:" heading from checkpoint question HTML ──

function stripQuickCheckHeading(html: string): string {
  // Remove <p><strong>Quick Check:</strong> ...content...</p> or <p><strong>Quick Check:</strong></p>
  return html
    .replace(/<p><strong>Quick Check:<\/strong>\s*<\/p>\s*/g, "")
    .replace(/<p><strong>Quick Check:<\/strong>\s*/g, "<p>")
    .replace(/<p><strong>Quick Check:<\/strong><\/p>/g, "");
}

// ── Wikilink resolver ──

function resolveWikilinks(text: string, currentSection?: string): string {
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_m, slug: string, label: string) => {
    const cleanSlug = resolveSlug(slug, currentSection);
    return `[${label.trim()}](#lesson/${cleanSlug})`;
  });
  text = text.replace(/\[\[([^\]]+)\]\]/g, (_m, slug: string) => {
    const cleanSlug = resolveSlug(slug, currentSection);
    return `[${slug.trim()}](#lesson/${cleanSlug})`;
  });
  return text;
}

function resolveSlug(raw: string, currentSection?: string): string {
  let slug = raw
    .trim()
    .replace(/\\+$/g, "") // Strip trailing backslashes (markdown table pipe escapes)
    .replace(/\.md$/i, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

  if (slug.startsWith("../")) {
    // Go up one level from current section -> root only (no grandchild dirs)
    slug = slug.replace(/^\.\.\//, "");
  } else if (slug.startsWith("./")) {
    // Explicit relative to current section
    slug = slug.replace(/^\.\//, "");
    if (currentSection) {
      slug = `${currentSection.toLowerCase()}/${slug}`;
    }
  } else if (!slug.includes("/") && currentSection) {
    // Bare filename — relative to current section
    slug = `${currentSection.toLowerCase()}/${slug}`;
  }
  // If slug already contains / (e.g. "chat/01-websocket-realtime"), use as-is

  return slug;
}

// ── Types (mirrors packages/shared) ──

type ContentType =
  | "learning-loop"
  | "overview"
  | "deep-dive"
  | "cheatsheet"
  | "case-study"
  | "interactive-lab";

type SectionType =
  | "orient"
  | "attempt"
  | "feedback"
  | "explain"
  | "extend"
  | "checkpoint"
  | "reflect"
  | "scenario"
  | "analysis"
  | "timeline"
  | "commands"
  | "patterns"
  | "exercise"
  | "solution"
  | "resources";

interface LessonMeta {
  slug: string;
  number: number;
  title: string;
  titleEn: string;
  summary: string;
  emoji: string;
  duration: string;
  section?: string;
  contentType: ContentType;
  tags?: string[];
  prerequisites?: string[];
  next?: string[];
}

interface AttemptOption {
  text: string;
  analysis: string;
  level: "correct" | "partial" | "incorrect";
}

interface LessonSection {
  type: SectionType;
  title: string;
  content?: string;
  attemptQuestion?: string;
  attemptOptions?: AttemptOption[];
  checkpointQuestion?: string;
  checkpointAnswer?: string;
  lang?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
}

interface Lesson {
  meta: LessonMeta;
  sections: LessonSection[];
}

// ── File discovery ──

function findLessonFiles(): { relPath: string; slug: string; section: string }[] {
  const results: { relPath: string; slug: string; section: string }[] = [];

  function walk(dir: string, section: string) {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      if (EXCLUDE_DIRS.has(entry)) continue;
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath, entry);
        } else if (stat.isFile() && entry.endsWith(".md")) {
          const slug = entry.replace(".md", "");
          const fullSlug = section ? `${section.toLowerCase()}/${slug}` : slug;
          results.push({ relPath: fullPath, slug: fullSlug, section });
        }
      } catch {
        /* skip */
      }
    }
  }

  walk(LESSONS_ROOT, "");
  return results;
}

// ── Parsing helpers ──

function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+?)(?:\s*\(.+?\))?$/m);
  return match ? match[1].trim() : "";
}

function extractTitleEn(markdown: string): string {
  const match = markdown.match(/^#\s+.+?\((.+?)\)$/m);
  return match ? match[1].trim() : "";
}

/** Parse YAML frontmatter from markdown. Returns key-value pairs. */
function parseFrontmatter(markdown: string): Record<string, any> {
  const fmMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return {};
  const raw = fmMatch[1];
  const result: Record<string, any> = {};
  const lines = raw.split("\n");
  for (const line of lines) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.+)$/);
    if (!m) continue;
    const key = m[1];
    let value: any = m[2].trim();
    // Parse arrays: [a, b, c]
    if (value.startsWith("[") && value.endsWith("]")) {
      try {
        value = JSON.parse(value.replace(/'/g, '"'));
      } catch {
        value = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/["']/g, ""));
      }
    }
    result[key] = value;
  }
  return result;
}

function extractAttemptQuestion(content: string): string | undefined {
  const m = content.match(/\*\*คำถาม:\*\*\s*(.+?)(?:\n|$)/);
  return m ? m[1].trim() : undefined;
}

function parseAttemptOptions(content: string, section?: string): AttemptOption[] {
  const options: AttemptOption[] = [];
  const lines = content.split("\n");
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    // Markdown table rows always start with |, but trailing | is optional.
    // Even a row that appears to have "extra" | separators (e.g. from inline
    // |**text** in the analysis cell) should still be treated as a table row
    // as long as it starts with |. We collect cells[0] (option text) and the
    // rest (cells[1..]) as the analysis, joining them back.
    if (trimmed.startsWith("|")) {
      // Only treat pure separator rows (|, -, :, whitespace only) as table dividers.
      // Data rows that happen to contain "---" in their text are not separators.
      if (/^\|[\s\-\|:]+\|?$/.test(trimmed)) {
        inTable = true;
        continue;
      }
      if (!inTable) continue;
      const cells = trimmed
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length >= 2) {
        const text = cells[0].replace(/[*_`]/g, "").trim();
        // Join all remaining cells as the analysis (handles inline | in content)
        let rawAnalysis = cells.slice(1).join(" ").replace(/<br>/g, " ").trim();

        let level: "correct" | "partial" | "incorrect" = "partial";
        if (/^✅|^🏆|^\[correct\]/.test(rawAnalysis)) {
          level = "correct";
          rawAnalysis = rawAnalysis.replace(
            /^✅|^🏆|^\[correct\]/,
            getIconHtml("correct", "text-green-600"),
          );
        } else if (/^❌|^🔥|^\[incorrect\]/.test(rawAnalysis)) {
          level = "incorrect";
          rawAnalysis = rawAnalysis.replace(
            /^❌|^🔥|^\[incorrect\]/,
            getIconHtml("incorrect", "text-red-600"),
          );
        } else if (/^⚠️|^\[partial\]/.test(rawAnalysis)) {
          level = "partial";
          rawAnalysis = rawAnalysis.replace(
            /^⚠️|^\[partial\]/,
            getIconHtml("partial", "text-amber-600"),
          );
        }

        const analysis = md(rawAnalysis, section);
        options.push({ text, analysis, level });
      }
    } else {
      inTable = false;
    }
  }
  return options;
}

function parseSections(markdown: string, section?: string): LessonSection[] {
  const sections: LessonSection[] = [];

  // Regex to catch all H2 headers
  const allH2Regex = /^##\s+(.+?)$/gm;
  const matches = [...markdown.matchAll(allH2Regex)];

  if (matches.length === 0) return sections;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const fullTitle = match[1].trim();

    // Clean the title by removing prefix emojis, tags, and numbers
    const cleanTitle = fullTitle
      .replace(/^(🎯|🧪|💬|📖|🔬|✅|🤔|🗺️|📋|🛠️|📚|❌|✅|⚠️|🧠|📡|📊|🤖|⏱️|💾|📁|🚩)\s+/, "")
      .replace(/^\[[a-z_]+\]\s+/, "")
      .replace(/^[0-9]+\.\s+/, "")
      .replace(/^(🎯|🧪|💬|📖|🔬|✅|🤔|🗺️|📋|🛠️|📚|❌|✅|⚠️|🧠|📡|📊|🤖|⏱️|💾|📁|🚩)\s+/, "") // second pass for cases like "1. ❌"
      .trim();

    const startIdx = match.index! + match[0].length;
    const endIdx = i < matches.length - 1 ? matches[i + 1].index! : markdown.length;
    let rawContent = markdown.slice(startIdx, endIdx).trim();

    rawContent = rawContent.replace(/\n---\n## (📚|\[related\]|หัวข้อที่เกี่ยวข้อง).+/s, "");
    rawContent = rawContent.trim();

    const titleLower = fullTitle.toLowerCase();
    let type: LessonSection["type"] = "explain";

    // Infer type from Thai or English keywords
    if (titleLower.includes("ปฐมนิเทศ") || titleLower.includes("orient")) type = "orient";
    else if (titleLower.includes("ลองทำก่อน") || titleLower.includes("attempt")) type = "attempt";
    else if (titleLower.includes("ผลตอบรับ") || titleLower.includes("feedback")) type = "feedback";
    else if (titleLower.includes("คำอธิบาย") || titleLower.includes("explain")) type = "explain";
    else if (titleLower.includes("ขยายความ") || titleLower.includes("extend")) type = "extend";
    else if (titleLower.includes("จุดตรวจสอบ") || titleLower.includes("checkpoint"))
      type = "checkpoint";
    else if (titleLower.includes("สะท้อนคิด") || titleLower.includes("reflect")) type = "reflect";
    // Extended section types
    else if (titleLower.includes("สถานการณ์") || titleLower.includes("scenario")) type = "scenario";
    else if (titleLower.includes("วิเคราะห์") || titleLower.includes("analysis")) type = "analysis";
    else if (titleLower.includes("ไทม์ไลน์") || titleLower.includes("timeline")) type = "timeline";
    else if (titleLower.includes("คำสั่ง") || titleLower.includes("commands")) type = "commands";
    else if (titleLower.includes("แพทเทิร์น") || titleLower.includes("patterns")) type = "patterns";
    else if (titleLower.includes("แบบฝึกหัด") || titleLower.includes("exercise")) type = "exercise";
    else if (titleLower.includes("เฉลย") || titleLower.includes("solution")) type = "solution";
    else if (titleLower.includes("แหล่งอ้างอิง") || titleLower.includes("resources"))
      type = "resources";

    // Material Symbols icons for section titles (not emoji — section chrome stays as icons)
    let iconName: string = ICON_MAP[type] || "help";
    let iconClass = "text-maha-600";

    if (type === "explain") {
      if (titleLower.includes("แผนผัง") || titleLower.includes("roadmap")) iconName = "map";
      else if (titleLower.includes("รายชื่อ") || titleLower.includes("list")) iconName = "assignment";
      else if (titleLower.includes("เครื่องมือ") || titleLower.includes("tools")) iconName = "build";
      else if (titleLower.includes("หัวข้อที่เกี่ยวข้อง") || titleLower.includes("related"))
        iconName = "library_books";

      // Map explicit markers to specific icons (for non-standard sections)
      if (fullTitle.includes("❌") || fullTitle.includes("[incorrect]")) {
        iconName = "error";
        iconClass = "text-red-600";
      } else if (fullTitle.includes("✅") || fullTitle.includes("[correct]")) {
        iconName = "check_circle";
        iconClass = "text-green-600";
      } else if (fullTitle.includes("⚠️") || fullTitle.includes("[partial]")) {
        iconName = "warning";
        iconClass = "text-amber-600";
      } else {
        // Check for other mapped emojis
        for (const [emoji, iconType] of Object.entries(EMOJI_TO_TYPE)) {
          if (fullTitle.includes(emoji)) {
            iconName = ICON_MAP[iconType];
            break;
          }
        }
      }
    } else {
      // Standard types colors
      if (type === "checkpoint") iconClass = "text-green-600";
      else if (type === "attempt") iconClass = "text-amber-600";
    }

    const iconHtml = `<span class="material-symbols-outlined ${iconClass}">${iconName}</span>`;
    const displayTitle = `${iconHtml} ${cleanTitle}`;

    if (type === "attempt") {
      const attemptQuestion = extractAttemptQuestion(rawContent);
      sections.push({
        type,
        title: displayTitle,
        content: md(rawContent, section),
        attemptQuestion: attemptQuestion ? md(attemptQuestion, section) : undefined,
        attemptOptions: [],
      });
    } else if (type === "feedback") {
      const options = parseAttemptOptions(rawContent, section);
      if (options.length > 0 && sections.length > 0) {
        const prev = sections[sections.length - 1];
        if (prev.type === "attempt") prev.attemptOptions = options;
      }
      sections.push({ type, title: displayTitle, content: md(rawContent, section) });
    } else if (type === "checkpoint") {
      // Normalize: strip blockquote '> ' prefix from <details> blocks so regex can match them
      const normContent = rawContent
        .replace(/^> ?<details/gm, "<details")
        .replace(/^> ?<\/details/gm, "</details")
        .replace(/^> ?<summary/gm, "<summary")
        .replace(/^> ?<\/summary/gm, "</summary");

      const qMatch = normContent.match(/>\s*\*\*Quick Check:?\*\*\s*([\s\S]+?)(?=\n<details>|$)/);
      const aMatch = normContent.match(/<details>[\s\S]*?<\/summary>\s*([\s\S]*?)<\/details>/);
      const hasDetails = normContent.includes("<details>");

      const contentWithoutDetails = normContent
        .replace(/<details>[\s\S]*?<\/details>/g, "")
        .replace(/\n---\s*$/g, "")
        .trim();

      const rawQuestion = qMatch ? qMatch[1].trim() : contentWithoutDetails;

      sections.push({
        type,
        title: displayTitle,
        content: md(contentWithoutDetails, section),
        checkpointQuestion: stripQuickCheckHeading(md(rawQuestion, section)),
        checkpointAnswer: aMatch
          ? md(aMatch[1].trim(), section)
          : hasDetails
            ? md("*(answer embedded in details block)*", section)
            : undefined,
      });
    } else {
      sections.push({ type, title: displayTitle, content: md(rawContent, section) });
    }
  }
  return sections;
}

// ── Core functions ──

function loadLesson(
  slug: string,
  files: { relPath: string; slug: string; section: string }[],
): Lesson | null {
  try {
    const match = files.find((f) => f.slug === slug);
    if (!match) return null;

    const markdown = readFileSync(match.relPath, "utf-8");
    const frontmatter = parseFrontmatter(markdown);
    const title = extractTitle(markdown);
    const titleEn = extractTitleEn(markdown);
    const sections = parseSections(markdown, match.section || undefined);

    // Infer contentType: overview files (00-overview.md) default to "overview",
    // otherwise use frontmatter or default to "learning-loop"
    let contentType: ContentType = frontmatter.contentType || "learning-loop";
    if (contentType === "learning-loop" && match.slug.includes("/00-overview")) {
      contentType = "overview";
    }

    let summary = "";
    const orient = sections.find((s) => s.type === "orient");
    if (orient?.content) {
      // Remove HTML tags and get first meaningful line
      const text = unescapeHtml(orient.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
      summary = truncateText(text, 150);
    }

    const numMatch = slug.match(/(\d+)/);
    const number = numMatch ? parseInt(numMatch[1]) : 0;

    // Extract icon name from orient section if available
    const orientSection = sections.find((s) => s.type === "orient");
    let emoji = "description";
    if (orientSection) {
      const match = orientSection.title.match(/material-symbols-outlined.*?>([^<]+)</);
      if (match) emoji = match[1];
    }

    return {
      meta: {
        slug,
        number,
        title,
        titleEn,
        summary,
        emoji,
        duration: frontmatter.duration || "5-10 นาที",
        section: match.section || undefined,
        contentType,
        tags: frontmatter.tags || [],
        prerequisites: frontmatter.prerequisites || [],
        next: frontmatter.next || [],
      },
      sections,
    };
  } catch (err) {
    console.error(`Failed to load lesson: ${slug}`, err);
    return null;
  }
}

function listLessons(files: { relPath: string; slug: string; section: string }[]): {
  overview: { title: string; subtitle: string; description: string; totalLessons: number };
  sections: { section: string; label: string; lessons: LessonMeta[] }[];
} {
  const sectionMap = new Map<string, LessonMeta[]>();

  for (const f of files) {
    const markdown = readFileSync(f.relPath, "utf-8");
    const title = extractTitle(markdown);
    const titleEn = extractTitleEn(markdown);

    // SMARTER Summary extraction: look for the first line of the Orient section
    // even if it doesn't have the emoji prefix anymore
    const orientSectionMatch = markdown.match(
      /##\s*(?:🎯|ปฐมนิเทศ|Orient).*?\n+([\s\S]+?)(?=\n##|$)/i,
    );
    let summary = "";
    if (orientSectionMatch) {
      const text = orientSectionMatch[1].replace(/\*\*/g, "").replace(/[_`]/g, "").trim();
      const firstLine = text.split("\n").find((line) => line.trim().length > 10) || "";
      summary = truncateText(firstLine, 150);
    }

    const numMatch = f.slug.match(/(\d+)/);
    const number = numMatch ? parseInt(numMatch[1]) : 0;

    // Extract icon/type from orient header or infer from title
    const orientHeader = markdown.match(
      /^##\s*(🎯|🧪|💬|📖|🔬|✅|🤔|🗺️|📋|🛠️|\[[a-z_]+\])?\s*(ปฐมนิเทศ|Orient)/im,
    );
    let emoji = "explore"; // default for orient
    if (orientHeader && orientHeader[1]) {
      const iconOrType = orientHeader[1];
      if (iconOrType.startsWith("[") && iconOrType.endsWith("]")) {
        emoji = ICON_MAP[iconOrType.slice(1, -1)] || "explore";
      } else {
        const emojiToType: Record<string, string> = {
          "🎯": "explore",
          "🧪": "science",
          "💬": "forum",
          "📖": "menu_book",
          "🔬": "biotech",
          "✅": "fact_check",
          "🤔": "psychology",
          "🗺️": "map",
          "📋": "assignment",
          "🛠️": "build",
        };
        emoji = emojiToType[iconOrType] || "explore";
      }
    }

    const section = f.section || "";

    // Parse frontmatter for content type
    const fm = parseFrontmatter(markdown);
    let contentType: ContentType = fm.contentType || "learning-loop";
    if (contentType === "learning-loop" && f.slug.includes("/00-overview")) {
      contentType = "overview";
    }

    if (!sectionMap.has(section)) {
      sectionMap.set(section, []);
    }
    sectionMap.get(section)!.push({
      slug: f.slug,
      number,
      title: title || basename(f.relPath, ".md"),
      titleEn,
      summary,
      emoji,
      duration: fm.duration || "5-10 นาที",
      section,
      contentType,
      tags: fm.tags || [],
      prerequisites: fm.prerequisites || [],
      next: fm.next || [],
    });
  }

  const entries = [...sectionMap.entries()];
  entries.sort(([a], [b]) => {
    if (a === "" && b !== "") return -1;
    if (a !== "" && b === "") return 1;
    return a.localeCompare(b);
  });

  const sections = entries.map(([section, lessons]) => ({
    section,
    label: SECTION_NAMES[section] || section,
    lessons: lessons.sort((a, b) => a.number - b.number),
  }));

  const totalLessons = sections.reduce((sum, s) => sum + s.lessons.length, 0);

  return {
    overview: {
      title: "System Design & Infrastructure Learn",
      subtitle: `${totalLessons} บทเรียน — System Design + Chat + PostgreSQL`,
      description:
        "คอร์สเรียนแบบ Interactive ตามหลัก Learning Loop — ปฐมนิเทศ → ลองทำ → ผลตอบรับ → คำอธิบาย → ขยายความ → จุดตรวจสอบ → สะท้อนคิด",
      totalLessons,
    },
    sections,
  };
}

// ── Main ──

console.log("🔨 Prebuilding lesson data...");

const files = findLessonFiles();
console.log(`  Found ${files.length} lesson files`);

const overviewData = listLessons(files);

// Build lookup map: slug → Lesson
const lessonsMap: Record<string, Lesson> = {};
for (const f of files) {
  const lesson = loadLesson(f.slug, files);
  if (lesson) {
    lessonsMap[f.slug] = lesson;
  }
}

// Generate TypeScript output
const tsOutput = `// ⚠️ AUTO-GENERATED by scripts/prebuild-lessons.ts — DO NOT EDIT
// Generated at: ${new Date().toISOString()}
// Total lessons: ${Object.keys(lessonsMap).length}

import type { Lesson, LessonMeta } from 'shared';

export const overviewData = ${JSON.stringify(overviewData, null, 2)} as {
  overview: { title: string; subtitle: string; description: string; totalLessons: number };
  sections: { section: string; label: string; lessons: LessonMeta[] }[];
};

export const lessonsMap: Record<string, Lesson> = ${JSON.stringify(lessonsMap, null, 2)};
`;

const outPath = join(WEB_SRC, "lessons-data.ts");
const { writeFileSync } = await import("node:fs");
writeFileSync(outPath, tsOutput, "utf-8");

console.log(`✅ Written ${outPath}`);
console.log(
  `   ${Object.keys(lessonsMap).length} lessons, ${JSON.stringify(tsOutput).length.toLocaleString()} bytes`,
);

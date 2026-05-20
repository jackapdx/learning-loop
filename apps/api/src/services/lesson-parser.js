import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
marked.setOptions({ breaks: true, gfm: true });
// Custom renderer: wrap code blocks with language label + copy button container
const renderer = new marked.Renderer();
const origCode = renderer.code.bind(renderer);
renderer.code = ({ text, lang }) => {
    const langLabel = lang || "plain";
    const escaped = text.replace(/[<>&"]/g, (c) => ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
    })[c] || c);
    return `<div class="code-block">
  <div class="code-block-header">
    <span class="code-block-lang">${langLabel}</span>
    <button class="code-block-copy" onclick="(function(btn){var pre=btn.parentElement.nextElementSibling;var code=pre.textContent||'';navigator.clipboard.writeText(code).then(function(){btn.textContent='Copied!';setTimeout(function(){btn.textContent='Copy'},1500)}).catch(function(){btn.textContent='Copy'});})(this)">Copy</button>
  </div>
  <pre><code class="language-${langLabel}">${escaped}</code></pre>
</div>`;
};
marked.setOptions({ renderer });
const __dirname = dirname(fileURLToPath(import.meta.url));
const LESSONS_ROOT = resolve(__dirname, "..", "..", "..", "lessons");
/** Excluded directories from scanning */
const EXCLUDE_DIRS = new Set(["node_modules", ".git", "learning-loop-app"]);
/** Directory display names */
const SECTION_NAMES = {
    "": "บทเรียนหลัก",
    Postgres: "PostgreSQL ขั้นสูง",
};
/** Convert Obsidian wikilinks to clickable markdown links */
function resolveWikilinks(text) {
    // [[slug|label]] → [label](#lesson/slug)
    text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_m, slug, label) => {
        // Normalize: strip .md, relative paths (../), and extra slashes
        const cleanSlug = slug
            .trim()
            .replace(/\.md$/i, "")
            .replace(/^\.\.?\//, "") // strip ../ or ./
            .replace(/\s+/g, "-")
            .toLowerCase();
        return `[${label.trim()}](#lesson/${cleanSlug})`;
    });
    // [[slug]] → [slug](#lesson/slug)
    text = text.replace(/\[\[([^\]]+)\]\]/g, (_m, slug) => {
        const cleanSlug = slug
            .trim()
            .replace(/\.md$/i, "")
            .replace(/^\.\.?\//, "")
            .replace(/\s+/g, "-")
            .toLowerCase();
        return `[${slug.trim()}](#lesson/${cleanSlug})`;
    });
    return text;
}
function md(text) {
    return marked.parse(resolveWikilinks(text), { async: false });
}
/** Recursively find all .md files, returning {relativePath, slug, section} */
function findLessonFiles() {
    const results = [];
    function walk(dir, section) {
        if (!existsSync(dir))
            return;
        const entries = readdirSync(dir);
        for (const entry of entries) {
            const fullPath = join(dir, entry);
            if (EXCLUDE_DIRS.has(entry))
                continue;
            try {
                const stat = statSync(fullPath);
                if (stat.isDirectory()) {
                    walk(fullPath, entry);
                }
                else if (stat.isFile() && entry.endsWith(".md")) {
                    const slug = entry.replace(".md", "");
                    // For root lessons, use the filename; for subdirs, use dir/filename
                    const fullSlug = section ? `${section.toLowerCase()}/${slug}` : slug;
                    results.push({ relPath: fullPath, slug: fullSlug, section });
                }
            }
            catch {
                // skip symlink issues
            }
        }
    }
    walk(LESSONS_ROOT, "");
    return results;
}
/** Extract first heading */
function extractTitle(markdown) {
    const match = markdown.match(/^#\s+(.+?)(?:\s*\(.+?\))?$/m);
    return match ? match[1].trim() : "";
}
function extractTitleEn(markdown) {
    const match = markdown.match(/^#\s+.+?\((.+?)\)$/m);
    return match ? match[1].trim() : "";
}
/** Parse feedback/attempt table into AttemptOptions */
function parseAttemptOptions(content) {
    const options = [];
    const lines = content.split("\n");
    let inTable = false;
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
            if (trimmed.includes("---")) {
                inTable = true;
                continue;
            }
            if (!inTable)
                continue;
            const cells = trimmed
                .split("|")
                .map((c) => c.trim())
                .filter(Boolean);
            if (cells.length >= 2) {
                const text = cells[0].replace(/[*_`]/g, "").trim();
                const rawAnalysis = cells[1].replace(/<br>/g, " ").trim();
                const analysis = md(rawAnalysis);
                let level = "partial";
                if (/^✅|^🏆/.test(rawAnalysis))
                    level = "correct";
                else if (/^❌|^🔥/.test(rawAnalysis))
                    level = "incorrect";
                else if (/^⚠️/.test(rawAnalysis))
                    level = "partial";
                options.push({ text, analysis, level });
            }
        }
        else {
            inTable = false;
        }
    }
    return options;
}
function extractAttemptQuestion(content) {
    const m = content.match(/\*\*คำถาม:\*\*\s*(.+?)(?:\n|$)/);
    return m ? m[1].trim() : undefined;
}
/** Split markdown into Learning Loop sections */
function parseSections(markdown) {
    const sections = [];
    const sectionRegex = /^##\s+(🎯|🧪|💬|📖|🔬|✅|🤔|🗺️|📋|🛠️)\s+(.+?)$/gm;
    const matches = [...markdown.matchAll(sectionRegex)];
    if (matches.length === 0)
        return sections;
    // Check if this is a lesson series overview (has 🗺️ or 📋)
    const isOverview = matches.some((m) => ["🗺️", "📋", "🛠️"].includes(m[1]));
    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const emoji = match[1];
        const title = match[2].trim();
        const startIdx = match.index + match[0].length;
        const endIdx = i < matches.length - 1 ? matches[i + 1].index : markdown.length;
        let rawContent = markdown.slice(startIdx, endIdx).trim();
        // Strip trailing "---", related topics
        rawContent = rawContent.replace(/\n---\n## 📚.+/s, "");
        rawContent = rawContent.trim();
        const typeMap = {
            "🎯": "orient",
            "🧪": "attempt",
            "💬": "feedback",
            "📖": "explain",
            "🔬": "extend",
            "✅": "checkpoint",
            "🤔": "reflect",
            "🗺️": "explain",
            "📋": "explain",
            "🛠️": "explain",
        };
        const type = typeMap[emoji] || "explain";
        if (type === "attempt") {
            const attemptQuestion = extractAttemptQuestion(rawContent);
            sections.push({
                type,
                title: `${emoji} ${title}`,
                content: md(rawContent),
                attemptQuestion,
                attemptOptions: [],
            });
        }
        else if (type === "feedback") {
            // Attach options to previous attempt section
            const options = parseAttemptOptions(rawContent);
            if (options.length > 0 && sections.length > 0) {
                const prev = sections[sections.length - 1];
                if (prev.type === "attempt")
                    prev.attemptOptions = options;
            }
            sections.push({ type, title: `${emoji} ${title}`, content: md(rawContent) });
        }
        else if (type === "checkpoint") {
            // Extract question: everything from Quick Check to <details> or end
            const qMatch = rawContent.match(/>\s*\*\*Quick Check:?\*\*\s*([\s\S]+?)(?=\n<details>|$)/);
            // Extract answer: everything inside <details> after </summary>
            const aMatch = rawContent.match(/<details>[\s\S]*?<\/summary>\s*([\s\S]*?)<\/details>/);
            const hasDetails = rawContent.includes("<details>");
            sections.push({
                type,
                title: `${emoji} ${title}`,
                // Show content WITHOUT the <details> block (answer hidden)
                content: md(rawContent.replace(/<details>[\s\S]*?<\/details>/g, "")),
                checkpointQuestion: qMatch ? qMatch[1].trim() : rawContent.slice(0, 300).trim(),
                // Parse answer as HTML so frontend can render with {@html}
                checkpointAnswer: aMatch
                    ? md(aMatch[1].trim())
                    : hasDetails
                        ? md("*(answer embedded in details block)*")
                        : undefined,
            });
        }
        else {
            sections.push({ type, title: `${emoji} ${title}`, content: md(rawContent) });
        }
    }
    return sections;
}
/** Load a single lesson */
export function loadLesson(slug) {
    try {
        // Find the matching file
        const files = findLessonFiles();
        const match = files.find((f) => f.slug === slug);
        if (!match)
            return null;
        const markdown = readFileSync(match.relPath, "utf-8");
        const title = extractTitle(markdown);
        const titleEn = extractTitleEn(markdown);
        const sections = parseSections(markdown);
        let summary = "";
        const orient = sections.find((s) => s.type === "orient");
        if (orient?.content) {
            const text = orient.content.replace(/<[^>]+>/g, "");
            const firstLine = text.split("\n").find((l) => l.trim().length > 10) || "";
            summary = firstLine.slice(0, 120).trim() + (firstLine.length > 120 ? "..." : "");
        }
        const numMatch = slug.match(/(\d+)/);
        const number = numMatch ? parseInt(numMatch[1]) : 0;
        // Use static emoji mapping or derive from orient title
        const emoji = sections.find((s) => s.type === "orient")?.title.slice(0, 2) || "📝";
        // Infer contentType: overview files default to "overview", others to "learning-loop"
        const contentType = slug.includes("/00-overview")
            ? "overview"
            : "learning-loop";
        return {
            meta: {
                slug,
                number,
                title,
                titleEn,
                summary,
                emoji,
                duration: "5-10 นาที",
                section: match.section || undefined,
                contentType,
            },
            sections,
        };
    }
    catch (err) {
        console.error(`Failed to load lesson: ${slug}`, err);
        return null;
    }
}
/** List all lessons grouped by section */
export function listLessons() {
    const files = findLessonFiles();
    const sectionMap = new Map();
    for (const f of files) {
        const markdown = readFileSync(f.relPath, "utf-8");
        const title = extractTitle(markdown);
        const titleEn = extractTitleEn(markdown);
        // Get summary from first orient paragraph
        const orientMatch = markdown.match(/## 🎯.+\n+(.+)/);
        let summary = "";
        if (orientMatch) {
            const text = orientMatch[1].replace(/\*\*/g, "").replace(/[_`]/g, "");
            summary = text.slice(0, 120).trim() + (text.length > 120 ? "..." : "");
        }
        const numMatch = f.slug.match(/(\d+)/);
        const number = numMatch ? parseInt(numMatch[1]) : 0;
        const emojiMatch = markdown.match(/^#\s+(.[^\s])/);
        const emoji = emojiMatch ? emojiMatch[1] : "📝";
        const section = f.section || "";
        if (!sectionMap.has(section)) {
            sectionMap.set(section, []);
        }
        const contentType = f.slug.includes("/00-overview")
            ? "overview"
            : "learning-loop";
        sectionMap.get(section).push({
            slug: f.slug,
            number,
            title: title || basename(f.relPath, ".md"),
            titleEn,
            summary,
            emoji,
            duration: "5-10 นาที",
            section,
            contentType,
        });
    }
    // Sort: root lessons first (by number), then sub-sections
    const entries = [...sectionMap.entries()];
    entries.sort(([a], [b]) => {
        if (a === "" && b !== "")
            return -1;
        if (a !== "" && b === "")
            return 1;
        return a.localeCompare(b);
    });
    return entries.map(([section, lessons]) => ({
        section,
        label: SECTION_NAMES[section] || section,
        lessons: lessons.sort((a, b) => a.number - b.number),
    }));
}
/** Get sections list for the overview */
export function getSectionList() {
    return listLessons().map((s) => ({
        section: s.section,
        label: s.label,
        count: s.lessons.length,
    }));
}

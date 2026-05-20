/**
 * Lightweight client-side syntax highlighter for code blocks.
 * Processes <code class="language-*"> elements and applies token-based coloring.
 * Covers SQL, TypeScript, JavaScript, Bash, YAML, JSON, and plain text.
 */

interface TokenRule {
  pattern: RegExp;
  className: string;
}

const SQL_RULES: TokenRule[] = [
  {
    pattern:
      /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|INDEX|ON|AS|AND|OR|NOT|NULL|IS|IN|LIKE|BETWEEN|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|ON|USING|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|CASE|WHEN|THEN|ELSE|END|EXISTS|CAST|COALESCE|BEGIN|COMMIT|ROLLBACK|PRIMARY|KEY|FOREIGN|REFERENCES|DEFAULT|CHECK|UNIQUE|CONSTRAINT|VACUUM|ANALYZE|EXPLAIN|WITH|RECURSIVE|OVER|PARTITION|RANGE|ROWS|INTERVAL|NOW|RETURNING|FOR|DO|NOTHING|CONFLICT|USING|GIN|BRIN|Btree|GiST|SET|SHOW|GRANT|REVOKE|TRUNCATE|COPY|pg_notify|to_tsvector|to_tsquery)\b/gi,
    className: "kw",
  },
  { pattern: /'[^']*'/g, className: "str" },
  { pattern: /\b\d+(\.\d+)?\b/g, className: "num" },
  { pattern: /--.*$/gm, className: "cm" },
  { pattern: /\b(NOW|CURRENT_TIMESTAMP|NULL|TRUE|FALSE)\b/gi, className: "lit" },
];

const TS_RULES: TokenRule[] = [
  {
    pattern:
      /\b(const|let|var|function|async|await|return|if|else|for|while|do|switch|case|break|continue|try|catch|throw|new|class|extends|implements|interface|type|enum|import|export|from|default|as|of|in|typeof|instanceof|void|never|any|unknown|boolean|string|number|symbol|undefined|null|true|false|yield|static|private|public|protected|readonly|abstract|declare|namespace|module|require|Promise|Map|Set|Array|Object|Error)\b/g,
    className: "kw",
  },
  { pattern: /`[^`]*`/g, className: "str" },
  { pattern: /'[^']*'/g, className: "str" },
  { pattern: /"[^"]*"/g, className: "str" },
  { pattern: /\/\/.*$/gm, className: "cm" },
  { pattern: /\b\d+(\.\d+)?\b/g, className: "num" },
];

const BASH_RULES: TokenRule[] = [
  {
    pattern:
      /\b(npm|bun|node|git|docker|curl|cd|ls|mkdir|rm|cp|mv|echo|cat|grep|sed|awk|chmod|export|source|alias|unset|ps|kill|top|ssh|scp|rsync|tar|gzip|gunzip|chown|sudo|apt|brew|pip|cargo|go|rustc|python|java|tsc|vite|turbo)\b/g,
    className: "kw",
  },
  { pattern: /"[^"]*"/g, className: "str" },
  { pattern: /'[^']*'/g, className: "str" },
  { pattern: /#.*$/gm, className: "cm" },
  { pattern: /--?\w+(?:[=-]\w+)?/g, className: "opt" },
];

const JSON_RULES: TokenRule[] = [
  { pattern: /"[^"]*"\s*:/g, className: "kw" },
  { pattern: /"[^"]*"/g, className: "str" },
  { pattern: /\b\d+(\.\d+)?\b/g, className: "num" },
  { pattern: /\b(true|false|null)\b/g, className: "lit" },
];

const YAML_RULES: TokenRule[] = [
  { pattern: /^[\w-]+(?=:)/gm, className: "kw" },
  { pattern: /"[^"]*"/g, className: "str" },
  { pattern: /'[^']*'/g, className: "str" },
  { pattern: /\b\d+(\.\d+)?\b/g, className: "num" },
  { pattern: /\b(true|false|null|yes|no|on|off)\b/g, className: "lit" },
  { pattern: /#.*$/gm, className: "cm" },
];

const RULES: Record<string, TokenRule[]> = {
  sql: SQL_RULES,
  pgsql: SQL_RULES,
  postgresql: SQL_RULES,
  typescript: TS_RULES,
  ts: TS_RULES,
  javascript: TS_RULES,
  js: TS_RULES,
  bash: BASH_RULES,
  sh: BASH_RULES,
  shell: BASH_RULES,
  json: JSON_RULES,
  yaml: YAML_RULES,
  yml: YAML_RULES,
};

export function highlightCodeBlocks(container: HTMLElement): void {
  const blocks = container.querySelectorAll<HTMLElement>(
    '.code-block pre code[class*="language-"]',
  );
  for (const block of blocks) {
    if (block.dataset.highlighted === "true") continue;

    const langClass = [...block.classList].find((c) => c.startsWith("language-"));
    const lang = langClass ? langClass.replace("language-", "") : "";
    const rules = RULES[lang];

    if (rules) {
      const text = block.textContent || "";
      const tokens = tokenize(text, rules);
      block.innerHTML = tokens
        .map((t) =>
          t.type === "text"
            ? escapeHtml(t.value)
            : `<span class="syn-${t.type}">${escapeHtml(t.value)}</span>`,
        )
        .join("");
    }

    block.dataset.highlighted = "true";
  }
}

interface Token {
  type: string;
  value: string;
}

function tokenize(text: string, rules: TokenRule[]): Token[] {
  const matches: { index: number; rule: TokenRule; match: RegExpExecArray }[] = [];
  for (const rule of rules) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m;
    while ((m = regex.exec(text)) !== null) {
      matches.push({ index: m.index, rule, match: m });
      if (!rule.pattern.global) break;
    }
  }
  matches.sort((a, b) => a.index - b.index);

  const tokens: Token[] = [];
  let pos = 0;
  for (const { index, rule, match } of matches) {
    if (index < pos) continue;
    if (index > pos) tokens.push({ type: "text", value: text.slice(pos, index) });
    tokens.push({ type: rule.className, value: match[0] });
    pos = index + match[0].length;
  }
  if (pos < text.length) tokens.push({ type: "text", value: text.slice(pos) });
  return tokens;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

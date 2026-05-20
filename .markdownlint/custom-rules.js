// Custom markdownlint rules for Thai and English mixing content
// Enables:
//   1. bold-no-inner-space: spaces inside bold markers
//   2. bold-label-separator: redundant bold marker after bold label colon
//   3. thai-english-spacing: missing space between Thai and English characters or numbers
//   4. bold-outer-space: missing space before/after bold markers and word characters

function maskIgnoredSegments(line) {
  let masked = line;
  // Mask inline code `code`
  masked = masked.replace(/`[^`\n]+`/g, (m) => ".".repeat(m.length));
  // Mask markdown links [text](url)
  masked = masked.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m) => ".".repeat(m.length));
  // Mask wiki links [[link]] or [[link|label]]
  masked = masked.replace(/\[\[([^\]]+)\]\]/g, (m) => ".".repeat(m.length));
  // Mask HTML tags
  masked = masked.replace(/<[^>]+>/g, (m) => ".".repeat(m.length));
  return masked;
}

/** @type {import("markdownlint").Rule} */
const ruleBoldNoInnerSpace = {
  names: ["MD999", "bold-no-inner-space"],
  description: "Bold/strong markers should not have spaces inside — use **text** not **text **",
  tags: ["emphasis", "whitespace", "thai"],
  parser: "none",
  function: function MD999(params, onError) {
    let inFrontmatter = false;
    let inCodeBlock = false;
    const lines = params.lines;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Track frontmatter and fenced code blocks
      if (i === 0 && line === "---") {
        inFrontmatter = true;
        continue;
      }
      if (inFrontmatter && line === "---") {
        inFrontmatter = false;
        continue;
      }
      if (line.startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inFrontmatter || inCodeBlock) {
        continue;
      }

      const masked = maskIgnoredSegments(line);

      // Rule 1: spaces inside bold markers
      const spans = masked.matchAll(/\*\*([^*]+?)\*\*/g);
      for (const m of spans) {
        const inner = m[1];
        const hasLeading = /^\s/.test(inner);
        const hasTrailing = /\s$/.test(inner);
        if (!hasLeading && !hasTrailing) continue;
        
        const originalInner = line.substring(m.index + 2, m.index + 2 + m[1].length);
        const trimmed = originalInner.trim();
        onError({
          lineNumber: i + 1,
          detail: `Spaces inside bold: "${m[0]}" → "**${trimmed}**"`,
          range: [m.index + 1, m[0].length],
          fixInfo: {
            editColumn: m.index + 1,
            deleteCount: m[0].length,
            insertText: `**${trimmed}**`,
          },
        });
      }

      // Rule 2: bold labels missing closing ** (e.g. **Label:text...)
      // Fix: **Label**: text (colon moves outside bold, closing ** added)
      const labelPattern = /\*\*([^*\s]+):([^*\s])/g;
      const labelMatches = masked.matchAll(labelPattern);
      for (const m of labelMatches) {
        const label = line.substring(m.index + 2, m.index + 2 + m[1].length);
        const nextChar = line[m.index + m[0].length - 1];
        onError({
          lineNumber: i + 1,
          detail: `Bold label missing closing **: "${m[0]}" → "**${label}**:${nextChar}"`,
          range: [m.index + 1, m[0].length],
          fixInfo: {
            editColumn: m.index + 1,
            deleteCount: m[0].length,
            insertText: `**${label}**:${nextChar}`,
          },
        });
      }
    }
  }
};

/** @type {import("markdownlint").Rule} */
const ruleBoldLabelSeparator = {
  names: ["MD998", "bold-label-separator"],
  description: "Redundant bold marker after bold label colon — use **Label**: text not **Label**:**text",
  tags: ["emphasis", "whitespace"],
  parser: "none",
  function: function MD998(params, onError) {
    let inFrontmatter = false;
    let inCodeBlock = false;
    const lines = params.lines;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (i === 0 && line === "---") {
        inFrontmatter = true;
        continue;
      }
      if (inFrontmatter && line === "---") {
        inFrontmatter = false;
        continue;
      }
      if (line.startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inFrontmatter || inCodeBlock) {
        continue;
      }

      const masked = maskIgnoredSegments(line);

      const matches = masked.matchAll(/\*\*([^*]+?)\*\*:\s*\*\*\s*/g);
      for (const m of matches) {
        const label = line.substring(m.index + 2, m.index + 2 + m[1].length);
        onError({
          lineNumber: i + 1,
          detail: `Redundant bold marker after colon: "${m[0]}" → "**${label}**: "`,
          range: [m.index + 1, m[0].length],
          fixInfo: {
            editColumn: m.index + 1,
            deleteCount: m[0].length,
            insertText: `**${label}**: `,
          },
        });
      }
    }
  }
};

/** @type {import("markdownlint").Rule} */
const ruleThaiEnglishSpacing = {
  names: ["MD997", "thai-english-spacing"],
  description: "Missing space between Thai and English characters or numbers",
  tags: ["whitespace", "thai"],
  parser: "none",
  function: function MD997(params, onError) {
    let inFrontmatter = false;
    let inCodeBlock = false;
    const lines = params.lines;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (i === 0 && line === "---") {
        inFrontmatter = true;
        continue;
      }
      if (inFrontmatter && line === "---") {
        inFrontmatter = false;
        continue;
      }
      if (line.startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inFrontmatter || inCodeBlock) {
        continue;
      }

      const masked = maskIgnoredSegments(line);

      // Match Thai followed by Latin/Digit, or Latin/Digit followed by Thai
      const pattern = /([\u0e00-\u0e7f])([a-zA-Z0-9])|([a-zA-Z0-9])([\u0e00-\u0e7f])/g;
      const matches = masked.matchAll(pattern);
      for (const m of matches) {
        const char1 = line[m.index];
        const char2 = line[m.index + 1];
        onError({
          lineNumber: i + 1,
          detail: `Missing space between Thai and English/number: "${char1}${char2}" → "${char1} ${char2}"`,
          range: [m.index + 1, m[0].length],
          fixInfo: {
            editColumn: m.index + 1,
            deleteCount: m[0].length,
            insertText: `${char1} ${char2}`,
          },
        });
      }
    }
  }
};

/** @type {import("markdownlint").Rule} */
const ruleBoldOuterSpace = {
  names: ["MD996", "bold-outer-space"],
  description: "Bold/strong markers should be separated from adjacent word characters by spaces — use **word** next not **word**next",
  tags: ["emphasis", "whitespace"],
  parser: "none",
  function: function MD996(params, onError) {
    let inFrontmatter = false;
    let inCodeBlock = false;
    const lines = params.lines;
    const wordCharRegex = /[\u0e00-\u0e7f_a-zA-Z0-9]/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (i === 0 && line === "---") {
        inFrontmatter = true;
        continue;
      }
      if (inFrontmatter && line === "---") {
        inFrontmatter = false;
        continue;
      }
      if (line.startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inFrontmatter || inCodeBlock) {
        continue;
      }

      const masked = maskIgnoredSegments(line);

      const spans = masked.matchAll(/\*\*([^*]+?)\*\*/g);
      for (const m of spans) {
        // Check character before the opening **
        if (m.index > 0) {
          const prevChar = line[m.index - 1];
          if (wordCharRegex.test(prevChar)) {
            onError({
              lineNumber: i + 1,
              detail: `Missing space before bold: "${prevChar}${m[0]}" → "${prevChar} ${m[0]}"`,
              range: [m.index, 1],
              fixInfo: {
                editColumn: m.index + 1,
                deleteCount: 0,
                insertText: " ",
              },
            });
          }
        }

        // Check character after the closing **
        const afterIndex = m.index + m[0].length;
        if (afterIndex < line.length) {
          const nextChar = line[afterIndex];
          if (wordCharRegex.test(nextChar)) {
            onError({
              lineNumber: i + 1,
              detail: `Missing space after bold: "${m[0]}${nextChar}" → "${m[0]} ${nextChar}"`,
              range: [afterIndex + 1, 1],
              fixInfo: {
                editColumn: afterIndex + 1,
                deleteCount: 0,
                insertText: " ",
              },
            });
          }
        }
      }
    }
  }
};

export default [
  ruleBoldNoInnerSpace,
  ruleBoldLabelSeparator,
  ruleThaiEnglishSpacing,
  ruleBoldOuterSpace
];

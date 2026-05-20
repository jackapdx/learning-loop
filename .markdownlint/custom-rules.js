// Custom markdownlint rule: no space inside bold/strong markers
// Catches: **text **, ** text**, ** text ** (common in Thai text)
//
// Usage in .markdownlint-cli2.yaml:
//   customRules:
//     - ".markdownlint/custom-rules.js"

/** @type {import("markdownlint").Rule} */
const rule = {
  names: ["MD999", "bold-no-inner-space"],
  description:
    "Bold/strong markers should not have spaces inside — use **text** not **text **",
  tags: ["emphasis", "whitespace", "thai"],
  parser: "none",
  function: function MD999(params, onError) {
    const lines = params.lines;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Find ALL **...** spans, then check each for inner spaces.
      // Use non-greedy match to avoid crossing bold spans.
      const spans = line.matchAll(/\*\*([^*]+?)\*\*/g);
      for (const m of spans) {
        const inner = m[1];
        const hasLeading = /^\s/.test(inner);
        const hasTrailing = /\s$/.test(inner);

        if (!hasLeading && !hasTrailing) continue;

        const trimmed = inner.trim();
        const detail = hasLeading
          ? `Leading space: "${m[0]}" → "**${trimmed}**"`
          : `Trailing space: "${m[0]}" → "**${trimmed}**"`;

        onError({
          lineNumber: i + 1,
          detail,
          range: [m.index + 1, m[0].length],
          fixInfo: {
            editColumn: m.index + 1,
            deleteCount: m[0].length,
            insertText: `**${trimmed}**`,
          },
        });
      }
    }
  },
};

export default rule;

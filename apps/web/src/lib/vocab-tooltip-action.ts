import { tick } from 'svelte';
import { glossary, glossaryTerms } from './glossary';

interface VocabSpan extends HTMLSpanElement {
  _vocabCleanup?: () => void;
}

/**
 * Tooltip state — only one tooltip shown at a time.
 */
let activeSpan: VocabSpan | null = null;
let tipEl: HTMLDivElement | null = null;
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let showTimer: ReturnType<typeof setTimeout> | null = null;

function getOrCreateTip(): HTMLDivElement {
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.className = 'vocab-tooltip';
    tipEl.setAttribute('role', 'tooltip');
    tipEl.style.cssText =
      'position:fixed;z-index:9999;max-width:320px;padding:0.75rem 1rem;' +
      'background:var(--color-surface-900);color:var(--color-surface-100);' +
      'border-radius:0.5rem;font-size:0.8125rem;line-height:1.6;' +
      'box-shadow:0 4px 20px rgba(0,0,0,0.25);pointer-events:none;' +
      'opacity:0;transform:translateY(4px);transition:opacity 0.15s ease,transform 0.15s ease;';
    document.body.appendChild(tipEl);
  }
  return tipEl;
}

function showTooltip(span: VocabSpan) {
  hideAll();

  const term = span.dataset.term;
  if (!term) return;

  const key = Object.keys(glossary).find(
    (k) => k.toLowerCase() === term.toLowerCase(),
  );
  if (!key) return;

  const tip = getOrCreateTip();
  tip.innerHTML = glossary[key];
  tip.style.opacity = '1';
  tip.style.transform = 'translateY(0)';

  const rect = span.getBoundingClientRect();
  let top = rect.bottom + 6;
  let left = rect.left + rect.width / 2;
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
  tip.style.transform = 'none';

  const tipRect = tip.getBoundingClientRect();
  if (tipRect.right > window.innerWidth - 8) {
    tip.style.left = (window.innerWidth - tipRect.width - 8) + 'px';
  }
  if (tipRect.left < 8) {
    tip.style.left = '8px';
  }
  if (tipRect.bottom > window.innerHeight - 8) {
    tip.style.top = (rect.top - tipRect.height - 6) + 'px';
  }

  tip.style.transform = 'translateY(0)';
  tip.style.opacity = '1';

  activeSpan = span;
  span.classList.add('vocab-active');
}

function hideAll() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  if (showTimer) { clearTimeout(showTimer); showTimer = null; }
  if (activeSpan) {
    activeSpan.classList.remove('vocab-active');
    activeSpan = null;
  }
  if (tipEl) {
    tipEl.style.opacity = '0';
    tipEl.style.transform = 'translateY(4px)';
  }
}

/**
 * Walk text nodes in `root` and wrap glossary terms in <span class="vocab">.
 * Skips existing vocab spans, code/pre blocks, and anchors.
 * Returns number of terms wrapped.
 */
function wrapTermsInRoot(root: HTMLElement): number {
  const vocabSelector = 'span.vocab';
  let wrapped = 0;

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(n) {
        let p = n.parentElement;
        while (p && p !== root) {
          const tag = p.tagName;
          if (
            tag === 'CODE' ||
            tag === 'PRE' ||
            tag === 'A' ||
            tag === 'SCRIPT' ||
            tag === 'STYLE' ||
            (tag === 'SPAN' && p.classList.contains('vocab'))
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          p = p.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  const replacements: { node: Text; matches: { term: string; start: number; end: number }[] }[] = [];

  let textNode: Text | null;
  while ((textNode = walker.nextNode() as Text | null)) {
    const text = textNode.textContent || '';
    const matches: { term: string; start: number; end: number }[] = [];

    for (const term of glossaryTerms) {
      const regex = new RegExp(
        `(?<![a-zA-Z0-9])${escapeRegex(term)}(?![a-zA-Z0-9])`,
        'g',
      );
      let m: RegExpExecArray | null;
      while ((m = regex.exec(text)) !== null) {
        const overlaps = matches.some(
          (existing) =>
            m!.index < existing.end && m!.index + term.length > existing.start,
        );
        if (!overlaps) {
          matches.push({ term, start: m.index, end: m.index + term.length });
        }
      }
    }

    if (matches.length > 0) {
      replacements.push({ node: textNode, matches: matches.sort((a, b) => a.start - b.start) });
    }
  }

  for (const { node: tn, matches } of replacements) {
    const parent = tn.parentElement;
    if (!parent) continue;

    const fragment = document.createDocumentFragment();
    let lastIdx = 0;
    const text = tn.textContent || '';

    for (const m of matches) {
      if (m.start > lastIdx) {
        fragment.appendChild(document.createTextNode(text.slice(lastIdx, m.start)));
      }
      const span = document.createElement('span');
      span.className = 'vocab';
      span.dataset.term = m.term;
      span.textContent = text.slice(m.start, m.end);
      fragment.appendChild(span);
      lastIdx = m.end;
      wrapped++;
    }
    if (lastIdx < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
    }

    parent.replaceChild(fragment, tn);
  }

  return wrapped;
}

/**
 * Svelte action: processes a container for vocabulary tooltips.
 * Uses MutationObserver to safely re-process when Svelte updates { @html } content.
 *
 * Usage: <div use:vocabTooltip>...</div>
 */
export function vocabTooltip(node: HTMLElement) {
  let observer: MutationObserver | null = null;
  let processing = false;

  async function process() {
    if (processing) return;
    processing = true;
    // Wait for Svelte to flush DOM updates
    await tick();
    // Additional rAF to ensure paint completed
    await new Promise((r) => requestAnimationFrame(r));
    hideAll();
    wrapTermsInRoot(node);
    processing = false;
  }

  // Initial processing
  process();

  // Watch for childList changes (Svelte swapping { @html } content)
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList' && (m.addedNodes.length > 0 || m.removedNodes.length > 0)) {
        process();
        break;
      }
    }
  });
  observer.observe(node, { childList: true, subtree: true });

  // ── Event handlers ──

  function onMouseOver(e: MouseEvent) {
    const target = e.target as Element;
    const span = target.closest?.('span.vocab') as VocabSpan | null;
    if (!span) return;

    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
    if (activeSpan === span) return;

    showTimer = setTimeout(() => {
      showTimer = null;
      showTooltip(span);
    }, 200);
  }

  function onMouseOut(e: MouseEvent) {
    const target = e.target as Element;
    const span = target.closest?.('span.vocab') as VocabSpan | null;
    if (!span) return;
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
    hideTimer = setTimeout(() => {
      hideTimer = null;
      if (activeSpan === span) hideAll();
    }, 100);
  }

  function onClickOutside(e: MouseEvent) {
    if (!activeSpan) return;
    const target = e.target as Element;
    if (!activeSpan.contains(target)) {
      hideAll();
    }
  }

  function onTouchStart(e: TouchEvent) {
    const touch = e.touches[0];
    if (!touch) return;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) {
      hideAll();
      return;
    }

    // Walk up to find vocab span
    let current: Element | null = el;
    let span: VocabSpan | null = null;
    while (current && current !== document.body) {
      if (current instanceof HTMLSpanElement && current.classList.contains('vocab')) {
        span = current as VocabSpan;
        break;
      }
      current = current.parentElement;
    }

    if (!span) {
      hideAll();
      return;
    }

    longPressTimer = setTimeout(() => {
      showTooltip(span!);
      navigator.vibrate?.(10);
    }, 500);
  }

  function onTouchMove() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function onTouchEnd(e: TouchEvent) {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (activeSpan) {
      const touch = e.changedTouches[0];
      if (!touch) return;
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      let current: Element | null = el;
      let span: VocabSpan | null = null;
      while (current && current !== document.body) {
        if (current instanceof HTMLSpanElement && current.classList.contains('vocab')) {
          span = current as VocabSpan;
          break;
        }
        current = current.parentElement;
      }
      if (!span || span !== activeSpan) {
        hideAll();
      }
    }
  }

  function onScroll() {
    if (activeSpan) {
      showTooltip(activeSpan);
    }
  }

  node.addEventListener('mouseover', onMouseOver);
  node.addEventListener('mouseout', onMouseOut);
  node.addEventListener('touchstart', onTouchStart, { passive: false });
  node.addEventListener('touchmove', onTouchMove, { passive: true });
  node.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('click', onClickOutside);
  window.addEventListener('blur', hideAll);

  return {
    destroy() {
      observer?.disconnect();
      node.removeEventListener('mouseover', onMouseOver);
      node.removeEventListener('mouseout', onMouseOut);
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClickOutside);
      window.removeEventListener('blur', hideAll);
      hideAll();
      if (tipEl) {
        tipEl.remove();
        tipEl = null;
      }
    },
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

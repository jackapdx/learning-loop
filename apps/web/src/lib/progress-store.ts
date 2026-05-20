/**
 * Client-side progress store using localStorage.
 * Persists completed lesson slugs across page reloads and server restarts.
 */

const STORAGE_KEY = "school-chat-learn-progress";

interface ProgressData {
  completedSlugs: string[];
}

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const data: ProgressData = JSON.parse(raw);
    return new Set(data.completedSlugs || []);
  } catch {
    return new Set();
  }
}

function save(slugs: Set<string>): void {
  const data: ProgressData = { completedSlugs: [...slugs] };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let cache: Set<string> | null = null;

function getCache(): Set<string> {
  if (!cache) cache = load();
  return cache;
}

/** Check if a lesson is completed */
export function isCompleted(slug: string): boolean {
  return getCache().has(slug);
}

/** Mark a lesson as complete */
export function markCompleted(slug: string): void {
  const s = getCache();
  s.add(slug);
  save(s);
}

/** Get array of completed slugs */
export function getCompletedSlugs(): string[] {
  return [...getCache()];
}

/** Get count of completed lessons */
export function getCompletedCount(): number {
  return getCache().size;
}

/** Reset all progress */
export function resetProgress(): void {
  cache = new Set();
  localStorage.removeItem(STORAGE_KEY);
}

// ── UI Preferences ──

const PREF_KEY = 'school-chat-learn-prefs';

interface Prefs {
  hideCompleted: boolean;
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    return raw ? JSON.parse(raw) : { hideCompleted: false };
  } catch {
    return { hideCompleted: false };
  }
}

function savePrefs(prefs: Prefs): void {
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
}

let prefsCache: Prefs | null = null;

function getPrefs(): Prefs {
  if (!prefsCache) prefsCache = loadPrefs();
  return prefsCache;
}

export function getHideCompleted(): boolean {
  return getPrefs().hideCompleted;
}

export function setHideCompleted(v: boolean): void {
  const p = getPrefs();
  p.hideCompleted = v;
  savePrefs(p);
}

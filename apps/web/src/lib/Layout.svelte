<script lang="ts">
  let { children } = $props();

  // Theme management — syncs with the anti-FOUC inline script in index.html
  type Theme = 'light' | 'dark';

  function getCurrentTheme(): Theme {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  }

  let theme = $state<Theme>(getCurrentTheme());

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    theme = next;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', next);
    }
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
</script>

<div class="min-h-screen flex flex-col bg-surface-50 transition-colors duration-300">
  <!-- Navbar -->
  <nav class="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-surface-200
              dark:bg-surface-900/90 dark:border-surface-700">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
      <button onclick={() => { window.location.hash = ''; window.location.reload(); }} class="flex items-center gap-2 text-lg font-bold text-surface-900 dark:text-surface-100 hover:opacity-80 transition-maha border-0 bg-transparent cursor-pointer" style="font-family: var(--font-family-heading); letter-spacing: -0.01em;">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
        System Design
      </button>
      <div class="flex items-center gap-4">
        <a href="#overview" class="text-sm text-surface-600 hover:text-emerald-600 dark:text-surface-400 dark:hover:text-emerald-400 transition-maha no-underline" style="font-family: var(--font-family-heading); letter-spacing: 0.02em;">
          Lessons
        </a>
        <!-- Theme Toggle -->
        <button
          onclick={toggleTheme}
          class="p-2 rounded text-surface-500 hover:text-surface-700 hover:bg-surface-100
                 dark:text-surface-400 dark:hover:text-surface-200 dark:hover:bg-surface-800
                 transition-all duration-200"
          aria-label={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
        >
          {#if theme === 'dark'}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          {/if}
        </button>
      </div>
    </div>
  </nav>

  <!-- Main Content -->
  <main class="flex-1" role="main">
    {@render children()}
  </main>

  <!-- Footer -->
  <footer class="bg-white border-t border-surface-200 py-6 px-4 mt-auto
                  dark:bg-surface-900 dark:border-surface-700">
    <div class="max-w-6xl mx-auto text-center text-xs text-surface-400 dark:text-surface-500">
      <a href="https://apdx.dev" target="_blank" rel="noopener noreferrer" class="hover:text-emerald-600 dark:hover:text-emerald-400 transition-maha">apdx.dev</a> — Built with Svelte 5
    </div>
  </footer>
</div>

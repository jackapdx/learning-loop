<script lang="ts">
  import { listLessons, buildQuiz, type QuizQuestion } from './lessons-api';
  import { isCompleted, resetProgress, getCompletedCount, getCompletedSlugs, getHideCompleted, setHideCompleted } from './progress-store';
  import FlashQuiz from './FlashQuiz.svelte';
  import type { LessonMeta } from 'shared';

  let { navigate }: { navigate: (to: string) => void } = $props();

  type SectionData = {
    section: string;
    label: string;
    lessons: (LessonMeta & { completed: boolean })[];
  };

  let overview = $state<{ title: string; subtitle: string; description: string; totalLessons: number } | null>(null);
  let sections = $state<SectionData[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let collapsedSections = $state<Set<string>>(new Set());

  // Search & filter state
  let searchQuery = $state('');
  let hideCompleted = $state(getHideCompleted());

  const filteredSections = $derived.by(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = sections;

    // Apply completed filter
    if (hideCompleted) {
      result = result
        .map((s) => ({
          ...s,
          lessons: s.lessons.filter((l) => !l.completed),
        }))
        .filter((s) => s.lessons.length > 0);
    }

    // Apply search filter
    if (q) {
      result = result
        .map((s) => ({
          ...s,
          lessons: s.lessons.filter(
            (l) =>
              l.title.toLowerCase().includes(q) ||
              l.summary.toLowerCase().includes(q) ||
              (l.titleEn && l.titleEn.toLowerCase().includes(q)) ||
              s.label.toLowerCase().includes(q),
          ),
        }))
        .filter((s) => s.lessons.length > 0);
    }

    return result;
  });

  const totalFiltered = $derived(filteredSections.reduce((sum, s) => sum + s.lessons.length, 0));
  const isSearching = $derived(searchQuery.trim().length > 0);

  // Quiz state
  let showQuiz = $state(false);
  let quizQuestions = $state<QuizQuestion[]>([]);

  function startQuiz() {
    const completed = getCompletedSlugs();
    if (completed.length === 0) return;
    quizQuestions = buildQuiz(completed, 5);
    if (quizQuestions.length > 0) {
      showQuiz = true;
    }
  }

  function closeQuiz() {
    showQuiz = false;
    quizQuestions = [];
  }

  // Synchronous data load from prebuilt static data
  try {
    const data = listLessons();
    overview = data.overview;
    sections = data.sections.map((s) => ({
      ...s,
      lessons: s.lessons.map((l) => ({ ...l, completed: isCompleted(l.slug) })),
    }));
    loading = false;
  } catch (e: any) {
    error = e.message;
    loading = false;
  }

  const allLessons = $derived(sections.flatMap(s => s.lessons));
  let completedCount = $state(getCompletedCount());
  const progressPercent = $derived(allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0);

  function toggleSection(section: string) {
    const next = new Set(collapsedSections);
    if (next.has(section)) next.delete(section); else next.add(section);
    collapsedSections = next;
  }

  async function handleReset() {
    resetProgress();
    setHideCompleted(false);
    hideCompleted = false;
    completedCount = 0;
    sections = sections.map(s => ({
      ...s,
      lessons: s.lessons.map(l => ({ ...l, completed: false })),
    }));
    showQuiz = false;
    quizQuestions = [];
  }

  // Auto-scroll to graduation card when arriving from completing the last lesson
  $effect(() => {
    if (completedCount === allLessons.length && allLessons.length > 0) {
      const shouldScroll = sessionStorage.getItem('scroll-to-done');
      if (shouldScroll === '1') {
        sessionStorage.removeItem('scroll-to-done');
        // Wait for DOM render
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            document.getElementById('all-done')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
        });
      }
    }
  });
</script>

<div class="max-w-4xl mx-auto px-4 py-8 sm:py-12">
  {#if loading}
    <div class="flex items-center justify-center py-20">
      <div class="flex flex-col items-center gap-4">
        <svg class="mha-spinner mha-spinner-xl" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span class="text-surface-500 dark:text-surface-400 text-sm">กำลังโหลดบทเรียน...</span>
      </div>
    </div>
  {:else if error}
    <div class="mha-alert mha-alert-error max-w-md mx-auto">
      <div class="mha-alert-title">เกิดข้อผิดพลาด</div>
      <div class="mha-alert-body">{error}</div>
    </div>
  {:else if overview}
    <!-- Hero -->
    <div class="text-center mb-10 animate-maha-slide-up">
      <button onclick={() => navigate('')} class="inline-block text-xs text-surface-400 hover:text-emerald-600 dark:text-surface-500 dark:hover:text-emerald-400 transition-maha mb-6 border-0 bg-transparent cursor-pointer" style="font-family: var(--font-family-heading); letter-spacing: 0.05em;">
        ← Home
      </button>
      <h1 class="text-3xl sm:text-4xl font-bold text-surface-900 dark:text-surface-50 mb-3 tracking-tight" style="font-family: var(--font-family-heading); letter-spacing: -0.02em;">
        {overview.title}
      </h1>

      <!-- Search & Filters -->
      <div class="mt-6 max-w-md mx-auto space-y-3">
        <!-- Search input -->
        <div class="relative">
          <svg
            class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-surface-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            bind:value={searchQuery}
            type="text"
            placeholder="ค้นหาบทเรียน... (ชื่อ, เนื้อหา, หัวข้อ)"
            class="w-full pl-9 pr-8 py-2.5 text-sm rounded border border-surface-300 bg-white
                   text-surface-900 placeholder:text-surface-400
                   dark:bg-surface-800 dark:border-surface-600 dark:text-surface-100 dark:placeholder:text-surface-500
                   focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                   transition-maha"
          />
          {#if isSearching}
            <button
              onclick={() => (searchQuery = '')}
              class="absolute right-2.5 top-1/2 -translate-y-1/2 size-5 rounded
                     bg-surface-300 dark:bg-surface-600 text-white dark:text-surface-200 flex items-center justify-center
                     hover:bg-surface-400 dark:hover:bg-surface-500 transition-maha"
              aria-label="ล้างการค้นหา"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>

        <!-- Filter row -->
        <div class="flex items-center justify-between text-xs">
          {#if isSearching}
            <span class="text-surface-400 dark:text-surface-500">
              พบ {totalFiltered} จาก {allLessons.length} บทเรียน
            </span>
          {:else}
            <span></span>
          {/if}
          {#if completedCount > 0}
            <label class="flex items-center gap-1.5 cursor-pointer text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-maha">
              <input
                type="checkbox"
                bind:checked={hideCompleted}
                onchange={() => setHideCompleted(hideCompleted)}
                class="size-3.5 appearance-none rounded border-2 border-surface-300 bg-white
                       dark:border-surface-600 dark:bg-surface-700
                       checked:bg-emerald-600 checked:border-emerald-600
                       checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%2F%3E%3C%2Fsvg%3E')]
                       checked:bg-center checked:bg-no-repeat
                       transition-maha cursor-pointer"
              />
              ซ่อนบทเรียนที่เรียนแล้ว ({completedCount})
            </label>
          {/if}
        </div>
      </div>

      <!-- Progress bar -->
      <div class="mt-8 max-w-sm mx-auto">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-surface-700 dark:text-surface-300">
            ความคืบหน้า: {completedCount}/{overview.totalLessons}
          </span>
          <span class="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{progressPercent}%</span>
        </div>
        <div class="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2.5 overflow-hidden">
          <div
            class="bg-emerald-500 h-2.5 rounded-full transition-all duration-500 ease-out"
            style="width: {progressPercent}%"
          ></div>
        </div>
        {#if completedCount > 0}
          <div class="flex items-center justify-center gap-3 mt-3">
            <button onclick={startQuiz} class="mha-btn mha-btn-primary mha-btn-sm">
              Quiz ทบทวน
            </button>
            <button onclick={handleReset} class="text-xs text-surface-400 dark:text-surface-500 hover:text-red-500 dark:hover:text-red-400 transition-maha">
              รีเซ็ตความคืบหน้า
            </button>
          </div>
        {/if}
      </div>
    </div>

    <!-- Sections -->
    {#if isSearching && totalFiltered === 0}
      <div class="mha-empty mt-8 animate-maha-fade-in">
        <div class="mha-empty-icon flex items-center justify-center">
          <span class="material-symbols-outlined text-4xl text-surface-300">search</span>
        </div>
        <div class="mha-empty-title">ไม่พบบทเรียนที่ค้นหา</div>
        <div class="mha-empty-description">
          ลองค้นหาด้วยคำอื่น หรือดูบทเรียนทั้งหมดด้านล่าง
        </div>
        <button onclick={() => (searchQuery = '')} class="mha-btn mha-btn-outline mha-btn-sm mt-3">
          แสดงทั้งหมด
        </button>
      </div>
    {/if}

    {#each filteredSections as section, si}
      {@const sectionDone = section.lessons.filter(l => l.completed).length}
      {@const isCollapsed = collapsedSections.has(section.section)}

      <div class="mb-6 animate-maha-fade-in" style="animation-delay: {si * 80}ms">
        <!-- Section header -->
        <button
          onclick={() => toggleSection(section.section)}
          class="w-full flex items-center gap-3 px-1 py-2 mb-3 text-left hover:opacity-80 transition-maha"
        >
          <span class="text-lg transition-transform duration-200 text-surface-500 dark:text-surface-400" class:rotate-90={!isCollapsed}>
            ▶
          </span>
          <h2 class="text-lg font-semibold text-surface-800 dark:text-surface-200 flex-1" style="font-family: var(--font-family-heading); letter-spacing: -0.01em;">
            {section.label}
          </h2>
          <span class="mha-badge mha-badge-sm mha-badge-default">
            {sectionDone}/{section.lessons.length}
          </span>
        </button>

        {#if !isCollapsed || isSearching}
          <div class="grid gap-3 sm:grid-cols-2">
            {#each section.lessons as lesson, i}
              <button
                onclick={() => navigate(`lesson/${lesson.slug}`)}
                class="mha-card text-left cursor-pointer transition-all duration-200 hover:-translate-y-0.5 group"
                style="animation-delay: {i * 40}ms"
              >
                <div class="mha-card-body flex gap-3 p-4">
                  <div class="flex-shrink-0 w-10 h-10 rounded flex items-center justify-center
                    {lesson.completed ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-surface-100 dark:bg-surface-700 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-colors'}">
                    <span class="material-symbols-outlined text-xl {lesson.completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-surface-500 dark:text-surface-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}">{lesson.emoji}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 mb-0.5">
                      <span class="text-xs font-medium text-surface-400 dark:text-surface-500 bg-surface-100 dark:bg-surface-700 rounded px-1.5 py-0.5" style="font-family: var(--font-family-heading); letter-spacing: 0.02em;">
                        บทที่ {lesson.number}
                      </span>
                      {#if lesson.completed}
                        <span class="mha-badge mha-badge-sm mha-badge-success">✓</span>
                      {/if}
                    </div>
                    <h3 class="font-semibold text-surface-900 dark:text-surface-100 text-sm group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-maha leading-snug" style="font-family: var(--font-family-heading);">
                      {lesson.title}
                    </h3>
                    <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {lesson.summary}
                    </p>
                  </div>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}

    <!-- All done -->
    {#if completedCount === allLessons.length && allLessons.length > 0}
      <div id="all-done" class="mha-empty mt-12 animate-maha-fade-in">
        <div class="mha-empty-icon flex items-center justify-center">
          <span class="material-symbols-outlined text-4xl text-surface-300">celebration</span>
        </div>
        <div class="mha-empty-title">คุณเรียนครบทุกบทแล้ว!</div>
        <div class="mha-empty-description">
          ยอดเยี่ยม! คุณได้เรียนรู้ {allLessons.length} บทเรียน พร้อมสำหรับการสัมภาษณ์ครั้งต่อไป
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- Quiz overlay -->
{#if showQuiz && quizQuestions.length > 0}
  <FlashQuiz questions={quizQuestions} onClose={closeQuiz} />
{/if}

<script lang="ts">
  import { getLesson, revealAnswer, getNextLessonSlug, listLessons } from './lessons-api';
  import { highlightCodeBlocks } from './syntax-highlight';
  import { isCompleted, markCompleted } from './progress-store';
  import { vocabTooltip } from './vocab-tooltip-action';
  import type { Lesson, LessonMeta, AttemptOption } from 'shared';
  let { slug, navigate, sectionHash = '' }: { slug: string; navigate: (to: string) => void; sectionHash?: string } = $props();

  let lesson = $state<Lesson | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let completed = $state(false);

  // Completion state
  let showCompletion = $state(false);
  let nextLessonMeta = $state<LessonMeta | null>(null);
  
  // Learning loop state
  let currentStep = $state(0);
  let selectedOption = $state<number | null>(null);
  let showFeedback = $state(false);
  let checkpointRevealed = $state(false);
  let checkpointAnswer = $state<string | null>(null);
  let checkpointNote = $state('');

  const totalSteps = $derived(lesson ? lesson.sections.length : 0);
  const currentSection = $derived(lesson?.sections[currentStep] ?? null);

  // Merged sections for progress bar: only merge reflect + trailing related sections
  const mergedSections = $derived.by(() => {
    if (!lesson) return [];
    const result: { idx: number; types: string[] }[] = [];
    let i = 0;
    while (i < lesson.sections.length) {
      const s = lesson.sections[i];
      if (s.type === 'reflect') {
        // Collect reflect + any trailing non-interactive sections (related, etc.)
        const types: string[] = [s.type];
        i++;
        const interactive = new Set(['attempt', 'checkpoint']);
        while (i < lesson.sections.length && !interactive.has(lesson.sections[i].type)) {
          types.push(lesson.sections[i].type);
          i++;
        }
        result.push({ idx: i - types.length, types });
      } else {
        result.push({ idx: i, types: [s.type] });
        i++;
      }
    }
    return result;
  });

  const mergedTotalSteps = $derived(mergedSections.length);
  const mergedCurrentIdx = $derived.by(() => {
    // Find which merged group contains currentStep
    for (let g = 0; g < mergedSections.length; g++) {
      const group = mergedSections[g];
      const start = group.idx;
      const end = start + group.types.length;
      if (currentStep >= start && currentStep < end) return g;
    }
    return mergedSections.length - 1;
  });

  // Merge reflect + trailing related sections into one view
  const trailingSections = $derived.by(() => {
    if (!lesson || !currentSection) return [];
    // Only merge when current section is reflect
    if (currentSection.type !== 'reflect') return [];
    const interactive = new Set(['attempt', 'checkpoint']);
    const extras: typeof lesson.sections = [];
    for (let i = currentStep + 1; i < lesson.sections.length; i++) {
      const s = lesson.sections[i];
      if (interactive.has(s.type)) break;
      extras.push(s);
    }
    return extras;
  });

  const isLastStep = $derived(currentStep + trailingSections.length >= totalSteps - 1);

  let lastLoadedSlug = $state<string | null>(null);

  $effect(() => {
    // Only reload if slug actually changed
    if (slug !== lastLoadedSlug) {
      loadLesson();
    }
  });

  // Jump to section specified by URL hash (on load + browser back/forward)
  let lastSectionHash = $state('');
  $effect(() => {
    if (lesson && sectionHash && sectionHash !== lastSectionHash) {
      lastSectionHash = sectionHash;
      jumpToSection(sectionHash);
    }
  });

  // Sync URL hash with current section
  $effect(() => {
    if (lesson && currentSection) {
      const hash = `lesson/${slug}#${currentSection.type}`;
      if (window.location.hash.slice(1) !== hash) {
        window.history.replaceState(null, '', `#${hash}`);
      }
    }
  });

  function loadLesson() {
    loading = true;
    error = null;
    currentStep = 0;
    selectedOption = null;
    showFeedback = false;
    checkpointRevealed = false;
    checkpointAnswer = null;
    checkpointNote = '';
    showCompletion = false;
    nextLessonMeta = null;
    lastLoadedSlug = slug;

    try {
      const data = getLesson(slug);
      if (!data) throw new Error(`Lesson not found: ${slug}`);
      lesson = data;
      completed = isCompleted(slug);
      // Auto-reveal checkpoint answer if lesson is completed
      if (completed) {
        const cpIdx = data.sections?.findIndex(s => s.type === 'checkpoint');
        if (cpIdx != null && cpIdx >= 0) {
          const ans = revealAnswer(slug, cpIdx);
          checkpointAnswer = ans ?? null;
          checkpointRevealed = true;
        }
      }
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  function selectOption(index: number) {
    selectedOption = index;
    showFeedback = true;
  }

  function nextStep() {
    selectedOption = null;
    showFeedback = false;
    checkpointRevealed = false;
    checkpointAnswer = null;
    checkpointNote = '';
    
    // Skip over trailing sections that were merged into current view
    const skip = trailingSections.length;
    if (currentStep + skip + 1 < totalSteps) {
      currentStep += skip + 1;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function prevStep() {
    selectedOption = null;
    showFeedback = false;
    checkpointRevealed = false;
    checkpointAnswer = null;
    checkpointNote = '';
    
    if (currentStep > 0) {
      currentStep--;
      // If we landed on a section that would have been merged by a previous reflect, 
      // go back one more to land on the reflect that merges them together
      if (currentStep > 0 && currentSection?.type !== 'reflect' && currentSection?.type !== 'attempt' && currentSection?.type !== 'checkpoint') {
        const prevType = lesson?.sections[currentStep - 1]?.type;
        if (prevType === 'reflect') {
          currentStep--;
        }
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Jump to a merged step index (from progress bar tap) */
  function goToMergedStep(mergedIdx: number) {
    if (!lesson || mergedIdx >= mergedSections.length) return;
    const group = mergedSections[mergedIdx];
    if (!group) return;
    
    selectedOption = null;
    showFeedback = false;
    checkpointRevealed = false;
    checkpointAnswer = null;
    checkpointNote = '';
    currentStep = group.idx;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Jump to a section by type name (orient, attempt, feedback, explain, extend, checkpoint, reflect) */
  function jumpToSection(typeName: string) {
    if (!lesson) return;
    const idx = lesson.sections.findIndex(s => s.type === typeName);
    if (idx < 0) return;
    // Find which merged group contains this section index
    for (let g = 0; g < mergedSections.length; g++) {
      const group = mergedSections[g];
      const start = group.idx;
      const end = start + group.types.length;
      if (idx >= start && idx < end) {
        goToMergedStep(g);
        return;
      }
    }
  }

  function revealCheckpoint() {
    if (!checkpointRevealed) {
      const cpIdx = lesson?.sections.findIndex(s => s.type === 'checkpoint');
      if (cpIdx == null || cpIdx < 0) {
        checkpointAnswer = '<p>(ไม่พบเฉลยสำหรับบทเรียนนี้)</p>';
        checkpointRevealed = true;
        return;
      }
      const answer = revealAnswer(slug, cpIdx);
      checkpointAnswer = answer ?? '<p>(ไม่พบเฉลยสำหรับบทเรียนนี้)</p>';
      checkpointRevealed = true;
    }
  }

  function completeLesson() {
    if (showCompletion) return; // guard against double-click
    markCompleted(slug);
    completed = true;

    // Find next lesson in sequence
    const nextSlug = getNextLessonSlug(slug);
    if (nextSlug) {
      const allLessons = listLessons().sections.flatMap((s) => s.lessons);
      nextLessonMeta = allLessons.find((l) => l.slug === nextSlug) ?? null;
    } else {
      nextLessonMeta = null;
    }
    showCompletion = true;

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goNextLesson() {
    const next = nextLessonMeta;
    if (next) {
      showCompletion = false;
      nextLessonMeta = null;
      navigate(`lesson/${next.slug}`);
    }
  }

  function getOptionStyle(option: AttemptOption, index: number, optionLength: number): string {
    if (!showFeedback || selectedOption === null) {
      return 'border-surface-200 dark:border-surface-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:border-emerald-400 dark:hover:bg-emerald-900/20';
    }
    if (option.level === 'correct') return 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20';
    if (index === selectedOption && option.level === 'incorrect') return 'border-red-500 dark:border-red-600 bg-red-50 dark:bg-red-900/20';
    if (index === selectedOption && option.level === 'partial') return 'border-amber-500 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20';
    return 'border-surface-200 dark:border-surface-600 opacity-60 dark:opacity-40';
  }

  function highlightOnUpdate(node: HTMLElement, _step?: number) {
    // Run after DOM settles
    requestAnimationFrame(() => {
      requestAnimationFrame(() => highlightCodeBlocks(node));
    });
    return {
      update(_newStep?: number) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => highlightCodeBlocks(node));
        });
      },
    };
  }
</script>

<div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
  {#if loading}
    <div class="flex items-center justify-center py-20">
      <div class="flex flex-col items-center gap-4">
        <svg class="mha-spinner mha-spinner-xl" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    </div>
  {:else if error}
    <div class="mha-alert mha-alert-error">
      <div class="mha-alert-title">เกิดข้อผิดพลาด</div>
      <div class="mha-alert-body">{error}</div>
    </div>
    <button onclick={() => navigate('overview')} class="mha-btn mha-btn-outline mha-btn-sm mt-4">
      ← กลับหน้าหลัก
    </button>
  {:else if lesson}
    <!-- Back + Meta -->
    <div class="mb-6">
      <button
        onclick={() => navigate('overview')}
        class="text-sm text-surface-500 dark:text-surface-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-maha inline-flex items-center gap-1 mb-4"
      >
        ← กลับหน้าหลัก
      </button>

      <div class="flex items-center gap-3 mb-2">
        <div class="flex-shrink-0 w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
          <span class="material-symbols-outlined text-3xl text-emerald-600 dark:text-emerald-400">{lesson.meta.emoji}</span>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="mha-badge mha-badge-sm mha-badge-default">บทที่ {lesson.meta.number}</span>
            <span class="text-xs text-surface-400 dark:text-surface-500">{lesson.meta.duration}</span>
            {#if completed}
              <span class="mha-badge mha-badge-sm mha-badge-success">✓ ผ่านแล้ว</span>
            {/if}
          </div>
          <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-100 mt-1">{lesson.meta.title}</h1>
        </div>
      </div>
    </div>

    <!-- Step Progress (clickable — tap any step icon to jump) -->
    <div class="mb-8">
      <div class="flex items-center gap-1.5 mb-3">
        {#each mergedSections as group, gi}
          {@const types = group.types}
          {@const firstType = types[0]}
          {@const stepIcon = firstType === 'orient' ? 'explore' :
            firstType === 'attempt' ? 'science' :
            firstType === 'feedback' ? 'forum' :
            firstType === 'explain' ? 'menu_book' :
            firstType === 'extend' ? 'biotech' :
            firstType === 'checkpoint' ? 'fact_check' :
            firstType === 'reflect' ? 'psychology' : 'psychology'}
          {@const isActive = gi === mergedCurrentIdx}
          {@const isPast = gi < mergedCurrentIdx}
          <div
            class="flex-1 h-1.5 rounded-full transition-all duration-300"
            class:bg-maha-500={isPast}
            class:dark:bg-maha-600={isPast}
            class:bg-maha-400={isActive}
            class:dark:bg-maha-500={isActive}
            class:bg-surface-200={gi > mergedCurrentIdx}
            class:dark:bg-surface-700={gi > mergedCurrentIdx}
          ></div>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <button
            onclick={() => goToMergedStep(gi)}
            class="cursor-pointer transition-all duration-200 rounded-full p-0.5 -m-0.5"
            class:hover:bg-surface-200={!isActive}
            class:dark:hover:bg-surface-700={!isActive}
            aria-label="ไปขั้นตอนที่ {gi + 1}"
          >
            <span
              class="material-symbols-outlined text-[1rem] transition-all duration-200"
              class:text-surface-700={gi <= mergedCurrentIdx}
              class:dark:text-surface-300={gi <= mergedCurrentIdx}
              class:text-surface-300={gi > mergedCurrentIdx}
              class:dark:text-surface-600={gi > mergedCurrentIdx}
            >{stepIcon}</span>
          </button>
        {/each}
      </div>
      <span class="text-xs text-surface-400 dark:text-surface-500 flex items-center gap-1">
        ขั้นตอนที่ {mergedCurrentIdx + 1} จาก {mergedTotalSteps} — 
        {#if currentSection?.type === 'orient'}<span class="material-symbols-outlined text-[0.875rem]">explore</span> ปฐมนิเทศ
        {:else if currentSection?.type === 'attempt'}<span class="material-symbols-outlined text-[0.875rem]">science</span> ลองทำ
        {:else if currentSection?.type === 'feedback'}<span class="material-symbols-outlined text-[0.875rem]">forum</span> ผลตอบรับ
        {:else if currentSection?.type === 'explain'}<span class="material-symbols-outlined text-[0.875rem]">menu_book</span> คำอธิบาย
        {:else if currentSection?.type === 'extend'}<span class="material-symbols-outlined text-[0.875rem]">biotech</span> ขยายความ
        {:else if currentSection?.type === 'checkpoint'}<span class="material-symbols-outlined text-[0.875rem]">fact_check</span> จุดตรวจสอบ
        {:else}<span class="material-symbols-outlined text-[0.875rem]">psychology</span> สะท้อนคิด{/if}
      </span>
    </div>

    <!-- Current Step Content -->
    <div class="mha-card-static animate-maha-slide-up" use:highlightOnUpdate={currentStep} use:vocabTooltip>
      <div class="mha-card-body">
        <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-4 flex items-center gap-2">
          {@html currentSection?.title || ''}
        </h2>

        {#if currentSection}
          {#if currentSection.type === 'attempt'}
            <!-- Attempt: Show question + options -->
            <div class="prose prose-sm max-w-none text-surface-700 dark:text-surface-300 mb-6">
              {@html currentSection.content || ''}
            </div>
            <div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 mb-4 border border-surface-200 dark:border-surface-700">
              <p class="font-medium text-surface-900 dark:text-surface-100 mb-4">{@html currentSection.attemptQuestion || ''}</p>
              <div class="space-y-2">
                {#each currentSection.attemptOptions as option, i}
                  <button
                    onclick={() => selectOption(i)}
                    disabled={showFeedback}
                    class="w-full text-left p-3 rounded-lg border-2 transition-all duration-200 text-sm {getOptionStyle(option, i, currentSection.attemptOptions?.length ?? 0)}"
                    class:cursor-pointer={!showFeedback}
                    class:cursor-default={showFeedback}
                  >
                    <div class="flex items-start gap-2">
                      <span class="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold mt-0.5
                        {showFeedback && selectedOption === i ? (option.level === 'correct' ? 'border-green-500 dark:border-green-400 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30' : option.level === 'partial' ? 'border-amber-500 dark:border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30' : 'border-red-500 dark:border-red-400 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30') : 'border-surface-300 dark:border-surface-500 text-surface-500 dark:text-surface-400'}">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span class="flex-1">{option.text}</span>
                    </div>
                  </button>
                {/each}
              </div>
            </div>

            {#if showFeedback && selectedOption !== null}
              {@const options = currentSection.attemptOptions ?? []}
              {@const opt = options[selectedOption]}
              {#if opt}
                <div class="mha-alert {opt.level === 'correct' ? 'mha-alert-success' : opt.level === 'partial' ? 'mha-alert-warning' : 'mha-alert-error'} animate-maha-scale-in">
                  <div class="mha-alert-body prose prose-sm max-w-none text-surface-700">{@html opt.analysis}</div>
                </div>
              {/if}
            {/if}

          {:else if currentSection.type === 'checkpoint'}
            <!-- Checkpoint -->
            <div class="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-5 border border-blue-200 dark:border-blue-800">
              <h3 class="text-xs font-semibold text-blue-500 dark:text-blue-300 mb-4 uppercase tracking-wider">Quick Check</h3>
              <div class="text-base text-blue-900 dark:text-blue-200 mb-5 leading-relaxed prose prose-sm max-w-none">
                {@html currentSection.checkpointQuestion || ''}
              </div>

              <!-- Note field — auto-expanding -->
              <textarea
                bind:value={checkpointNote}
                placeholder="เขียนคำตอบหรือโน้ตของคุณตรงนี้... (จะไม่ถูกบันทึกถาวร)"
                rows="4"
                disabled={checkpointRevealed}
                oninput={(e) => { const t = e.currentTarget as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                class="w-full rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-surface-800 px-3 py-3 text-sm text-surface-800 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500
                       focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                       transition-maha resize-none disabled:bg-blue-50/50 dark:disabled:bg-blue-950/20 disabled:text-surface-500 dark:disabled:text-surface-400"
              ></textarea>

              <div class="flex items-center justify-between mt-3">
                {#if !checkpointRevealed}
                  <span class="text-xs text-blue-500 dark:text-blue-300">💭 ลองเขียนคำตอบของคุณก่อน</span>
                  <button
                    onclick={revealCheckpoint}
                    class="mha-btn mha-btn-primary mha-btn-sm"
                  >
                    ดูเฉลย
                  </button>
                {:else}
                  <span class="text-xs text-blue-500 dark:text-blue-300">💡 เปรียบเทียบคำตอบของคุณกับเฉลย</span>
                {/if}
              </div>

              {#if checkpointRevealed}
                <div class="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                  <p class="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">💡 เฉลย</p>
                  <div class="text-sm text-surface-700 dark:text-surface-300 leading-relaxed prose prose-sm max-w-none">
                    {@html checkpointAnswer || ''}
                  </div>

                  {#if checkpointNote.trim()}
                    <div class="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700">
                      <p class="text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">📝 คำตอบของคุณ</p>
                      <p class="text-sm text-surface-600 dark:text-surface-300 whitespace-pre-wrap leading-relaxed">{checkpointNote}</p>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>

          {:else}
            <!-- Other sections: show content + any trailing non-interactive sections -->
            <div class="prose prose-sm max-w-none text-surface-700 dark:text-surface-300">
              {@html currentSection.content || ''}

              {#each trailingSections as ts}
                <hr class="my-6" />
                <h3>{@html ts.title || ''}</h3>
                {@html ts.content || ''}
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    </div>

    <!-- Navigation -->
    <div class="flex items-center justify-between mt-6">
      <button
        onclick={prevStep}
        disabled={currentStep === 0}
        class="mha-btn mha-btn-outline mha-btn-sm disabled:opacity-30 dark:disabled:opacity-40"
      >
        ← ย้อนกลับ
      </button>

      <div class="flex items-center gap-2">
        {#if !isLastStep}
          <button
            onclick={nextStep}
            class="mha-btn mha-btn-primary mha-btn-sm"
          >
            ถัดไป →
          </button>
        {:else}
          <button
            onclick={completeLesson}
            class="mha-btn mha-btn-primary mha-btn-sm"
            class:mha-btn-success={completed}
            disabled={showCompletion}
          >
            {completed ? '✓ เรียนจบแล้ว' : '🎉 จบบทเรียน'}
          </button>
        {/if}
      </div>
    </div>

    <!-- Completion screen -->
    {#if showCompletion}
      <div class="mt-8 animate-maha-slide-up">
        <div class="mha-card-static p-6 sm:p-8 text-center border-2 border-green-200 dark:border-green-800">
          <div class="text-5xl mb-3">🎉</div>
          <h3 class="text-xl font-bold text-surface-900 dark:text-surface-100 mb-1">เรียนจบบทเรียนแล้ว!</h3>
          <p class="text-surface-600 dark:text-surface-300 text-sm mb-6">
            {lesson?.meta.emoji} {lesson?.meta.title}
          </p>

          {#if nextLessonMeta}
            <button
              onclick={goNextLesson}
              class="mha-card text-left cursor-pointer hover:shadow-maha-md transition-all duration-200 hover:-translate-y-0.5 w-full max-w-sm mx-auto mb-4"
            >
              <div class="mha-card-body flex gap-3 p-4">
                <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-maha-50 dark:bg-maha-900/20 flex items-center justify-center">
                  <span class="material-symbols-outlined text-xl text-maha-600 dark:text-maha-500">{nextLessonMeta.emoji}</span>
                </div>
                <div class="flex-1 min-w-0 text-left">
                  <div class="flex items-center gap-1.5 mb-0.5">
                    <span class="text-xs font-medium text-surface-500 dark:text-surface-300 bg-surface-100 dark:bg-surface-700 rounded px-1 py-0.5">
                      บทที่ {nextLessonMeta.number}
                    </span>
                  </div>
                  <h4 class="font-semibold text-surface-900 dark:text-surface-100 text-sm leading-snug">
                    {nextLessonMeta.title}
                  </h4>
                  <p class="text-xs text-surface-500 dark:text-surface-300 mt-0.5 line-clamp-2">
                    {nextLessonMeta.summary}
                  </p>
                </div>
              </div>
            </button>
            <div class="flex items-center justify-center gap-2">
              <button onclick={goNextLesson} class="mha-btn mha-btn-primary mha-btn-sm">
                ไปบทเรียนถัดไป →
              </button>
              <button onclick={() => navigate('overview')} class="mha-btn mha-btn-secondary mha-btn-sm">
                กลับหน้าหลัก
              </button>
            </div>
          {:else}
            <p class="text-surface-600 dark:text-surface-300 text-sm mb-4">
              🏆 คุณเรียนครบทุกบทเรียนแล้ว!
            </p>
            <button onclick={() => { sessionStorage.setItem('scroll-to-done', '1'); navigate('overview'); }} class="mha-btn mha-btn-primary mha-btn-sm">
              กลับหน้าหลัก
            </button>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
  
</div>



<script lang="ts">
  import type { QuizQuestion } from './lessons-api';

  let {
    questions,
    onClose,
  }: {
    questions: QuizQuestion[];
    onClose: () => void;
  } = $props();

  let currentIndex = $state(0);
  let selectedOption = $state<number | null>(null);
  let answered = $state(false);
  let score = $state(0);
  let finished = $state(false);
  let exiting = $state(false);

  const total = $derived(questions.length);
  const current = $derived(questions[currentIndex]);
  const progress = $derived(((currentIndex + (answered ? 1 : 0)) / total) * 100);

  function selectOption(index: number) {
    if (answered) return;
    selectedOption = index;
    answered = true;
    if (current.options[index].correct) {
      score++;
    }
  }

  function nextQuestion() {
    if (currentIndex < total - 1) {
      currentIndex++;
      selectedOption = null;
      answered = false;
    } else {
      finished = true;
    }
  }

  function handleClose() {
    exiting = true;
    setTimeout(() => onClose(), 200);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (finished || exiting) return;
    if (!answered) {
      const num = parseInt(e.key);
      if (num >= 1 && num <= current.options.length) {
        selectOption(num - 1);
      }
    } else {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        nextQuestion();
      }
    }
    if (e.key === 'Escape') handleClose();
  }

  function getOptionClass(index: number): string {
    if (!answered) {
      return 'border-surface-200 dark:border-surface-600 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:border-emerald-400 dark:hover:bg-emerald-900/20 cursor-pointer';
    }
    if (current.options[index].correct) {
      return 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20';
    }
    if (index === selectedOption && !current.options[index].correct) {
      return 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20';
    }
    return 'border-surface-200 dark:border-surface-600 opacity-50 dark:opacity-30';
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Overlay -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4 transition-opacity duration-200"
  class:opacity-0={exiting}
  class:opacity-100={!exiting}
  onclick={handleClose}
  onkeydown={(e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); }}
  role="dialog"
  aria-label="Quiz"
  tabindex="-1"
>
  <!-- Quiz card -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="relative w-full max-w-lg bg-white dark:bg-surface-850 rounded-2xl shadow-2xl dark:shadow-maha-dark-lg overflow-hidden transition-all duration-200"
    class:scale-95={exiting}
    class:scale-100={!exiting}
    onclick={(e: MouseEvent) => e.stopPropagation()}
    onkeydown={() => {}}
    role="presentation"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-3 border-b border-surface-200 dark:border-surface-700">
      <div class="flex items-center gap-2">
        <span class="text-lg">Quiz</span>
        <span class="font-semibold text-surface-800 dark:text-surface-200 text-sm">Quiz ทบทวน</span>
        <span class="mha-badge mha-badge-sm mha-badge-primary">{total} ข้อ</span>
      </div>
      <button
        onclick={handleClose}
        class="p-1 rounded-lg text-surface-400 dark:text-surface-500 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 transition-maha"
        aria-label="ปิด"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Progress bar -->
    <div class="h-1 bg-surface-100 dark:bg-surface-700">
      <div
        class="h-full bg-gradient-to-r from-emerald-500 to-emerald-700 dark:from-emerald-400 dark:to-emerald-600 transition-all duration-300"
        style="width: {progress}%"
      ></div>
    </div>

    {#if !finished}
      <!-- Question -->
      <div class="p-6">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-medium text-surface-400 dark:text-surface-500">
            ข้อ {currentIndex + 1} จาก {total}
          </span>
          <span class="text-xs text-surface-300 dark:text-surface-600">·</span>
          <span class="text-xs text-surface-400 dark:text-surface-500">{current.lessonEmoji} {current.lessonTitle}</span>
        </div>
        <div class="text-base font-semibold text-surface-900 dark:text-surface-100 mb-5 leading-relaxed prose prose-sm max-w-none">
          {@html current.question}
        </div>

        <!-- Options -->
        <div class="space-y-2.5">
          {#each current.options as option, i}
            <button
              onclick={() => selectOption(i)}
              disabled={answered}
              class="w-full text-left p-3 rounded-lg border-2 transition-all duration-200 text-sm flex items-start gap-3 {getOptionClass(i)}"
            >
              <span
                class="flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold mt-0.5"
                class:border-surface-300={!answered}
                class:dark:border-surface-500={!answered}
                class:text-surface-500={!answered}
                class:dark:text-surface-400={!answered}
                class:border-green-500={answered && option.correct}
                class:dark:border-green-400={answered && option.correct}
                class:bg-green-500={answered && option.correct}
                class:dark:bg-green-600={answered && option.correct}
                class:border-red-500={answered && selectedOption === i && !option.correct}
                class:dark:border-red-400={answered && selectedOption === i && !option.correct}
                class:bg-red-500={answered && selectedOption === i && !option.correct}
                class:dark:bg-red-600={answered && selectedOption === i && !option.correct}
                class:text-white={answered && (option.correct || selectedOption === i)}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span class="flex-1 pt-0.5">{option.text}</span>
            </button>
          {/each}
        </div>

        <!-- Feedback after answer -->
        {#if answered}
          <div class="mt-4 p-3 rounded-lg {current.options[selectedOption!].correct ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'}">
            <p class="text-sm font-medium {current.options[selectedOption!].correct ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}">
              {current.options[selectedOption!].correct ? '✅ ถูกต้อง!' : '❌ ยังไม่ใช่'}
            </p>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between px-5 py-3 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
        <span class="text-xs text-surface-400 dark:text-surface-500">
          {answered ? 'Enter / → เพื่อข้อต่อไป' : 'กด 1-4 เพื่อเลือกคำตอบ'}
        </span>
        <button
          onclick={nextQuestion}
          disabled={!answered}
          class="mha-btn mha-btn-primary mha-btn-sm disabled:opacity-40"
        >
          {currentIndex < total - 1 ? 'ข้อต่อไป →' : 'ดูผลลัพธ์'}
        </button>
      </div>
    {:else}
      <!-- Results -->
      <div class="p-6 text-center">
        <div class="text-5xl mb-4">
          {score === total ? '🎉' : score >= total * 0.7 ? '👏' : score >= total * 0.4 ? '📚' : '💪'}
        </div>
        <h3 class="text-xl font-bold text-surface-900 dark:text-surface-100 mb-1">
          {score === total ? 'ยอดเยี่ยม!' : score >= total * 0.7 ? 'ดีมาก!' : score >= total * 0.4 ? 'เกือบดีแล้ว!' : 'สู้ต่อไป!'}
        </h3>
        <p class="text-surface-500 dark:text-surface-400 mb-2">
          คุณตอบถูก {score} จาก {total} ข้อ
        </p>
        <div class="w-32 h-2 bg-surface-200 dark:bg-surface-700 rounded-full mx-auto mb-4 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-700 {score === total ? 'bg-green-500 dark:bg-green-400' : score >= total * 0.7 ? 'bg-emerald-500 dark:bg-emerald-400' : score >= total * 0.4 ? 'bg-amber-500 dark:bg-amber-400' : 'bg-red-400 dark:bg-red-500'}"
            style="width: {(score / total) * 100}%"
          ></div>
        </div>

        <!-- Per-question results -->
        <div class="text-left space-y-3 mt-5 max-h-60 overflow-y-auto">
          {#each questions as q, i}
            <div class="flex items-start gap-2 text-sm">
              <span class="flex-shrink-0 w-6 h-6 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center text-xs font-bold text-surface-500 dark:text-surface-400">
                {i + 1}
              </span>
              <div class="flex-1 text-surface-600 dark:text-surface-300 leading-snug prose-sm">
                {@html q.question}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Results footer -->
      <div class="flex items-center justify-center gap-3 px-5 py-3 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
        <button onclick={handleClose} class="mha-btn mha-btn-outline mha-btn-sm">
          ปิด
        </button>
        {#if score < total}
          <button onclick={() => { currentIndex = 0; selectedOption = null; answered = false; score = 0; finished = false; }} class="mha-btn mha-btn-primary mha-btn-sm">
            ลองใหม่
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>

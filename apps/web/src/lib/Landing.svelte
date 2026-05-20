<script lang="ts">
  import { getCompletedCount } from './progress-store';
  import { listLessons } from './lessons-api';

  let { navigate }: { navigate: (to: string) => void } = $props();

  let data: ReturnType<typeof listLessons> | null = $state(null);
  let completedCount = $state(0);

  try {
    data = listLessons();
    completedCount = getCompletedCount();
  } catch (_) {
    data = null;
  }

  const totalLessons = $derived(data?.overview?.totalLessons ?? 79);
  const progressPercent = $derived(totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0);
  const hasProgress = $derived(completedCount > 0);

  // Section count from data
  const sectionCount = $derived(data?.sections?.length ?? 10);
</script>

<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
  <!-- Hero with dot-grid background + high-tech vibe -->
  <section class="relative pt-16 pb-12 sm:pt-28 sm:pb-20 overflow-hidden dot-grid-blueprint bg-surface-50 dark:bg-[#020617]">
    <!-- Ambient emerald glow behind hero content -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-emerald-500/5 dark:bg-emerald-500/8 blur-[120px]"></div>
      <!-- Secondary subtle glow offset for depth -->
      <div class="absolute top-1/3 right-1/4 w-[300px] h-[200px] rounded-full bg-emerald-400/3 dark:bg-emerald-400/5 blur-[80px]"></div>
    </div>

    <div class="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-surface-900 tracking-tight mb-4 dark:text-surface-50" style="font-family: var(--font-family-heading); line-height: 1.35; letter-spacing: -0.02em;">
        System Design<br class="hidden sm:block" />
        <span class="text-emerald-600 dark:text-emerald-400 dark:text-glow-emerald">ที่คุณเข้าใจจริง</span>
      </h1>

    <p class="max-w-xl mx-auto text-lg text-surface-600 dark:text-surface-400 mb-3" style="font-family: var(--font-family-sans); line-height: 1.6;">
      เรียนรู้การออกแบบระบบระดับ Senior ผ่านวิธีการแบบ&nbsp;<em>Learning Loop</em>&nbsp;—
      ลงมือทำก่อน แล้วค่อยเข้าใจทฤษฎี
    </p>

    <p class="max-w-lg mx-auto text-sm text-surface-500 dark:text-surface-500 mb-8">
      {totalLessons} บทเรียน · {sectionCount} หมวดหมู่ · Progressive Learning
    </p>

    <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
      <button
        onclick={() => navigate('overview')}
        class="inline-flex items-center gap-2 px-6 py-3 text-base font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded shadow-sm transition-maha dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:active:bg-emerald-700 dark:text-white"
        style="font-family: var(--font-family-heading); letter-spacing: 0.02em;"
      >
        เริ่มเรียน
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>
      {#if hasProgress}
        <button
          onclick={() => navigate('overview')}
          class="inline-flex items-center gap-2 px-6 py-3 text-base font-semibold text-surface-700 border border-surface-300 hover:bg-surface-100 rounded transition-maha dark:text-surface-200 dark:border-surface-600 dark:hover:bg-surface-800"
          style="font-family: var(--font-family-heading); letter-spacing: 0.02em;"
        >
          เรียนต่อ ({completedCount}/{totalLessons})
        </button>
      {/if}
    </div>

    <!-- Progress indicator (only if started) -->
    {#if hasProgress}
      <div class="mt-8 max-w-sm mx-auto">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-surface-500 dark:text-surface-400" style="font-family: var(--font-family-heading); letter-spacing: 0.05em;">
            PROGRESS
          </span>
          <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{progressPercent}%</span>
        </div>
        <div class="w-full bg-surface-200 dark:bg-surface-800 rounded-full h-1.5 overflow-hidden">
          <div
            class="bg-emerald-500 dark:bg-emerald-400 h-1.5 rounded-full transition-all duration-500 ease-out"
            style="width: {progressPercent}%;"
          ></div>
        </div>
      </div>
    {/if}
    </div>
  </section>

  <!-- Features grid -->
  <section class="pb-12 sm:pb-16">
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="bg-white rounded-lg border border-surface-200 p-6 dark:bg-surface-800 dark:border-surface-700 corner-accent">
        <div class="w-10 h-10 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-600 dark:text-emerald-400">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        <h3 class="text-sm font-semibold text-surface-900 mb-2 dark:text-surface-100" style="font-family: var(--font-family-heading); letter-spacing: -0.01em;">
          Learn by Doing
        </h3>
        <p class="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
          ท้าทายตัวเองด้วยโจทย์ออกแบบระบบก่อน ดูคำอธิบายทีหลัง —
          เหมือนถูกสัมภาษณ์จริง
        </p>
      </div>

      <div class="bg-white rounded-lg border border-surface-200 p-6 dark:bg-surface-800 dark:border-surface-700 corner-accent">
        <div class="w-10 h-10 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-600 dark:text-emerald-400">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <h3 class="text-sm font-semibold text-surface-900 mb-2 dark:text-surface-100" style="font-family: var(--font-family-heading); letter-spacing: -0.01em;">
          Senior-Level Depth
        </h3>
        <p class="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
          CAP Theorem, Database Sharding, Distributed Transactions —
          เนื้อหาเน้น Trade-off และการตัดสินใจระดับ Senior
        </p>
      </div>

      <div class="bg-white rounded-lg border border-surface-200 p-6 dark:bg-surface-800 dark:border-surface-700 corner-accent">
        <div class="w-10 h-10 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-600 dark:text-emerald-400">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <h3 class="text-sm font-semibold text-surface-900 mb-2 dark:text-surface-100" style="font-family: var(--font-family-heading); letter-spacing: -0.01em;">
          Self-Paced
        </h3>
        <p class="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
          บทเรียนสั้น ใช้เวลา ~15 นาทีต่อบท เรียนที่ไหนก็ได้
          ติดตามความคืบหน้าในเบราว์เซอร์
        </p>
      </div>
    </div>
  </section>

  <!-- Philosophy -->
  <section class="pb-14 sm:pb-18">
    <!-- Blueprint divider -->
    <hr class="divider-blueprint max-w-md mx-auto mb-10" />
    <div class="text-center mb-8">
      <span class="inline-block text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-3 dark:text-emerald-400" style="font-family: var(--font-family-heading); letter-spacing: 0.08em;">
        Our Philosophy
      </span>
      <h2 class="text-2xl sm:text-3xl font-bold text-surface-900 tracking-tight mb-2 dark:text-surface-50" style="font-family: var(--font-family-heading); letter-spacing: -0.02em;">
        เขียนแบบ Engineer<br class="sm:hidden" /> ไม่ใช่ Salesperson
      </h2>
      <p class="max-w-md mx-auto text-sm text-surface-500 dark:text-surface-400">
        ไม่มีคำว่า "ดีที่สุด" โดยไม่มีเงื่อนไข ไม่มีเครื่องมือเทพ ไม่มีสูตรสำเร็จรูป
      </p>
    </div>

    <!-- Principle cards -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each [
        { num: '01', title: 'ข้อเท็จจริง ไม่ใช่คำกล่าวอ้าง', desc: 'ทุก claim มีแหล่งอ้างอิง — official docs, RFC, engineering blogs, production data', highlight: 'Verifiable' },
        { num: '02', title: 'ไม่มีเครื่องมือเทพ', desc: 'ทุกตัวเลือกคือ Trade-off — เราบอกทั้งข้อดีและสิ่งที่คุณต้องแลก', highlight: 'No Silver Bullet' },
        { num: '03', title: 'ปัญหา → เครื่องมือ', desc: 'เริ่มจากปัญหาและข้อจำกัดก่อน แล้วค่อยดูว่าเครื่องมือไหนเหมาะสม', highlight: 'Problem First' },
        { num: '04', title: 'ตัดสินใจตามบริบท', desc: 'สิ่งที่ใช้ได้ที่ 1K req/s อาจพังที่ 1M req/s — เราแสดงขอบเขตการตัดสินใจเสมอ', highlight: 'Context Matters' },
        { num: '05', title: 'แสดงต้นทุน ไม่ใช่แค่ผลลัพธ์', desc: 'Redis ให้ sub-ms reads — แต่คุณต้องจัดการ cache invalidation, memory limits, และ consistency', highlight: 'Cost Aware' },
      ] as principle}
        <div class="group relative bg-white rounded-xl border border-surface-200 p-5 hover:border-emerald-200 hover:shadow-lg transition-all duration-300 dark:bg-surface-800 dark:border-surface-700 dark:hover:border-emerald-600 dark:hover:glow-emerald corner-accent">
          <!-- Number badge -->
          <div class="flex items-center gap-3 mb-3">
            <span class="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-bold dark:bg-emerald-900/30 dark:text-emerald-400" style="font-family: var(--font-family-heading);">
              {principle.num}
            </span>
            <div>
              <h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100" style="font-family: var(--font-family-heading); letter-spacing: -0.01em;">
                {principle.title}
              </h3>
              <span class="text-[10px] text-surface-400 uppercase tracking-wider dark:text-surface-500" style="font-family: var(--font-family-heading);">{principle.highlight}</span>
            </div>
          </div>
          <p class="text-xs text-surface-500 dark:text-surface-400 leading-relaxed pl-11">
            {principle.desc}
          </p>
        </div>
      {/each}
    </div>

    <!-- Quote banner -->
    <div class="mt-6 bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200 px-6 py-5 text-center dark:from-emerald-900/20 dark:to-emerald-900/10 dark:border-emerald-800 dark:glow-emerald">
      <svg class="mx-auto mb-3 text-emerald-300 dark:text-emerald-700" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z"/>
      </svg>
      <p class="text-sm text-emerald-800 dark:text-emerald-300 italic" style="font-family: var(--font-family-heading);">
        ไม่มีบทเรียนไหนบอกว่า "ใช้ X สิ" — เราบอกว่า<br class="sm:hidden" /> "X เหมาะเมื่อ... แต่คุณจะต้องแลกด้วย..."
      </p>
    </div>
  </section>

  <!-- Topic categories preview -->
  <section class="pb-16 sm:pb-20">
    <!-- Blueprint divider -->
    <hr class="divider-blueprint max-w-md mx-auto mb-10" />
    <div class="mb-6">
      <h2 class="text-xs font-semibold text-surface-400 uppercase tracking-widest mb-4 dark:text-surface-500" style="font-family: var(--font-family-heading);">
        Topics
      </h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each data?.sections ?? [] as section}
          <button
            onclick={() => navigate('overview')}
            class="group text-left bg-white rounded-lg border border-surface-200 px-5 py-4 hover:border-emerald-300 hover:shadow-maha-sm transition-maha dark:bg-surface-800 dark:border-surface-600 dark:hover:border-emerald-600"
          >
            <div class="flex items-center justify-between mb-1">
              <h3 class="text-sm font-semibold text-surface-900 group-hover:text-emerald-700 dark:text-surface-100 dark:group-hover:text-emerald-400 transition-maha" style="font-family: var(--font-family-heading);">
                {section.label}
              </h3>
              <span class="text-xs text-surface-400 dark:text-surface-500" style="font-family: var(--font-family-heading);">
                {section.lessons.length} lessons
              </span>
            </div>
            <p class="text-xs text-surface-500 dark:text-surface-400 line-clamp-1">
              {section.lessons.slice(0, 3).map(l => l.title).join(' · ')}
            </p>
          </button>
        {/each}
      </div>
    </div>
  </section>
</div>

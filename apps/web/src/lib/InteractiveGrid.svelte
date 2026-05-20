<script lang="ts">
  import { onMount } from 'svelte';

  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let containerEl = $state<HTMLDivElement | null>(null);

  // Grid and animation configurations
  const spacing = 24;
  const dotRadiusDefault = 1.0;
  const dotRadiusHover = 2.25;
  const maxDist = 120;
  const pushStrength = 36;
  const springTension = 0.035;
  const damping = 0.82;

  interface Dot {
    originX: number;
    originY: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    glow: number;
  }

  let dots: Dot[] = [];
  let mx = $state(-9999);
  let my = $state(-9999);
  let isHovered = $state(false);
  let animationId = 0;
  let isDark = $state(false);

  // Handle document theme tracking
  function updateTheme() {
    if (typeof document !== 'undefined') {
      isDark = document.documentElement.classList.contains('dark');
    }
  }

  // Initialize and resize canvas
  function resize() {
    if (!canvasEl || !containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvasEl.width = rect.width * dpr;
    canvasEl.height = rect.height * dpr;
    canvasEl.style.width = `${rect.width}px`;
    canvasEl.style.height = `${rect.height}px`;

    const ctx = canvasEl.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    initDots(rect.width, rect.height);
  }

  // Generate dot grid positions
  function initDots(width: number, height: number) {
    const cols = Math.ceil(width / spacing) + 1;
    const rows = Math.ceil(height / spacing) + 1;
    const offsetX = (width % spacing) / 2;
    const offsetY = (height % spacing) / 2;

    const newDots: Dot[] = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const originX = c * spacing + offsetX;
        const originY = r * spacing + offsetY;
        newDots.push({
          originX,
          originY,
          x: originX,
          y: originY,
          vx: 0,
          vy: 0,
          glow: 0,
        });
      }
    }
    dots = newDots;
  }

  // Mouse/Touch move handlers
  function handleMouseMove(e: MouseEvent) {
    if (!containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    mx = e.clientX - rect.left;
    my = e.clientY - rect.top;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!containerEl || e.touches.length === 0) return;
    const rect = containerEl.getBoundingClientRect();
    mx = e.touches[0].clientX - rect.left;
    my = e.touches[0].clientY - rect.top;
  }

  function handleMouseEnter() {
    isHovered = true;
  }

  function handleMouseLeave() {
    isHovered = false;
    mx = -9999;
    my = -9999;
  }

  onMount(() => {
    updateTheme();

    // Resize observer to track dimensions
    const resizeObserver = new ResizeObserver(() => resize());
    if (containerEl) {
      resizeObserver.observe(containerEl);
    }

    // Theme mutation observer to track dark mode classes
    const themeObserver = new MutationObserver(() => updateTheme());
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Initial setup
    resize();

    // Start drawing loop
    function loop() {
      draw();
      animationId = requestAnimationFrame(loop);
    }
    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      themeObserver.disconnect();
    };
  });

  // Main draw function
  function draw() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    // Dynamic color values from current theme
    const baseColor = isDark ? [148, 163, 184, 0.08] : [15, 23, 42, 0.08]; // Slate base
    const activeColor = isDark ? [52, 211, 153, 0.75] : [5, 150, 105, 0.75]; // Emerald active

    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];

      // Distance from cursor to dot origin
      const dx = dot.originX - mx;
      const dy = dot.originY - my;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let targetX = dot.originX;
      let targetY = dot.originY;
      let targetGlow = 0;

      if (isHovered && dist < maxDist) {
        const force = (maxDist - dist) / maxDist; // Linear factor [0, 1]
        // Push dots away from cursor
        targetX = dot.originX + (dx / dist) * force * pushStrength;
        targetY = dot.originY + (dy / dist) * force * pushStrength;
        targetGlow = force;
      }

      // Spring physics
      const ax = (targetX - dot.x) * springTension;
      const ay = (targetY - dot.y) * springTension;
      dot.vx = (dot.vx + ax) * damping;
      dot.vy = (dot.vy + ay) * damping;
      dot.x += dot.vx;
      dot.y += dot.vy;

      // Glow interpolation
      dot.glow += (targetGlow - dot.glow) * 0.1;

      // Render dot
      const r = baseColor[0] + (activeColor[0] - baseColor[0]) * dot.glow;
      const g = baseColor[1] + (activeColor[1] - baseColor[1]) * dot.glow;
      const b = baseColor[2] + (activeColor[2] - baseColor[2]) * dot.glow;
      const a = baseColor[3] + (activeColor[3] - baseColor[3]) * dot.glow;

      // Draw faint glow aura
      if (dot.glow > 0.05) {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dotRadiusHover * 2.5 * dot.glow, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${activeColor[0]}, ${activeColor[1]}, ${activeColor[2]}, ${dot.glow * 0.08})`;
        ctx.fill();
      }

      // Draw core dot
      ctx.beginPath();
      const radius = dotRadiusDefault + (dotRadiusHover - dotRadiusDefault) * dot.glow;
      ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
      ctx.fill();
    }
  }
</script>

<div
  bind:this={containerEl}
  class="absolute inset-0 w-full h-full cursor-default select-none pointer-events-auto"
  onmousemove={handleMouseMove}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  ontouchstart={handleMouseEnter}
  ontouchmove={handleTouchMove}
  ontouchend={handleMouseLeave}
  role="presentation"
>
  <canvas
    bind:this={canvasEl}
    class="block w-full h-full pointer-events-none"
  ></canvas>
</div>

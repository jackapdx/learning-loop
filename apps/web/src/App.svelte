<script lang="ts">
  import './styles/global.css';
  import Layout from './lib/Layout.svelte';
  import Landing from './lib/Landing.svelte';
  import Overview from './lib/Overview.svelte';
  import LessonView from './lib/LessonView.svelte';

  type Route = 'landing' | 'overview' | 'lesson';

  let currentRoute = $state<Route>(routeFromHash());
  let currentSlug = $state(slugFromHash());
  let currentSection = $state(sectionFromHash());

  function routeFromHash(): Route {
    const hash = window.location.hash.slice(1);
    if (!hash) return 'landing';
    // Strip section fragment before checking prefix
    const main = hash.split('#')[0];
    if (main.startsWith('lesson/')) return 'lesson';
    if (main === 'overview') return 'overview';
    return 'overview';
  }

  function slugFromHash(): string {
    const hash = window.location.hash.slice(1);
    const main = hash.split('#')[0];
    return main.startsWith('lesson/') ? main.replace('lesson/', '') : '';
  }

  function sectionFromHash(): string {
    const hash = window.location.hash.slice(1);
    const parts = hash.split('#');
    return parts.length > 1 ? parts[1] : '';
  }

  function navigate(to: string) {
    window.location.hash = to;
    currentRoute = routeFromHash();
    currentSlug = slugFromHash();
    currentSection = sectionFromHash();
  }

  function onHashChange() {
    currentRoute = routeFromHash();
    currentSlug = slugFromHash();
    currentSection = sectionFromHash();
  }

  $effect(() => {
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  });
</script>

<Layout>
  {#if currentRoute === 'landing'}
    <Landing {navigate} />
  {:else if currentRoute === 'overview'}
    <Overview {navigate} />
  {:else if currentRoute === 'lesson' && currentSlug}
    <LessonView slug={currentSlug} sectionHash={currentSection} {navigate} />
  {:else}
    <Landing {navigate} />
  {/if}
</Layout>

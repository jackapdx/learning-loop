<script lang="ts">
  interface Props {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    class?: string;
    children: import('svelte').Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    class: className = '',
    children,
    ...rest
  }: Props & Record<string, any> = $props();

  const variantClass = () => ({
    primary: 'mha-btn-primary',
    secondary: 'mha-btn-secondary',
    outline: 'mha-btn-outline',
    ghost: 'mha-btn-ghost',
    danger: 'mha-btn-danger',
  }[variant]);

  const sizeClass = () => `mha-btn-${size}`;
</script>

<!--
  Maha Button — uses shared design tokens from @learning-loop-app/design-tokens.
  CSS classes are defined in the shared components.css:
    .mha-btn, .mha-btn-primary, .mha-btn-sm, etc.
-->
<button
  class="mha-btn {variantClass()} {sizeClass()} {className}"
  disabled={rest.disabled || isLoading}
  {...rest}
>
  {#if isLoading}
    <span class="flex items-center gap-2">
      <svg
        class="mha-spinner mha-spinner-sm"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      Loading...
    </span>
  {:else}
    {@render children()}
  {/if}
</button>

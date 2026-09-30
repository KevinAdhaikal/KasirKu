<script lang="ts">
  interface Props {
    src?: string | null;
    name?: string | null;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    class?: string;
  }

  let {
    src = null,
    name = '',
    size = 'md',
    class: className = '',
  }: Props = $props();

  let hasError = $state(false);

  $effect(() => {
    // Reset error whenever src changes
    src;
    hasError = false;
  });

  const sizeStyles: Record<string, string> = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-6 h-6 text-[11px]',
    md: 'w-7 h-7 text-xs',
    lg: 'w-10 h-10 text-sm font-semibold',
    xl: 'w-12 h-12 text-base font-bold',
  };

  const initial = $derived.by(() => {
    const trimmed = (name || '').trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
  });
</script>

{#if src && !hasError}
  <img
    {src}
    alt={name || 'Avatar'}
    class="{sizeStyles[size] || sizeStyles.md} rounded-full object-cover shrink-0 border border-neutral-200 dark:border-neutral-700/80 {className}"
    onerror={() => {
      hasError = true;
    }}
  />
{:else}
  <div
    class="{sizeStyles[size] || sizeStyles.md} rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 flex items-center justify-center font-bold text-neutral-700 dark:text-neutral-300 shrink-0 select-none {className}"
    title={name || undefined}
  >
    {initial}
  </div>
{/if}

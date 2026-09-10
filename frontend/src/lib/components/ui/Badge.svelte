<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md';
    class?: string;
    children?: Snippet;
  }

  let {
    variant = 'neutral',
    size = 'sm',
    class: className = '',
    children,
  }: Props = $props();

  const variantStyles = {
    neutral: 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700/60',
    success: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
    warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
    danger: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60',
    info: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/60',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 rounded gap-1',
    md: 'text-xs px-2.5 py-1 rounded-md gap-1.5',
  };
</script>

<span class="inline-flex items-center whitespace-nowrap shrink-0 font-medium border tabular-nums {variantStyles[variant]} {sizeStyles[size]} {className}">
  {@render children?.()}
</span>

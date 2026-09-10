<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    class?: string;
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
    [key: string]: any;
  }

  let {
    type = 'button',
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    class: className = '',
    onclick,
    children,
    ...restProps
  }: Props = $props();

  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)]/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99]';

  const variantStyles = {
    primary: 'bg-[var(--brand-action)] text-[var(--accent-fg)] border border-[var(--brand-action-border)] hover:bg-[var(--brand-action-hover)] shadow-[0_1px_2px_var(--shadow-color)]',
    secondary: 'border border-[var(--border-contrast)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] shadow-2xs',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-[0_1px_2px_var(--shadow-color)]',
    ghost: 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-[0_1px_2px_var(--shadow-color)]',
  };

  const sizeStyles = {
    sm: 'h-8 px-2.5 text-xs rounded-md gap-1.5',
    md: 'h-9 px-3.5 text-sm rounded-md gap-2',
    lg: 'h-11 px-5 text-base rounded-md gap-2.5',
  };
</script>

<button
  {type}
  disabled={disabled || loading}
  class="{baseStyles} {variantStyles[variant]} {sizeStyles[size]} {className}"
  {onclick}
  {...restProps}
>
  {#if loading}
    <svg class="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  {/if}
  {@render children?.()}
</button>

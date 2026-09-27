<script lang="ts">
  import { theme } from '../../stores/theme.svelte';
  import { Sun, Moon } from 'lucide-svelte';

  interface Props {
    class?: string;
  }

  let { class: className = '' }: Props = $props();
</script>

<button
  type="button"
  onclick={() => theme.toggle()}
  class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-neutral-600 shadow-[0_1px_1px_rgba(0,0,0,0.04)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] dark:border-[var(--border-subtle)] dark:bg-[var(--bg-surface)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--bg-hover)] dark:hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)]/50 {className}"
  aria-label={theme.isDark ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
  title={theme.isDark ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
>
  {#if theme.isDark}
    <Sun class="w-4 h-4" />
  {:else}
    <Moon class="w-4 h-4" />
  {/if}
</button>

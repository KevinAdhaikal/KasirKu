<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    description?: string;
    class?: string;
    header?: Snippet;
    actions?: Snippet;
    children?: Snippet;
    footer?: Snippet;
    padding?: boolean;
  }

  let {
    title,
    description,
    class: className = '',
    header,
    actions,
    children,
    footer,
    padding = true,
  }: Props = $props();
</script>

<div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] shadow-xs {className}">
  {#if title || header || actions}
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-neutral-200/70 dark:border-neutral-800/80">
      {#if header}
        {@render header()}
      {:else}
        <div class="min-w-0 flex-1">
          {#if title}
            <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
          {/if}
          {#if description}
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{description}</p>
          {/if}
        </div>
      {/if}

      {#if actions}
        <div class="flex items-center gap-2 flex-wrap shrink-0 w-full sm:w-auto justify-start sm:justify-end">
          {@render actions()}
        </div>
      {/if}
    </div>
  {/if}

  <div class={padding ? 'p-3.5 sm:p-5' : ''}>
    {@render children?.()}
  </div>

  {#if footer}
    <div class="px-4 sm:px-5 py-3 border-t border-neutral-200/70 dark:border-neutral-800/80 bg-[var(--bg-subtle)]/60 rounded-b-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      {@render footer()}
    </div>
  {/if}
</div>

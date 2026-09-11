<script lang="ts">
  import { onMount } from 'svelte';
  import Button from './Button.svelte';

  interface Props {
    currentPage?: number;
    pageSize?: number;
    totalItems: number;
    currentItemsCount: number;
    itemLabel?: string;
    limitOptions?: number[];
    storageKey?: string;
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  }

  let {
    currentPage = $bindable(1),
    pageSize = $bindable(10),
    totalItems = 0,
    currentItemsCount = 0,
    itemLabel = 'data',
    limitOptions = [5, 10, 100],
    storageKey,
    onPageChange,
    onPageSizeChange,
  }: Props = $props();

  onMount(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved && limitOptions.includes(Number(saved))) {
        pageSize = Number(saved);
      }
    }
  });

  const totalPages = $derived(Math.ceil(totalItems / pageSize) || 1);

  $effect(() => {
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }
    if (currentPage < 1) {
      currentPage = 1;
    }
  });

  function handleSetPageSize(opt: number) {
    pageSize = opt;
    currentPage = 1;
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, String(opt));
      } catch (_) {}
    }
    onPageSizeChange?.(opt);
  }

  function handlePrev() {
    if (currentPage > 1) {
      currentPage -= 1;
      onPageChange?.(currentPage);
    }
  }

  function handleNext() {
    if (currentPage < totalPages) {
      currentPage += 1;
      onPageChange?.(currentPage);
    }
  }
</script>

<div
  class="p-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-500 bg-[var(--bg-surface)]"
>
  <div class="flex flex-wrap items-center gap-3">
    <div>
      Menampilkan <strong class="text-neutral-900 dark:text-neutral-100 tabular-nums">{currentItemsCount}</strong> dari <span class="tabular-nums font-medium text-neutral-900 dark:text-neutral-100">{totalItems}</span> {itemLabel}
    </div>

    <div class="flex items-center gap-1.5 border-l border-neutral-200 dark:border-neutral-800 pl-3">
      <span class="text-neutral-500 font-medium">Limit:</span>
      <div
        class="inline-flex rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 p-0.5"
        role="group"
        aria-label="Pilih batas jumlah baris per halaman"
      >
        {#each limitOptions as opt}
          <button
            type="button"
            onclick={() => handleSetPageSize(opt)}
            class="px-2.5 py-0.5 rounded text-[11px] font-mono font-medium transition-colors {pageSize === opt
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-2xs font-bold'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'}"
            aria-pressed={pageSize === opt}
            aria-label={`Tampilkan ${opt} ${itemLabel} per halaman`}
          >
            {opt}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <div class="flex items-center gap-2 self-end sm:self-auto">
    <Button
      variant="secondary"
      size="sm"
      disabled={currentPage <= 1}
      onclick={handlePrev}
      aria-label="Halaman sebelumnya"
    >
      Sebelumnya
    </Button>
    <span class="font-mono text-xs text-neutral-700 dark:text-neutral-300 tabular-nums px-1">
      {currentPage} / {totalPages}
    </span>
    <Button
      variant="secondary"
      size="sm"
      disabled={currentPage >= totalPages}
      onclick={handleNext}
      aria-label="Halaman berikutnya"
    >
      Berikutnya
    </Button>
  </div>
</div>

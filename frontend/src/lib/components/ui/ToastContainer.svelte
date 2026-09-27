<script lang="ts">
  import { toast } from '../../stores/toast.svelte';
  import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-svelte';

  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const borderStyles = {
    success: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    error: 'border-red-500/30 text-red-600 dark:text-red-400',
    warning: 'border-amber-500/30 text-amber-600 dark:text-amber-400',
    info: 'border-sky-500/30 text-sky-600 dark:text-sky-400',
  };
</script>

<div class="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0" aria-live="polite">
  {#each toast.toasts as item (item.id)}
    {@const Icon = icons[item.type]}
    <div
      class="pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border bg-[var(--bg-subtle)] text-neutral-900 dark:text-neutral-100 shadow-lg animate-toast-in {borderStyles[item.type]}"
      role="alert"
    >
      <Icon class="w-4 h-4 shrink-0 mt-0.5" />
      <div class="flex-1 min-w-0">
        {#if item.title}
          <p class="text-xs font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p>
        {/if}
        <p class="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed break-words">{item.message}</p>
      </div>
      <button
        type="button"
        onclick={() => toast.remove(item.id)}
        class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5"
        aria-label="Tutup notifikasi"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  {/each}
</div>

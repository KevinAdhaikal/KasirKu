<script lang="ts">
  import { dialog } from '../../stores/dialog.svelte';
  import Button from './Button.svelte';
  import { AlertTriangle, Info, AlertCircle } from 'lucide-svelte';

  function handleKeydown(e: KeyboardEvent) {
    if (!dialog.isOpen) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      dialog.handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      dialog.handleCancel();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if dialog.isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
    role="dialog"
    aria-modal="true"
    aria-labelledby="confirm-dialog-title"
    tabindex="-1"
  >
    <!-- Modal Dialog Card -->
    <div
      class="w-full max-w-md rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] text-neutral-900 dark:text-neutral-100 shadow-xl overflow-hidden scale-100 transition-all"
    >
      <div class="p-5 flex items-start gap-3.5">
        <!-- Icon Badge -->
        {#if dialog.variant === 'danger'}
          <div class="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <AlertCircle class="w-5 h-5" />
          </div>
        {:else if dialog.variant === 'warning'}
          <div class="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle class="w-5 h-5" />
          </div>
        {:else}
          <div class="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-300 shrink-0">
            <Info class="w-5 h-5" />
          </div>
        {/if}

        <div class="flex-1 min-w-0">
          <h3 id="confirm-dialog-title" class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {dialog.title}
          </h3>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
            {dialog.message}
          </p>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="px-5 py-3 border-t border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/30 flex items-center justify-end gap-2">
        <Button variant="secondary" size="sm" onclick={() => dialog.handleCancel()}>
          {dialog.cancelText} (Esc)
        </Button>
        <Button
          variant={dialog.variant === 'danger' ? 'danger' : 'primary'}
          size="sm"
          onclick={() => dialog.handleConfirm()}
        >
          {dialog.confirmText} (Enter)
        </Button>
      </div>
    </div>
  </div>
{/if}

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { sse } from '../../stores/sse.svelte';
  import { X } from 'lucide-svelte';

  interface Props {
    open?: boolean;
    title?: string;
    description?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closeOnEscape?: boolean;
    closeOnBackdrop?: boolean;
    autoFocusFirstInput?: boolean;
    onclose?: () => void;
    children?: Snippet;
    footer?: Snippet;
  }

  let {
    open = $bindable(false),
    title,
    description,
    size = 'lg',
    closeOnEscape = true,
    closeOnBackdrop = true,
    autoFocusFirstInput = true,
    onclose,
    children,
    footer,
  }: Props = $props();

  let modalBoxEl = $state<HTMLElement | null>(null);

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    full: 'max-w-7xl',
  };

  function handleClose() {
    open = false;
    onclose?.();
  }

  $effect(() => {
    if (sse.status !== 'online' && open) {
      handleClose();
    }
  });

  function handleKeydown(e: KeyboardEvent) {
    if (closeOnEscape && e.key === 'Escape' && open) {
      e.stopPropagation();
      handleClose();
    }
  }

  function focusFirstField() {
    if (!modalBoxEl || !open) return;

    // First check if there is an element explicitly requesting autofocus
    const explicit = modalBoxEl.querySelector<HTMLElement>(
      'input[autofocus]:not([disabled]):not([readonly]), textarea[autofocus]:not([disabled]):not([readonly]), select[autofocus]:not([disabled]):not([readonly]), [data-autofocus]:not([disabled]):not([readonly])'
    );
    if (explicit) {
      explicit.focus();
      return;
    }

    // Otherwise find the first interactive input field inside the modal content body
    const contentArea = modalBoxEl.querySelector('.modal-body-content') || modalBoxEl;
    const firstField = contentArea.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), select:not([disabled]):not([readonly])'
    );

    if (firstField) {
      firstField.focus();
    }
  }

  $effect(() => {
    if (typeof document !== 'undefined') {
      if (open) {
        document.body.style.overflow = 'hidden';
        if (autoFocusFirstInput) {
          const t1 = setTimeout(focusFirstField, 40);
          const t2 = setTimeout(focusFirstField, 150);
          return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            document.body.style.overflow = '';
          };
        }
      } else {
        document.body.style.overflow = '';
      }
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden overscroll-contain"
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? 'modal-title' : undefined}
  >
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-[2px] transition-opacity"
      onclick={() => {
        if (closeOnBackdrop) handleClose();
      }}
    ></div>

    <!-- Modal Content Box -->
    <div
      bind:this={modalBoxEl}
      class="relative w-full {sizeStyles[size]} rounded-xl sm:rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] shadow-2xl z-10 transition-transform my-auto flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100vh-3.5rem)] overscroll-contain"
    >
      {#if title}
        <div class="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-200/80 dark:border-neutral-800 flex-shrink-0">
          <div class="min-w-0 flex-1 pr-2">
            <h2 id="modal-title" class="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate">{title}</h2>
            {#if description}
              <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">{description}</p>
            {/if}
          </div>
          <button
            type="button"
            class="p-1.5 -mr-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-[var(--bg-hover)] transition-colors shrink-0"
            onclick={handleClose}
            aria-label="Tutup modal"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      {/if}

      <div class="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto overscroll-contain flex-1 min-h-0 modal-body-content">
        {@render children?.()}
      </div>

      {#if footer}
        <div class="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 rounded-b-xl sm:rounded-b-lg flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 sm:gap-2.5 flex-shrink-0">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}

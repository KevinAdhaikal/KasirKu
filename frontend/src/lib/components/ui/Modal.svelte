<script lang="ts">
  import type { Snippet } from 'svelte';
  import { X } from 'lucide-svelte';

  interface Props {
    open?: boolean;
    title?: string;
    description?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closeOnEscape?: boolean;
    closeOnBackdrop?: boolean;
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
    onclose,
    children,
    footer,
  }: Props = $props();

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

  function handleKeydown(e: KeyboardEvent) {
    if (closeOnEscape && e.key === 'Escape' && open) {
      e.stopPropagation();
      handleClose();
    }
  }

  $effect(() => {
    if (typeof document !== 'undefined') {
      if (open) {
        document.body.style.overflow = 'hidden';
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
    class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
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
      class="relative w-full {sizeStyles[size]} rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] shadow-2xl z-10 transition-transform my-8 flex flex-col max-h-[90vh]"
    >
      {#if title}
        <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-200/80 dark:border-neutral-800">
          <div>
            <h2 id="modal-title" class="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
            {#if description}
              <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{description}</p>
            {/if}
          </div>
          <button
            type="button"
            class="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-[var(--bg-hover)] transition-colors"
            onclick={handleClose}
            aria-label="Tutup modal"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      {/if}

      <div class="px-6 py-5 overflow-y-auto flex-1">
        {@render children?.()}
      </div>

      {#if footer}
        <div class="px-6 py-3.5 border-t border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 rounded-b-lg flex items-center justify-end gap-2.5">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}

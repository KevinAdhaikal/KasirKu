<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronDown, Check } from 'lucide-svelte';

  export interface SelectOption {
    value: string | number;
    label: string;
    disabled?: boolean;
  }

  interface Props {
    id?: string;
    label?: string;
    value?: string | number;
    options?: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    error?: string;
    hint?: string;
    class?: string;
    selectClass?: string;
    onchange?: (e: Event) => void;
    onblur?: (e: FocusEvent) => void;
    onfocus?: (e: FocusEvent) => void;
    children?: Snippet;
    [key: string]: any;
  }

  let {
    id = Math.random().toString(36).substring(2, 9),
    label,
    value = $bindable(''),
    options,
    placeholder,
    disabled = false,
    required = false,
    error,
    hint,
    class: className = '',
    selectClass = '',
    onchange,
    onblur,
    onfocus,
    children,
    ...restProps
  }: Props = $props();

  let isOpen = $state(false);
  let highlightedIndex = $state(-1);
  let parsedOptions = $state<Array<{ value: string; label: string; disabled: boolean }>>([]);

  let containerEl: HTMLDivElement | undefined = $state();
  let triggerEl: HTMLButtonElement | undefined = $state();
  let selectEl: HTMLSelectElement | undefined = $state();
  let dropdownEl: HTMLDivElement | undefined = $state();

  // Guarantee single red asterisk by stripping any hardcoded asterisks from the label string
  let cleanLabel = $derived(label ? label.replace(/\s*\*+\s*$/, '').trim() : '');

  function syncOptions() {
    if (options && options.length > 0) {
      parsedOptions = options.map((opt) => ({
        value: String(opt.value),
        label: opt.label,
        disabled: !!opt.disabled,
      }));
    } else if (selectEl) {
      const list: Array<{ value: string; label: string; disabled: boolean }> = [];
      for (let i = 0; i < selectEl.options.length; i++) {
        const opt = selectEl.options[i];
        list.push({
          value: opt.value,
          label: opt.text || opt.label || opt.value,
          disabled: opt.disabled,
        });
      }
      parsedOptions = list;
    }
  }

  $effect(() => {
    if (options) {
      syncOptions();
    }
  });

  $effect(() => {
    if (selectEl) {
      syncOptions();
      const observer = new MutationObserver(() => {
        syncOptions();
      });
      observer.observe(selectEl, { childList: true, subtree: true, characterData: true });
      return () => observer.disconnect();
    }
  });

  let selectedOption = $derived(
    parsedOptions.find((opt) => String(opt.value) === String(value))
  );

  let displayLabel = $derived(
    selectedOption ? selectedOption.label : (placeholder || 'Pilih...')
  );

  function selectOption(val: string | number) {
    value = val;
    if (selectEl) {
      selectEl.value = String(val);
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
    onchange?.(new Event('change'));
    isOpen = false;
    triggerEl?.focus();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        isOpen = true;
        highlightedIndex = Math.max(0, parsedOptions.findIndex((o) => String(o.value) === String(value)));
      } else {
        let next = highlightedIndex + 1;
        while (next < parsedOptions.length && parsedOptions[next].disabled) {
          next++;
        }
        if (next < parsedOptions.length) highlightedIndex = next;
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        isOpen = true;
        highlightedIndex = Math.max(0, parsedOptions.findIndex((o) => String(o.value) === String(value)));
      } else {
        let prev = highlightedIndex - 1;
        while (prev >= 0 && parsedOptions[prev].disabled) {
          prev--;
        }
        if (prev >= 0) highlightedIndex = prev;
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isOpen) {
        if (highlightedIndex >= 0 && highlightedIndex < parsedOptions.length) {
          const opt = parsedOptions[highlightedIndex];
          if (!opt.disabled) selectOption(opt.value);
        }
      } else {
        isOpen = true;
        highlightedIndex = Math.max(0, parsedOptions.findIndex((o) => String(o.value) === String(value)));
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        isOpen = false;
      }
    } else if (e.key === 'Tab') {
      if (isOpen) {
        isOpen = false;
      }
    }
  }

  $effect(() => {
    function handleDocumentClick(e: MouseEvent) {
      if (isOpen && containerEl && !containerEl.contains(e.target as Node)) {
        isOpen = false;
      }
    }

    if (isOpen) {
      window.addEventListener('click', handleDocumentClick, true);
      return () => window.removeEventListener('click', handleDocumentClick, true);
    }
  });

  $effect(() => {
    if (isOpen && highlightedIndex >= 0 && dropdownEl) {
      const items = dropdownEl.querySelectorAll('[role="option"]');
      const el = items[highlightedIndex] as HTMLElement;
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  });
</script>

<div class="flex flex-col gap-1.5 w-full relative {className}" bind:this={containerEl}>
  {#if label}
    <label
      for={id ? `${id}-trigger` : undefined}
      class="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-between select-none"
    >
      <span class="inline-flex items-center">
        {cleanLabel}
        {#if required}
          <span class="text-red-500 dark:text-red-400 font-semibold ml-1">*</span>
        {/if}
      </span>
    </label>
  {/if}

  <!-- Hidden native select for binding, form submission, and child option extraction -->
  <select
    {id}
    bind:this={selectEl}
    bind:value
    {disabled}
    aria-required={required ? 'true' : undefined}
    class="sr-only pointer-events-none"
    tabindex="-1"
    aria-hidden="true"
    {onchange}
    {onblur}
    {onfocus}
    {...restProps}
  >
    {#if placeholder}
      <option value="" disabled selected={!value}>{placeholder}</option>
    {/if}
    {#if options}
      {#each options as opt}
        <option value={opt.value} disabled={opt.disabled}>{opt.label}</option>
      {/each}
    {/if}
    {@render children?.()}
  </select>

  <!-- Custom Trigger Button -->
  <div class="relative w-full">
    <button
      type="button"
      id={id ? `${id}-trigger` : undefined}
      bind:this={triggerEl}
      {disabled}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      onclick={() => {
        if (!disabled) {
          isOpen = !isOpen;
          if (isOpen) {
            highlightedIndex = Math.max(0, parsedOptions.findIndex((o) => String(o.value) === String(value)));
          }
        }
      }}
      onkeydown={handleKeydown}
      class="w-full flex items-center justify-between gap-2 px-3 rounded-lg border text-xs sm:text-sm font-normal text-left transition-all duration-150 cursor-pointer shadow-2xs select-none
        bg-[var(--bg-surface)]
        text-neutral-900 dark:text-neutral-100
        hover:border-neutral-400 dark:hover:border-neutral-600
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/30 focus-visible:border-[var(--brand)]
        disabled:opacity-50 disabled:bg-[var(--bg-subtle)] disabled:cursor-not-allowed
        {selectClass || 'h-9'}
        {error ? 'border-red-500 dark:border-red-500 focus-visible:ring-red-500/20' : 'border-neutral-200 dark:border-neutral-800'}"
    >
      <span class="truncate flex-1 {!selectedOption && placeholder ? 'text-neutral-400 dark:text-neutral-500' : ''}">
        {displayLabel}
      </span>
      <ChevronDown
        class="w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200 {isOpen ? 'rotate-180 text-[var(--brand)]' : ''}"
      />
    </button>

    <!-- Custom Floating Dropdown Menu -->
    {#if isOpen}
      <div
        role="listbox"
        bind:this={dropdownEl}
        tabindex="-1"
        class="absolute left-0 top-full mt-1.5 w-full min-w-full z-50 rounded-xl border border-neutral-200/90 dark:border-neutral-800/90 bg-[var(--bg-surface)] dark:bg-neutral-900 shadow-xl p-1 overflow-auto max-h-60 text-xs sm:text-sm"
      >
        {#if parsedOptions.length === 0}
          <div class="px-3 py-2 text-xs text-neutral-400 text-center select-none">
            Tidak ada pilihan
          </div>
        {:else}
          {#each parsedOptions as opt, idx}
            {@const isSelected = String(opt.value) === String(value)}
            {@const isHighlighted = idx === highlightedIndex}
            <button
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={opt.disabled}
              onclick={(e) => {
                e.stopPropagation();
                if (!opt.disabled) selectOption(opt.value);
              }}
              onmouseenter={() => {
                if (!opt.disabled) highlightedIndex = idx;
              }}
              class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer my-0.5
                {isSelected
                  ? 'bg-[var(--brand)]/10 text-[var(--brand)] font-medium dark:bg-[var(--brand)]/20'
                  : isHighlighted
                    ? 'bg-neutral-100 dark:bg-neutral-800/70 text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'}
                {opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}"
            >
              <span class="truncate flex-1">{opt.label}</span>
              {#if isSelected}
                <Check class="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
              {/if}
            </button>
          {/each}
        {/if}
      </div>
    {/if}
  </div>

  {#if error}
    <p class="text-xs text-red-500 dark:text-red-400 font-medium">{error}</p>
  {:else if hint}
    <p class="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
  {/if}
</div>

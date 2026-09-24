<script lang="ts">
  import type { Snippet } from 'svelte';
  import { X } from 'lucide-svelte';
  import { parseNumber, formatRupiahInput, formatIDR, parseIDR, formatThousandSeparator } from '$lib/utils/format';

  interface Props {
    id?: string;
    label?: string;
    type?: string;
    value?: string | number;
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    numericOnly?: boolean;
    thousandSeparator?: boolean;
    clearable?: boolean;
    error?: string;
    hint?: string;
    class?: string;
    prefix?: string | Snippet;
    suffix?: string | Snippet;
    autocomplete?: string;
    autofocus?: boolean;
    oninput?: (e: Event) => void;
    onkeydown?: (e: KeyboardEvent) => void;
    onblur?: (e: FocusEvent) => void;
    onfocus?: (e: FocusEvent) => void;
    [key: string]: any;
  }

  let {
    id = Math.random().toString(36).substring(2, 9),
    label,
    type = 'text',
    value = $bindable(''),
    placeholder,
    disabled = false,
    readonly = false,
    required = false,
    numericOnly = false,
    thousandSeparator = false,
    clearable = false,
    error,
    hint,
    class: className = '',
    prefix,
    suffix,
    autocomplete = 'off',
    autofocus = false,
    oninput,
    onkeydown,
    onblur,
    onfocus,
    ...restProps
  }: Props = $props();

  // Guarantee single red asterisk by stripping any hardcoded asterisks from the label string
  let cleanLabel = $derived(label ? label.replace(/\s*\*+\s*$/, '').trim() : '');

  let inputElement = $state<HTMLInputElement | null>(null);

  $effect(() => {
    if (autofocus && inputElement) {
      const timer = setTimeout(() => {
        if (inputElement && document.activeElement !== inputElement) {
          inputElement.focus();
        }
      }, 40);
      return () => clearTimeout(timer);
    }
  });

  export function focus() {
    inputElement?.focus();
  }

  export function select() {
    inputElement?.select();
  }

  // Is this a currency input?
  let isCurrency = $derived(type === 'currency');
  let effectiveType = $derived(isCurrency ? 'text' : type);
  let effectiveInputMode = $derived(isCurrency || numericOnly || thousandSeparator ? 'numeric' : undefined);
  let effectivePlaceholder = $derived(placeholder !== undefined ? placeholder : (isCurrency ? '0' : ''));

  $effect(() => {
    if (thousandSeparator && value !== undefined && value !== null && value !== '') {
      const formatted = formatThousandSeparator(value);
      if (formatted !== String(value)) {
        value = formatted;
      }
    }
  });

  function handleKeydown(e: KeyboardEvent) {
    if (disabled || readonly) {
      onkeydown?.(e);
      return;
    }

    if (isCurrency) {
      // Control keys allowed
      if (
        e.key === 'Tab' || e.key === 'Enter' || e.key === 'Escape' ||
        e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'Home' || e.key === 'End' ||
        e.ctrlKey || e.metaKey
      ) {
        onkeydown?.(e);
        return;
      }

      const target = e.target as HTMLInputElement;
      const isAllSelected = (target.selectionStart === 0 && target.selectionEnd === target.value.length && target.value.length > 0);

      // Digit pressed — digit-as-cents: geser ke kiri, 2 digit terakhir = sen
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        let currentRaw = isAllSelected ? 0 : parseIDR(value);
        if (currentRaw < 100_000_000_000_00) {
          const newRaw = currentRaw * 10 + parseInt(e.key, 10);
          value = newRaw === 0 ? '' : formatIDR(newRaw);
          oninput?.(new Event('input', { bubbles: true }));
        }
        onkeydown?.(e);
        return;
      }

      // Backspace pressed
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (isAllSelected) {
          value = '';
        } else {
          const currentRaw = parseIDR(value);
          const newRaw = Math.floor(currentRaw / 10);
          value = newRaw === 0 ? '' : formatIDR(newRaw);
        }
        oninput?.(new Event('input', { bubbles: true }));
        onkeydown?.(e);
        return;
      }

      // Delete pressed
      if (e.key === 'Delete') {
        e.preventDefault();
        value = '';
        oninput?.(new Event('input', { bubbles: true }));
        onkeydown?.(e);
        return;
      }

      // Ignore any other key (letters, punctuation, etc.)
      e.preventDefault();
      return;
    }

    if (numericOnly || thousandSeparator) {
      // Allow control keys
      if (
        e.key === 'Tab' || e.key === 'Enter' || e.key === 'Escape' ||
        e.key === 'Backspace' || e.key === 'Delete' ||
        e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'Home' || e.key === 'End' ||
        e.ctrlKey || e.metaKey
      ) {
        onkeydown?.(e);
        return;
      }

      // Only allow digits 0-9
      if (!/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        return;
      }
    }

    onkeydown?.(e);
  }

  function handlePaste(e: ClipboardEvent) {
    if (disabled || readonly) return;

    if (isCurrency) {
      e.preventDefault();
      const pasted = e.clipboardData?.getData('text') || '';
      const num = parseIDR(pasted);
      value = num === 0 ? '' : formatIDR(num);
      oninput?.(new Event('input', { bubbles: true }));
      return;
    }

    if (thousandSeparator) {
      e.preventDefault();
      const pasted = e.clipboardData?.getData('text') || '';
      value = formatThousandSeparator(pasted);
      oninput?.(new Event('input', { bubbles: true }));
      return;
    }

    if (numericOnly) {
      e.preventDefault();
      const pasted = e.clipboardData?.getData('text') || '';
      const cleaned = pasted.replace(/\D/g, '');
      value = cleaned;
      oninput?.(new Event('input', { bubbles: true }));
      return;
    }
  }

  function handleBlur(e: FocusEvent) {
    if (isCurrency && value) {
      const num = parseIDR(value as string);
      value = num === 0 ? '' : formatIDR(num);
    } else if (thousandSeparator && value) {
      value = formatThousandSeparator(value as string);
    }
    onblur?.(e);
  }

  function handleInput(e: Event) {
    if (thousandSeparator) {
      const input = e.target as HTMLInputElement;
      const raw = input.value;
      const cursor = input.selectionStart || 0;
      const beforeDigits = raw.slice(0, cursor).replace(/\D/g, '').length;
      const formatted = formatThousandSeparator(raw);
      value = formatted;
      input.value = formatted;

      let newCursor = 0;
      let digitsSeen = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) digitsSeen++;
        if (digitsSeen === beforeDigits) {
          newCursor = i + 1;
          break;
        }
      }
      if (beforeDigits === 0) newCursor = 0;
      input.setSelectionRange(newCursor, newCursor);
    } else if (numericOnly && typeof value === 'string') {
      const sanitized = value.replace(/\D/g, '');
      if (sanitized !== value) {
        value = sanitized;
      }
    }
    oninput?.(e);
  }
</script>

<div class="flex flex-col gap-1.5 w-full">
  {#if label}
    <label for={id} class="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-between select-none">
      <span class="inline-flex items-center">
        {cleanLabel}
        {#if required}
          <span class="text-red-500 dark:text-red-400 font-semibold ml-1">*</span>
        {/if}
      </span>
    </label>
  {/if}

  <div class="relative flex items-center">
    {#if prefix || isCurrency}
      <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500 text-sm font-medium">
        {#if prefix}
          {#if typeof prefix === 'string'}
            {prefix}
          {:else}
            {@render prefix()}
          {/if}
        {:else if isCurrency}
          <span class="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500">Rp</span>
        {/if}
      </div>
    {/if}

    <!-- svelte-ignore a11y_autofocus -->
    <input
      bind:this={inputElement}
      {id}
      type={effectiveType}
      inputmode={effectiveInputMode}
      bind:value
      placeholder={effectivePlaceholder}
      {disabled}
      {readonly}
      aria-required={required ? 'true' : undefined}
      aria-invalid={error ? 'true' : undefined}
      {autocomplete}
      {autofocus}
      oninput={handleInput}
      onkeydown={handleKeydown}
      onpaste={handlePaste}
      onblur={handleBlur}
      {onfocus}
      class="w-full h-9 rounded-md border text-sm transition-all duration-150
        bg-[var(--bg-surface)]
        text-neutral-900 dark:text-neutral-100
        placeholder:text-neutral-400 dark:placeholder:text-neutral-600
        focus-visible:outline-none
        disabled:opacity-50 disabled:bg-[var(--bg-subtle)] disabled:cursor-not-allowed
        leading-normal py-1.5
        {isCurrency || numericOnly ? 'tabular-nums font-medium' : ''}
        {prefix || isCurrency ? 'pl-9' : 'pl-3'}
        {clearable || suffix ? 'pr-9' : 'pr-3'}
        {error ? 'border-red-500 dark:border-red-500' : 'border-neutral-300 dark:border-neutral-800'}
        {className}"
      {...restProps}
    />

    {#if clearable && value && !disabled && !readonly}
      <button
        type="button"
        onclick={() => {
          value = '';
          inputElement?.focus();
          oninput?.(new Event('input', { bubbles: true }));
        }}
        class="absolute inset-y-0 right-2.5 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
        title="Hapus pencarian"
        aria-label="Hapus pencarian"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    {:else if suffix}
      <div class="absolute inset-y-0 right-3 flex items-center text-neutral-400 dark:text-neutral-500 text-sm font-medium">
        {#if typeof suffix === 'string'}
          {suffix}
        {:else}
          {@render suffix()}
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

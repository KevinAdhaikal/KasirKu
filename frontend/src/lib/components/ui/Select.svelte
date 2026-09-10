<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronDown } from 'lucide-svelte';

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

  // Guarantee single red asterisk by stripping any hardcoded asterisks from the label string
  let cleanLabel = $derived(label ? label.replace(/\s*\*+\s*$/, '').trim() : '');
</script>

<div class="flex flex-col gap-1.5 w-full {className}">
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

  <div class="relative flex items-center w-full">
    <select
      {id}
      bind:value
      {disabled}
      aria-required={required ? 'true' : undefined}
      {onchange}
      {onblur}
      {onfocus}
      class="w-full h-9 pl-3 pr-8 rounded-md border text-xs sm:text-sm appearance-none cursor-pointer transition-colors
        bg-[var(--bg-surface)]
        text-neutral-900 dark:text-neutral-100
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)]/50
        disabled:opacity-50 disabled:bg-[var(--bg-subtle)] disabled:cursor-not-allowed
        leading-normal py-1.5 shadow-2xs
        {error ? 'border-red-500 dark:border-red-500 focus-visible:ring-red-500' : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600'}
        {selectClass}"
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

    <div class="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center text-neutral-400 dark:text-neutral-500">
      <ChevronDown class="w-4 h-4 opacity-80" />
    </div>
  </div>

  {#if error}
    <p class="text-xs text-red-500 dark:text-red-400 font-medium">{error}</p>
  {:else if hint}
    <p class="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
  {/if}
</div>

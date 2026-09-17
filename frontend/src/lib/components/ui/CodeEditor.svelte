<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState, Compartment } from '@codemirror/state';
  import { html } from '@codemirror/lang-html';
  import { oneDark } from '@codemirror/theme-one-dark';
  import { keymap } from '@codemirror/view';
  import { indentWithTab } from '@codemirror/commands';
  import { theme } from '../../stores/theme.svelte';

  interface Props {
    value?: string;
    placeholder?: string;
    minHeight?: string;
    maxHeight?: string;
    readonly?: boolean;
    onchange?: (val: string) => void;
  }

  let {
    value = $bindable(''),
    placeholder = '',
    minHeight = '320px',
    maxHeight = '550px',
    readonly = false,
    onchange
  }: Props = $props();

  let editorContainer: HTMLDivElement | null = null;
  let view: EditorView | null = null;
  const themeCompartment = new Compartment();
  const readonlyCompartment = new Compartment();

  // Custom styling extension for crisp fonts and borders
  const customEditorTheme = EditorView.theme({
    '&': {
      fontSize: '12px',
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      borderRadius: '0.375rem',
    },
    '.cm-scroller': {
      fontFamily: 'inherit',
      lineHeight: '1.5',
    },
    '.cm-content': {
      padding: '8px 0',
      caretColor: 'var(--brand, #3b82f6)',
    },
    '.cm-line': {
      padding: '0 8px',
    },
    '.cm-gutters': {
      borderRight: '1px solid var(--border-subtle, rgba(0, 0, 0, 0.1))',
      backgroundColor: 'transparent',
      color: 'var(--text-muted, #888)',
    },
    '&.cm-focused': {
      outline: 'none',
    }
  });

  onMount(() => {
    if (!editorContainer) return;

    const state = EditorState.create({
      doc: value || '',
      extensions: [
        basicSetup,
        html(),
        keymap.of([indentWithTab]),
        customEditorTheme,
        themeCompartment.of(theme.isDark ? oneDark : []),
        readonlyCompartment.of(EditorState.readOnly.of(readonly)),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const currentDoc = update.state.doc.toString();
            if (currentDoc !== value) {
              value = currentDoc;
              onchange?.(currentDoc);
            }
          }
        }),
      ],
    });

    view = new EditorView({
      state,
      parent: editorContainer,
    });
  });

  // Keep CodeMirror doc in sync when `value` changes from outside
  $effect(() => {
    if (view && value !== undefined) {
      const currentDoc = view.state.doc.toString();
      if (currentDoc !== value) {
        view.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: value },
        });
      }
    }
  });

  // Reactively switch theme when dark/light mode changes
  $effect(() => {
    if (view) {
      view.dispatch({
        effects: themeCompartment.reconfigure(theme.isDark ? oneDark : []),
      });
    }
  });

  // Reactively update readonly state
  $effect(() => {
    if (view) {
      view.dispatch({
        effects: readonlyCompartment.reconfigure(EditorState.readOnly.of(readonly)),
      });
    }
  });

  onDestroy(() => {
    if (view) {
      view.destroy();
      view = null;
    }
  });
</script>

<div
  class="relative rounded-md border border-neutral-300 dark:border-neutral-700 bg-[var(--bg-surface)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--brand)]/30 focus-within:border-[var(--brand)] transition-shadow"
  style="--min-height: {minHeight}; --max-height: {maxHeight};"
>
  <div
    bind:this={editorContainer}
    class="cm-editor-wrapper"
    style="min-height: {minHeight}; max-height: {maxHeight}; overflow: auto;"
  ></div>
</div>

<style>
  :global(.cm-editor-wrapper .cm-editor) {
    height: 100%;
    min-height: var(--min-height, 300px);
  }
</style>

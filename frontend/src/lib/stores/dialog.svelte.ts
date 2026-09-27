// Svelte 5 Rune-based Global Dialog & Confirmation Store
export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'warning';
}

class DialogStore {
  isOpen = $state(false);
  title = $state('');
  message = $state('');
  confirmText = $state('Konfirmasi');
  cancelText = $state('Batal');
  variant = $state<'danger' | 'primary' | 'warning'>('primary');

  private resolvePromise: ((val: boolean) => void) | null = null;

  confirm(options: ConfirmOptions): Promise<boolean> {
    this.title = options.title;
    this.message = options.message;
    this.confirmText = options.confirmText || 'Konfirmasi';
    this.cancelText = options.cancelText || 'Batal';
    this.variant = options.variant || 'primary';
    this.isOpen = true;

    return new Promise<boolean>((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  handleConfirm() {
    this.isOpen = false;
    this.resolvePromise?.(true);
    this.resolvePromise = null;
  }

  handleCancel() {
    this.isOpen = false;
    this.resolvePromise?.(false);
    this.resolvePromise = null;
  }
}

export const dialog = new DialogStore();

export interface ConfirmDialogFunction {
  (options: ConfirmOptions): Promise<boolean>;
  show: (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'primary' | 'warning';
  }) => Promise<boolean>;
}

const confirmFn: any = (options: ConfirmOptions) => dialog.confirm(options);
confirmFn.show = (options: any) =>
  dialog.confirm({
    title: options.title,
    message: options.message,
    confirmText: options.confirmLabel || options.confirmText,
    cancelText: options.cancelLabel || options.cancelText,
    variant: options.variant,
  });

export const confirmDialog: ConfirmDialogFunction = confirmFn;


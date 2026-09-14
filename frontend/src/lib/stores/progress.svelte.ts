// Svelte 5 Rune-based YouTube-style Progress Bar Store
class ProgressStore {
  progress = $state(0);
  visible = $state(false);
  private trickleTimer: ReturnType<typeof setInterval> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private resetTimer: ReturnType<typeof setTimeout> | null = null;
  private activeCount = 0;

  start() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    if (!this.visible) {
      this.progress = 14;
      this.visible = true;
    }

    if (this.trickleTimer) {
      clearInterval(this.trickleTimer);
    }

    this.trickleTimer = setInterval(() => {
      if (this.progress < 45) {
        this.progress += Math.random() * 8 + 3;
      } else if (this.progress < 75) {
        this.progress += Math.random() * 4 + 1.5;
      } else if (this.progress < 94) {
        this.progress += Math.random() * 1.5 + 0.3;
      }
      if (this.progress >= 94) {
        this.progress = 94;
        if (this.trickleTimer) {
          clearInterval(this.trickleTimer);
          this.trickleTimer = null;
        }
      }
    }, 180);
  }

  set(value: number) {
    this.progress = Math.min(100, Math.max(0, value));
    if (this.progress > 0 && !this.visible) {
      this.visible = true;
    }
  }

  done() {
    if (this.trickleTimer) {
      clearInterval(this.trickleTimer);
      this.trickleTimer = null;
    }

    if (!this.visible) return;

    this.progress = 100;

    this.hideTimer = setTimeout(() => {
      this.visible = false;
      this.resetTimer = setTimeout(() => {
        this.progress = 0;
      }, 300);
    }, 250);
  }

  requestStarted() {
    this.activeCount++;
    if (this.activeCount === 1) {
      this.start();
    }
  }

  requestFinished() {
    this.activeCount = Math.max(0, this.activeCount - 1);
    if (this.activeCount === 0) {
      this.done();
    }
  }
}

export const progress = new ProgressStore();

export interface GameHudStat {
  readonly id: string;
  readonly icon: string;
  readonly label: string;
  readonly value: string;
  readonly className?: string;
}

export interface GameHudOptions {
  readonly brandHref: string;
  readonly brandLabel?: string;
  readonly stats: readonly GameHudStat[];
  readonly soundEnabled: boolean;
}

export interface GameHelpItem {
  readonly icon: string;
  readonly title: string;
  readonly detail: string;
}

export interface SessionDialogOptions {
  readonly gameName: string;
  readonly helpItems: readonly GameHelpItem[];
}

export interface DialogController {
  open(trigger?: HTMLElement | null): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface DialogControllerOptions {
  readonly onEscape?: () => void;
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const renderGameHud = (options: GameHudOptions): string => `
  <header class="play-hud game-shell-hud">
    <a class="hud-brand" href="${escapeHtml(options.brandHref)}" aria-label="Keluar ke ${escapeHtml(options.brandLabel ?? "Gezy Games")}">★ <span>${escapeHtml(options.brandLabel ?? "Gezy Games")}</span></a>
    <div class="hud-stats">
      ${options.stats
        .map(
          (stat) => `
        <div${stat.className ? ` class="${escapeHtml(stat.className)}"` : ""}>
          <span aria-hidden="true">${escapeHtml(stat.icon)}</span>
          <p><small>${escapeHtml(stat.label)}</small><strong id="${escapeHtml(stat.id)}">${escapeHtml(stat.value)}</strong></p>
        </div>
      `,
        )
        .join("")}
    </div>
    <div class="hud-actions">
      <button id="sound-button" type="button" aria-label="${options.soundEnabled ? "Matikan" : "Nyalakan"} suara">${options.soundEnabled ? "🔊" : "🔇"}</button>
      <button id="help-button" type="button" aria-label="Bantuan kontrol">?</button>
      <button id="fullscreen-button" type="button" aria-label="Layar penuh">⛶</button>
      <button id="pause-button" type="button" aria-label="Jeda permainan" aria-keyshortcuts="P Escape">Ⅱ</button>
    </div>
  </header>
`;

export const renderSessionDialogs = (options: SessionDialogOptions): string => `
  <div class="game-shell-overlay pause-overlay" id="pause-overlay" hidden>
    <div class="game-shell-dialog pause-card" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <span class="game-shell-dialog__icon" aria-hidden="true">🌿</span>
      <h2 id="pause-title">Permainan dijeda</h2>
      <p>Tarik napas dulu. Waktu dan input berhenti selama layar ini terbuka.</p>
      <button id="resume-button" type="button" autofocus>Lanjutkan</button>
      <button id="quit-button" class="game-shell-dialog__secondary" type="button">Kembali ke pengaturan</button>
    </div>
  </div>

  <div class="game-shell-overlay help-overlay" id="help-overlay" hidden>
    <div class="game-shell-dialog help-card" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <span class="game-shell-dialog__icon" aria-hidden="true">🧭</span>
      <h2 id="help-title">Cara bermain ${escapeHtml(options.gameName)}</h2>
      <p>Pilih cara yang paling nyaman. Semua kontrol memberi hasil yang sama.</p>
      <ul class="game-shell-help-list">
        ${options.helpItems
          .map(
            (item) => `
          <li>
            <span aria-hidden="true">${escapeHtml(item.icon)}</span>
            <div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></div>
          </li>
        `,
          )
          .join("")}
        <li>
          <span aria-hidden="true"><kbd>1–3</kbd></span>
          <div><strong>Tombol angka</strong><small>Pilih sasaran pertama, kedua, atau ketiga.</small></div>
        </li>
        <li>
          <span aria-hidden="true"><kbd>P</kbd></span>
          <div><strong>Jeda cepat</strong><small>Tekan P atau Escape untuk menjeda dan melanjutkan.</small></div>
        </li>
      </ul>
      <button id="close-help-button" type="button" autofocus>Mengerti, lanjutkan</button>
    </div>
  </div>
`;

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export const createDialogController = (
  overlay: HTMLElement,
  options: DialogControllerOptions = {},
): DialogController => {
  let returnFocus: HTMLElement | null = null;

  const focusableElements = (): HTMLElement[] =>
    [...overlay.querySelectorAll<HTMLElement>(focusableSelector)].filter(
      (element) => !element.hidden,
    );

  const handleKeydown = (event: KeyboardEvent): void => {
    if (overlay.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      options.onEscape?.();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = focusableElements();
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  overlay.addEventListener("keydown", handleKeydown);

  return {
    open(
      trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null,
    ): void {
      returnFocus = trigger;
      overlay.hidden = false;
      const initialFocus =
        overlay.querySelector<HTMLElement>("[autofocus]") ?? focusableElements()[0];
      initialFocus?.focus();
    },

    close(): void {
      if (overlay.hidden) return;
      overlay.hidden = true;
      returnFocus?.focus();
      returnFocus = null;
    },

    isOpen(): boolean {
      return !overlay.hidden;
    },

    destroy(): void {
      overlay.removeEventListener("keydown", handleKeydown);
      returnFocus = null;
    },
  };
};

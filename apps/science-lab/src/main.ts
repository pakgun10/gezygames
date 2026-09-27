import "@gezy-games/design-system/base.css";
import "@gezy-games/game-shell/styles.css";
import {
  createDialogController,
  renderGameHud,
  renderSessionDialogs,
  type DialogController,
} from "@gezy-games/game-shell";
import {
  loadGameProgress,
  loadPlayerProgress,
  saveGameProgress,
  savePlayerPreferences,
} from "@gezy-games/progress";
import "./styles.css";

type MaterialId = "kerikil" | "pasir" | "kapas";

interface Material {
  readonly id: MaterialId;
  readonly name: string;
  readonly icon: string;
  readonly detail: string;
}

const materials: readonly Material[] = [
  { id: "kerikil", name: "Kerikil", icon: "🪨", detail: "Menahan kotoran besar" },
  { id: "pasir", name: "Pasir", icon: "⏳", detail: "Menyaring butiran kecil" },
  { id: "kapas", name: "Kapas", icon: "☁️", detail: "Menangkap sisa halus" },
];

const correctOrder: readonly MaterialId[] = ["kerikil", "pasir", "kapas"];
const portalUrl = import.meta.env.DEV ? "http://localhost:5173/" : "/";
const appElement = document.querySelector<HTMLDivElement>("#app");
if (!appElement) throw new Error("Elemen aplikasi tidak ditemukan.");
const app: HTMLDivElement = appElement;

const initialPreferences = loadPlayerProgress().preferences;
const progress = { ...loadGameProgress("science-lab") };
let playerNickname = initialPreferences.nickname;
let soundEnabled = initialPreferences.audioEnabled;
let selectedMaterials: MaterialId[] = [];
let experimentRunning = false;
let experimentComplete = false;
let pauseDialogController: DialogController | null = null;
let helpDialogController: DialogController | null = null;

const materialById = (id: MaterialId): Material => {
  const material = materials.find((candidate) => candidate.id === id);
  if (!material) throw new Error(`Bahan ${id} tidak ditemukan.`);
  return material;
};

const levelFromXp = (xp: number): number => Math.floor(xp / 1_000) + 1;

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const setText = (selector: string, value: string): void => {
  const element = document.querySelector<HTMLElement>(selector);
  if (element) element.textContent = value;
};

const saveProgress = (): void => {
  saveGameProgress("science-lab", {
    ...progress,
    lastPlayedAt: new Date().toISOString(),
  });
};

function destroyDialogs(): void {
  pauseDialogController?.close();
  helpDialogController?.close();
  pauseDialogController = null;
  helpDialogController = null;
}

function renderSetup(): void {
  destroyDialogs();
  selectedMaterials = [];
  experimentRunning = false;
  experimentComplete = false;
  app.innerHTML = `
    <main class="lab-setup">
      <header class="lab-header">
        <a class="lab-brand" href="${portalUrl}" aria-label="Kembali ke Gezy Games"><span aria-hidden="true">★</span><strong>Gezy</strong> Games</a>
        <a class="lab-back" href="${portalUrl}">← Semua game</a>
      </header>
      <div class="lab-setup-grid">
        <section class="lab-intro" aria-labelledby="lab-title">
          <p class="lab-eyebrow">PROTOTIPE · IPAS</p>
          <h1 id="lab-title">Science <span>Lab</span></h1>
          <p>Susun alat, amati perubahan, lalu jelaskan mengapa air desa menjadi lebih jernih.</p>
          <div class="lab-hero-flask" aria-hidden="true"><span>🧪</span><i></i><b></b></div>
          <ul><li>✓ Eksperimen sebab-akibat</li><li>✓ Ketuk untuk menyusun bahan</li><li>✓ Hasil dapat diamati</li></ul>
        </section>
        <section class="lab-setup-card" aria-label="Mulai eksperimen">
          <div class="lab-mini-stats"><div><span>LEVEL</span><strong>${levelFromXp(progress.xp)}</strong></div><div><span>XP</span><strong>${progress.xp.toLocaleString("id-ID")}</strong></div><div><span>EKSPERIMEN</span><strong>${progress.sessions}</strong></div></div>
          <label class="lab-name-field"><span>Nama ilmuwan <small>(opsional)</small></span><input id="lab-nickname" type="text" maxlength="30" autocomplete="nickname" value="${escapeHtml(playerNickname)}" placeholder="Contoh: Naya" /></label>
          <div class="lab-brief"><span aria-hidden="true">💧</span><div><strong>Air Bersih untuk Desa</strong><p>Temukan urutan lapisan penyaring yang membuat air keruh menjadi lebih jernih.</p></div></div>
          <button class="lab-primary-button" id="start-lab-button" type="button">Mulai eksperimen <span aria-hidden="true">→</span></button>
          <p class="lab-note">Sekitar 3 menit · tanpa jawaban pilihan ganda</p>
        </section>
      </div>
      <footer class="lab-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved.</footer>
    </main>
  `;
  document.querySelector<HTMLInputElement>("#lab-nickname")?.focus();
  document.querySelector<HTMLButtonElement>("#start-lab-button")?.addEventListener("click", () => {
    playerNickname = document.querySelector<HTMLInputElement>("#lab-nickname")?.value.trim() ?? "";
    savePlayerPreferences({ nickname: playerNickname });
    renderExperiment();
  });
}

function renderExperiment(): void {
  selectedMaterials = [];
  experimentRunning = false;
  experimentComplete = false;
  destroyDialogs();
  app.innerHTML = `
    <main class="lab-screen">
      ${renderGameHud({
        brandHref: portalUrl,
        brandLabel: "Science Lab",
        soundEnabled,
        stats: [
          { id: "lab-xp", icon: "⭐", label: "XP", value: progress.xp.toLocaleString("id-ID") },
          {
            id: "lab-coins",
            icon: "💰",
            label: "Koin",
            value: progress.coins.toLocaleString("id-ID"),
          },
          { id: "lab-level", icon: "🏆", label: "Level", value: String(levelFromXp(progress.xp)) },
          { id: "lab-step", icon: "🧪", label: "Langkah", value: "1/2" },
        ],
      })}
      <section class="lab-workbench" aria-labelledby="experiment-title">
        <div class="lab-breadcrumb"><button id="lab-back-map" type="button">← Kembali</button><span>🔬 Laboratorium Desa</span></div>
        <div class="lab-title-row"><div><p class="lab-eyebrow">EKSPERIMEN 01 · AIR DAN MATERI</p><h1 id="experiment-title">Air Bersih untuk Desa</h1><p>Ketuk bahan sesuai urutan lapisan penyaring. Setelah itu, alirkan air dan amati hasilnya.</p></div><div class="lab-observation-badge"><span>Kejernihan air</span><strong id="clarity-value">20%</strong></div></div>
        <div class="lab-steps" aria-label="Langkah eksperimen"><span class="is-active"><b>1</b> Susun bahan</span><i aria-hidden="true">→</i><span id="observe-step"><b>2</b> Amati hasil</span></div>
        <div class="lab-layout">
          <section class="material-panel" aria-labelledby="material-title"><div class="panel-heading"><h2 id="material-title">Pilih bahan</h2><span id="material-count">0/3</span></div><p>Ketuk bahan dari lapisan paling bawah ke paling atas.</p><div class="material-list">${materials.map(renderMaterial).join("")}</div></section>
          <section class="filter-machine" aria-label="Mesin penyaring air"><div class="water-tank" id="water-tank"><span class="water-particles">• • • • •</span><span class="tank-label">AIR KERUH</span></div><div class="filter-arrow" aria-hidden="true">↓</div><div class="filter-column" id="filter-column"><div class="filter-layer layer-empty">Ketuk bahan untuk mengisi lapisan</div><div class="filter-layer layer-empty"></div><div class="filter-layer layer-empty"></div></div><div class="filter-output" id="filter-output"><span>💧</span><strong>Hasil akan muncul di sini</strong></div><button class="lab-primary-button run-lab-button" id="run-lab-button" type="button" disabled>Alirkan air <span aria-hidden="true">💧</span></button></section>
          <aside class="observation-panel" aria-labelledby="observation-title"><h2 id="observation-title">Catatan pengamatan</h2><div class="clarity-meter"><span id="clarity-fill"></span></div><p id="observation-text">Air masih keruh. Susun tiga lapisan untuk memulai.</p><div class="science-note"><span aria-hidden="true">💡</span><p>Dalam penyaringan, bahan dengan celah paling besar biasanya ditempatkan lebih dulu.</p></div></aside>
        </div>
        <div class="lab-feedback" id="lab-feedback" role="status" aria-live="assertive"></div>
      </section>
      ${renderSessionDialogs({
        gameName: "Science Lab",
        helpItems: [
          {
            icon: "🧪",
            title: "Susun bahan",
            detail: "Ketuk kerikil, pasir, dan kapas sesuai dugaanmu.",
          },
          {
            icon: "👀",
            title: "Amati hasil",
            detail: "Perhatikan perubahan kejernihan air setelah tombol dialirkan.",
          },
        ],
      })}
    </main>
  `;
  setupShellListeners();
  document
    .querySelector<HTMLButtonElement>("#lab-back-map")
    ?.addEventListener("click", renderSetup);
  document
    .querySelectorAll<HTMLButtonElement>("[data-material]")
    .forEach((button) =>
      button.addEventListener("click", () => selectMaterial(button.dataset.material as MaterialId)),
    );
  document
    .querySelector<HTMLButtonElement>("#run-lab-button")
    ?.addEventListener("click", runExperiment);
  renderLayers();
}

function renderMaterial(material: Material): string {
  return `<button class="material-card" type="button" data-material="${material.id}" aria-label="Pilih ${material.name}"><span class="material-icon" aria-hidden="true">${material.icon}</span><strong>${material.name}</strong><small>${material.detail}</small></button>`;
}

function selectMaterial(id: MaterialId): void {
  if (experimentRunning || selectedMaterials.includes(id) || selectedMaterials.length >= 3) return;
  selectedMaterials.push(id);
  playTone(390 + selectedMaterials.length * 75, 0.08, "sine");
  renderLayers();
}

function removeMaterial(index: number): void {
  if (experimentRunning) return;
  selectedMaterials.splice(index, 1);
  renderLayers();
}

function renderLayers(): void {
  setText("#material-count", `${selectedMaterials.length}/3`);
  const column = document.querySelector<HTMLElement>("#filter-column");
  if (column) {
    column.innerHTML = [0, 1, 2]
      .map((index) => {
        const id = selectedMaterials[index];
        if (!id)
          return `<button class="filter-layer layer-empty" type="button" disabled>Lapisan ${index + 1}</button>`;
        const material = materialById(id);
        return `<button class="filter-layer layer-${id}" type="button" data-remove-layer="${index}"><span>${material.icon}</span><strong>${material.name}</strong><small>Ketuk untuk menghapus</small></button>`;
      })
      .join("");
    column
      .querySelectorAll<HTMLButtonElement>("[data-remove-layer]")
      .forEach((button) =>
        button.addEventListener("click", () => removeMaterial(Number(button.dataset.removeLayer))),
      );
  }
  document.querySelectorAll<HTMLButtonElement>("[data-material]").forEach((button) => {
    const chosen = selectedMaterials.includes(button.dataset.material as MaterialId);
    button.disabled = chosen || selectedMaterials.length >= 3 || experimentRunning;
    button.classList.toggle("is-chosen", chosen);
  });
  const runButton = document.querySelector<HTMLButtonElement>("#run-lab-button");
  if (runButton) runButton.disabled = selectedMaterials.length !== 3 || experimentRunning;
}

function runExperiment(): void {
  if (experimentRunning || selectedMaterials.length !== 3) return;
  experimentRunning = true;
  setText("#lab-step", "2/2");
  document.querySelector(".filter-machine")?.classList.add("is-running");
  document.querySelectorAll<HTMLButtonElement>("[data-material]").forEach((button) => {
    button.disabled = true;
  });
  showFeedback("Air sedang melewati setiap lapisan...", "info");
  playTone(260, 0.2, "triangle");
  window.setTimeout(() => {
    const success = selectedMaterials.every((id, index) => id === correctOrder[index]);
    experimentComplete = success;
    experimentRunning = false;
    document.querySelector(".filter-machine")?.classList.remove("is-running");
    const tank = document.querySelector<HTMLElement>("#water-tank");
    tank?.classList.toggle("is-clear", success);
    setText("#clarity-value", success ? "92%" : "38%");
    const fill = document.querySelector<HTMLElement>("#clarity-fill");
    if (fill) fill.style.width = success ? "92%" : "38%";
    setText(
      "#observation-text",
      success
        ? "Air tampak lebih jernih setelah melewati tiga lapisan."
        : "Air masih keruh. Coba susun ulang lapisannya dan amati lagi.",
    );
    document.querySelector("#observe-step")?.classList.add("is-active");
    if (success) {
      progress.xp += 100;
      progress.coins += 20;
      progress.sessions += 1;
      progress.bestStreak = Math.max(progress.bestStreak, 1);
      saveProgress();
      updateHud();
      showFeedback("🎉 Percobaan berhasil! Kamu menemukan urutan penyaring yang tepat.", "success");
      playTone(720, 0.18, "sine");
      const runButton = document.querySelector<HTMLButtonElement>("#run-lab-button");
      if (runButton) {
        runButton.disabled = true;
        runButton.textContent = "✓ Eksperimen berhasil";
      }
    } else {
      showFeedback("Belum jernih. Petunjuk: saring kotoran besar sebelum yang halus.", "error");
      selectedMaterials = [];
      setText("#lab-step", "1/2");
      document.querySelector("#observe-step")?.classList.remove("is-active");
      renderLayers();
    }
  }, 1250);
}

function updateHud(): void {
  setText("#lab-xp", progress.xp.toLocaleString("id-ID"));
  setText("#lab-coins", progress.coins.toLocaleString("id-ID"));
  setText("#lab-level", String(levelFromXp(progress.xp)));
  setText("#lab-step", experimentComplete ? "Selesai" : "2/2");
}

function showFeedback(message: string, kind: "info" | "success" | "error"): void {
  const feedback = document.querySelector<HTMLElement>("#lab-feedback");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `lab-feedback is-visible lab-feedback--${kind}`;
}

function toggleSound(): void {
  soundEnabled = !soundEnabled;
  savePlayerPreferences({ audioEnabled: soundEnabled });
  const button = document.querySelector<HTMLButtonElement>("#sound-button");
  if (button) {
    button.textContent = soundEnabled ? "🔊" : "🔇";
    button.setAttribute("aria-label", soundEnabled ? "Matikan suara" : "Nyalakan suara");
  }
}

function playTone(frequency: number, duration: number, type: OscillatorType): void {
  if (!soundEnabled) return;
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.06, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
    oscillator.addEventListener("ended", () => context.close(), { once: true });
  } catch {
    // Audio adalah pelengkap; observasi tetap visual.
  }
}

function setupShellListeners(): void {
  pauseDialogController = createDialogController(
    document.querySelector<HTMLElement>("#pause-overlay") as HTMLElement,
    { onEscape: resumeLab },
  );
  helpDialogController = createDialogController(
    document.querySelector<HTMLElement>("#help-overlay") as HTMLElement,
    { onEscape: closeHelp },
  );
  document
    .querySelector<HTMLButtonElement>("#sound-button")
    ?.addEventListener("click", toggleSound);
  document.querySelector<HTMLButtonElement>("#help-button")?.addEventListener("click", openHelp);
  document
    .querySelector<HTMLButtonElement>("#fullscreen-button")
    ?.addEventListener("click", toggleFullscreen);
  document.querySelector<HTMLButtonElement>("#pause-button")?.addEventListener("click", pauseLab);
  document.querySelector<HTMLButtonElement>("#resume-button")?.addEventListener("click", resumeLab);
  document
    .querySelector<HTMLButtonElement>("#close-help-button")
    ?.addEventListener("click", closeHelp);
}

function pauseLab(): void {
  pauseDialogController?.open(document.querySelector<HTMLButtonElement>("#pause-button"));
}

function resumeLab(): void {
  pauseDialogController?.close();
}

function openHelp(): void {
  helpDialogController?.open(document.querySelector<HTMLButtonElement>("#help-button"));
}

function closeHelp(): void {
  helpDialogController?.close();
}

async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
}

document.addEventListener("keydown", (event) => {
  if (!document.querySelector(".lab-screen")) return;
  if (event.key === "Escape" && !helpDialogController?.isOpen()) pauseLab();
});

renderSetup();

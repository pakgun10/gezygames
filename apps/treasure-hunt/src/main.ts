import "@gezy-games/design-system/base.css";
import "@gezy-games/game-shell/styles.css";
import {
  createGameSession,
  selectQuestions,
  shuffleQuestionChoices,
  type GameSession,
} from "@gezy-games/game-core";
import {
  createDialogController,
  renderGameHud,
  renderPlatformVersion,
  renderSessionDialogs,
  type DialogController,
} from "@gezy-games/game-shell";
import {
  loadGameProgress,
  loadPlayerProgress,
  saveGameProgress,
  savePlayerPreferences,
} from "@gezy-games/progress";
import { mathQuestions, phases, type Phase, type Question } from "@gezy-games/question-bank";
import { createSessionReport, renderSessionReport } from "@gezy-games/session-report";
import "./styles.css";

type TreasurePhase = Exclude<Phase, "Fondasi">;
type LocationId = "shore" | "forest" | "lake";

interface LocationDefinition {
  readonly id: LocationId;
  readonly region: string;
  readonly title: string;
  readonly icon: string;
  readonly clue: string;
  readonly description: string;
  readonly topicsByPhase: Readonly<Record<TreasurePhase, readonly string[]>>;
  readonly rewardXp: number;
  readonly rewardCoins: number;
  readonly unlocks?: LocationId;
}

interface HuntSave {
  readonly version: 1;
  readonly completedLocations: readonly LocationId[];
  readonly unlockedLocations: readonly LocationId[];
}

interface HuntProgress {
  xp: number;
  coins: number;
  bestStreak: number;
  sessions: number;
  lastPlayedAt?: string;
}

const portalUrl = import.meta.env.DEV ? "http://localhost:5173/" : "/";
const storageKey = "gezy-games:treasure-hunt:v1";
const appElement = document.querySelector<HTMLDivElement>("#app");
if (!appElement) throw new Error("Elemen aplikasi tidak ditemukan.");
const app = appElement;
const treasurePhases: readonly TreasurePhase[] = phases.filter(
  (phase): phase is TreasurePhase => phase !== "Fondasi",
);
const phaseDescriptions: Record<TreasurePhase, string> = {
  A: "Kelas 1–2",
  B: "Kelas 3–4",
  C: "Kelas 5–6",
  D: "Kelas 7–9",
};

const locations: readonly LocationDefinition[] = [
  {
    id: "shore",
    region: "Pantai Mutiara",
    title: "Peti Pasir Berbisik",
    icon: "🏝️",
    clue: "Jejak kaki mengarah ke tiga kerang. Pecahkan soal pada peta kecil untuk menemukan kunci pertama.",
    description: "Ikuti jejak di pasir dan buka peti yang tertutup ombak.",
    topicsByPhase: {
      A: ["Penjumlahan", "Pengurangan"],
      B: ["Perkalian", "Pembagian"],
      C: ["Pecahan", "Desimal"],
      D: ["Himpunan", "Relasi"],
    },
    rewardXp: 140,
    rewardCoins: 30,
    unlocks: "forest",
  },
  {
    id: "forest",
    region: "Hutan Petunjuk",
    title: "Peti Pohon Tua",
    icon: "🌳",
    clue: "Daun-daun membentuk pola. Baca petunjuknya dan pilih jawaban yang membawa kamu ke pohon berikutnya.",
    description: "Temukan jalur yang benar di antara jejak dan pola hutan.",
    topicsByPhase: {
      A: ["Nilai tempat", "Pola bilangan"],
      B: ["Pecahan", "Keliling"],
      C: ["Persentase", "Perbandingan"],
      D: ["Fungsi", "Persamaan linear"],
    },
    rewardXp: 180,
    rewardCoins: 40,
    unlocks: "lake",
  },
  {
    id: "lake",
    region: "Danau Cermin",
    title: "Peti Penjaga Danau",
    icon: "🌊",
    clue: "Peta terakhir terpantul di permukaan danau. Jawab pertanyaan penjaga untuk melihat harta karun.",
    description: "Satukan semua petunjuk dan buka peti harta karun terakhir.",
    topicsByPhase: {
      A: ["Pengukuran panjang", "Penjumlahan"],
      B: ["Penjumlahan", "Perkalian"],
      C: ["Luas", "Desimal"],
      D: ["SPLDV", "Relasi"],
    },
    rewardXp: 240,
    rewardCoins: 60,
  },
] as const;

const locationById = (id: LocationId): LocationDefinition => {
  const location = locations.find((candidate) => candidate.id === id);
  if (!location) throw new Error(`Lokasi ${id} tidak ditemukan.`);
  return location;
};

const readHuntSave = (): HuntSave => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { version: 1, completedLocations: [], unlockedLocations: ["shore"] };
    const parsed = JSON.parse(raw) as Partial<HuntSave>;
    const validIds = new Set<LocationId>(locations.map((location) => location.id));
    if (parsed.version !== 1 || !Array.isArray(parsed.unlockedLocations)) {
      return { version: 1, completedLocations: [], unlockedLocations: ["shore"] };
    }
    const completedLocations = Array.isArray(parsed.completedLocations)
      ? parsed.completedLocations.filter((id): id is LocationId => validIds.has(id as LocationId))
      : [];
    const unlockedLocations = parsed.unlockedLocations.filter((id): id is LocationId =>
      validIds.has(id as LocationId),
    );
    return {
      version: 1,
      completedLocations,
      unlockedLocations: unlockedLocations.includes("shore") ? unlockedLocations : ["shore"],
    };
  } catch {
    return { version: 1, completedLocations: [], unlockedLocations: ["shore"] };
  }
};

let huntSave = readHuntSave();
let selectedPhase: TreasurePhase = "A";
let playerNickname = loadPlayerProgress().preferences.nickname;
let soundEnabled = loadPlayerProgress().preferences.audioEnabled;
const progress: HuntProgress = { ...loadGameProgress("treasure-hunt") };
let currentLocation: LocationDefinition | null = null;
let currentQuestions: readonly Question[] = [];
let activeQuestionId = "";
let activeChoices: readonly string[] = [];
let session: GameSession | null = null;
let inputLocked = false;
let streak = 0;
let sessionFinished = false;
let transitionTimerId: number | null = null;
let pendingTransition: (() => void) | null = null;
let pauseDialogController: DialogController | null = null;
let helpDialogController: DialogController | null = null;
let resumeAfterHelp = false;

const levelFromXp = (xp: number): number => Math.floor(xp / 1_000) + 1;
const isUnlocked = (id: LocationId): boolean => huntSave.unlockedLocations.includes(id);
const isCompleted = (id: LocationId): boolean => huntSave.completedLocations.includes(id);
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

const saveHunt = (): void => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(huntSave));
  } catch {
    // Progres peta adalah tambahan; sesi tetap dapat berjalan tanpa storage.
  }
};

const saveProgress = (): void => {
  saveGameProgress("treasure-hunt", {
    ...progress,
    lastPlayedAt: new Date().toISOString(),
  });
};

const questionsForLocation = (location: LocationDefinition): readonly Question[] => {
  const topics = location.topicsByPhase[selectedPhase];
  const selected = topics.flatMap((topic) =>
    selectQuestions(mathQuestions, { phase: selectedPhase, topic }),
  );
  return [...new Map(selected.map((question) => [question.id, question])).values()];
};

const completedCount = (): number => huntSave.completedLocations.length;

function renderSetup(): void {
  clearTransition();
  destroyDialogs();
  session = null;
  currentLocation = null;
  app.innerHTML = `
    <main class="treasure-setup">
      <header class="treasure-header">
        <a class="treasure-brand" href="${portalUrl}" aria-label="Kembali ke Gezy Games"><span aria-hidden="true">★</span><strong>Gezy</strong> Games</a>
        <a class="treasure-back" href="${portalUrl}">← Semua game</a>
      </header>
      <div class="treasure-setup-grid">
        <section class="treasure-intro" aria-labelledby="treasure-title">
          <p class="treasure-eyebrow">EKSPLORASI · PETUNJUK · HADIAH</p>
          <h1 id="treasure-title"><span>Treasure</span> Hunt</h1>
          <p>Jelajahi pulau, baca petunjuk, dan temukan peti soal di tiga lokasi misterius.</p>
          <div class="treasure-preview" aria-hidden="true"><span class="preview-sun">☀</span><span class="preview-cloud cloud-one"></span><span class="preview-cloud cloud-two"></span><span class="preview-island">♣</span><span class="preview-map">✦</span><span class="preview-chest">🧰</span><span class="preview-flag">⚑</span></div>
          <ul class="treasure-features"><li>✓ Peta terbuka bertahap</li><li>✓ Petunjuk sebelum soal</li><li>✓ Ramah sentuh & keyboard</li></ul>
        </section>
        <section class="treasure-setup-card" aria-label="Pengaturan permainan">
          <div class="treasure-stats"><div><span>LEVEL</span><strong>${levelFromXp(progress.xp)}</strong></div><div><span>XP</span><strong>${progress.xp.toLocaleString("id-ID")}</strong></div><div><span>PETI</span><strong>${completedCount()}/3</strong></div></div>
          <label class="treasure-name-field"><span>Nama penjelajah <small>(opsional)</small></span><input id="treasure-nickname" type="text" maxlength="30" autocomplete="nickname" value="${escapeHtml(playerNickname)}" placeholder="Contoh: Bima" /></label>
          <fieldset><legend>Pilih fase belajar</legend><div class="treasure-phase-options">${treasurePhases
            .map(
              (phase) =>
                `<button class="treasure-phase-option${phase === selectedPhase ? " is-selected" : ""}" type="button" data-phase="${phase}" aria-pressed="${phase === selectedPhase}"><strong>${phase}</strong><span>Fase ${phase}</span><small>${phaseDescriptions[phase]}</small></button>`,
            )
            .join("")}</div></fieldset>
          <button class="treasure-primary-button" id="open-map" type="button">Buka peta <span aria-hidden="true">→</span></button>
          <p class="treasure-note">3 lokasi · sekitar 4 menit · tombol 1–3</p>
        </section>
      </div>
      <footer class="treasure-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved. ${renderPlatformVersion()}</footer>
    </main>
  `;
  document.querySelectorAll<HTMLButtonElement>("[data-phase]").forEach((button) =>
    button.addEventListener("click", () => {
      playerNickname =
        document.querySelector<HTMLInputElement>("#treasure-nickname")?.value.trim() ??
        playerNickname;
      selectedPhase = button.dataset.phase as TreasurePhase;
      savePlayerPreferences({ nickname: playerNickname, lastPhase: selectedPhase, lastTopic: "" });
      renderSetup();
    }),
  );
  document.querySelector<HTMLButtonElement>("#open-map")?.addEventListener("click", openMap);
}

function openMap(): void {
  playerNickname =
    document.querySelector<HTMLInputElement>("#treasure-nickname")?.value.trim().slice(0, 30) ??
    playerNickname;
  savePlayerPreferences({ nickname: playerNickname, lastPhase: selectedPhase, lastTopic: "" });
  renderMap();
}

function renderMap(): void {
  clearTransition();
  destroyDialogs();
  session = null;
  currentLocation = null;
  app.innerHTML = `
    <main class="treasure-map-screen">
      ${renderGameHud({
        brandHref: portalUrl,
        brandLabel: "Treasure Hunt",
        soundEnabled,
        stats: [
          {
            id: "treasure-xp",
            icon: "⭐",
            label: "XP",
            value: progress.xp.toLocaleString("id-ID"),
          },
          {
            id: "treasure-coins",
            icon: "💰",
            label: "Koin",
            value: progress.coins.toLocaleString("id-ID"),
          },
          { id: "treasure-chests", icon: "🧰", label: "Peti", value: `${completedCount()}/3` },
          {
            id: "treasure-level",
            icon: "🏆",
            label: "Level",
            value: String(levelFromXp(progress.xp)),
          },
        ],
      })}
      <section class="treasure-map" aria-labelledby="map-title">
        <div class="treasure-map-heading"><div><p class="treasure-eyebrow">PETA FASE ${selectedPhase}</p><h1 id="map-title">Pilih jejak petualanganmu</h1><p>Ikuti jalur yang terbuka. Setiap peti berisi petunjuk dan soal untuk menemukan lokasi berikutnya.</p></div><button class="treasure-map-change" id="change-phase" type="button">Ganti fase</button></div>
        <div class="island-map" aria-label="Peta tiga lokasi Treasure Hunt"><span class="map-route route-one"></span><span class="map-route route-two"></span>${locations
          .map((location, index) => {
            const unlocked = isUnlocked(location.id);
            const completed = isCompleted(location.id);
            const status = completed ? "Peti terbuka" : unlocked ? "Jelajahi" : "Terkunci";
            return `<button class="map-location map-location--${location.id}${completed ? " is-completed" : ""}${unlocked ? " is-unlocked" : " is-locked"}" type="button" data-location="${location.id}" ${unlocked ? "" : "disabled"} aria-label="${location.region}: ${status}"><span class="map-location-icon">${location.icon}</span><strong>${location.region}</strong><small>${completed ? "✓ Peti terbuka" : unlocked ? "Buka peti" : `🔒 Lokasi ${index + 1}`}</small></button>`;
          })
          .join("")}<span class="map-compass" aria-hidden="true">N<br /><b>✦</b></span></div>
        <div class="treasure-map-tip"><span aria-hidden="true">🧭</span><p><strong>Petunjuk:</strong> lokasi baru terbuka setelah peti sebelumnya berhasil ditemukan.</p></div>
      </section>
      <footer class="treasure-footer treasure-footer--map">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved. ${renderPlatformVersion()}</footer>
    </main>
  `;
  document
    .querySelector<HTMLButtonElement>("#change-phase")
    ?.addEventListener("click", renderSetup);
  document
    .querySelectorAll<HTMLButtonElement>("[data-location]")
    .forEach((button) =>
      button.addEventListener("click", () => startLocation(button.dataset.location as LocationId)),
    );
}

function startLocation(id: LocationId): void {
  const location = locationById(id);
  if (!isUnlocked(id)) return;
  const questions = questionsForLocation(location);
  if (questions.length === 0) throw new Error(`Belum ada soal untuk ${location.region}.`);
  clearTransition();
  destroyDialogs();
  currentLocation = location;
  currentQuestions = questions;
  session = createGameSession(currentQuestions, {
    questionCount: Math.min(2, currentQuestions.length),
    remedialGap: 1,
    pointsPerCorrectAnswer: 100,
    immediateRetries: 1,
  });
  activeQuestionId = "";
  activeChoices = [];
  inputLocked = false;
  streak = 0;
  sessionFinished = false;
  app.innerHTML = `
    <main class="treasure-game-screen">
      ${renderGameHud({
        brandHref: portalUrl,
        brandLabel: "Treasure Hunt",
        soundEnabled,
        stats: [
          {
            id: "treasure-xp",
            icon: "⭐",
            label: "XP",
            value: progress.xp.toLocaleString("id-ID"),
          },
          {
            id: "treasure-coins",
            icon: "💰",
            label: "Koin",
            value: progress.coins.toLocaleString("id-ID"),
          },
          {
            id: "treasure-clues",
            icon: "🗺️",
            label: "Petunjuk",
            value: `0/${session.getSnapshot().target}`,
          },
          { id: "treasure-streak", icon: "🔥", label: "Streak", value: "0" },
          {
            id: "treasure-level",
            icon: "🏆",
            label: "Level",
            value: String(levelFromXp(progress.xp)),
          },
        ],
      })}
      <section class="treasure-arena" aria-label="Pencarian harta di ${location.region}">
        <div class="treasure-scene treasure-scene--${location.id}" aria-hidden="true"><span class="scene-sun">☀</span><span class="scene-cloud scene-cloud-one"></span><span class="scene-cloud scene-cloud-two"></span><span class="scene-land scene-land-back"></span><span class="scene-land scene-land-front"></span><span class="scene-location-icon">${location.icon}</span><span class="scene-chest" id="scene-chest">🧰</span><span class="scene-spark spark-one">✦</span><span class="scene-spark spark-two">✦</span></div>
        <section class="treasure-question-card" aria-labelledby="treasure-question-title">
          <div class="treasure-question-meta"><span id="treasure-region">${location.region}</span><span id="treasure-progress-label"></span></div>
          <h1 id="treasure-question-title" tabindex="-1">Petunjuk ditemukan!</h1>
          <p class="treasure-clue" id="treasure-clue">${location.clue}</p>
          <div class="treasure-source-question"><span>Soal dari peta</span><p id="treasure-question" aria-live="polite"></p></div>
          <div id="treasure-choices" class="treasure-choices" aria-label="Pilihan jawaban"></div>
          <div class="treasure-feedback" id="treasure-feedback" role="status" aria-live="assertive"></div>
        </section>
        <div class="treasure-tip"><span aria-hidden="true">💡</span><p><strong>Ingat:</strong> baca petunjuknya dahulu, lalu pilih jawaban yang membuka peti.</p></div>
      </section>
      ${renderSessionDialogs({
        gameName: "Treasure Hunt",
        helpItems: [
          {
            icon: "🗺️",
            title: "Baca petunjuk",
            detail: "Petunjuk memberi konteks sebelum soal di setiap peti.",
          },
          {
            icon: "🧰",
            title: "Buka peti",
            detail: "Pilih jawaban dengan sentuhan atau tombol 1–3.",
          },
          {
            icon: "⌨️",
            title: "Jeda kapan saja",
            detail: "Tombol P atau Escape membuka jeda; perpindahan tab juga dijeda.",
          },
        ],
      })}
    </main>
  `;
  const pauseOverlay = document.querySelector<HTMLElement>("#pause-overlay");
  const helpOverlay = document.querySelector<HTMLElement>("#help-overlay");
  if (!pauseOverlay || !helpOverlay) throw new Error("Dialog shell permainan tidak ditemukan.");
  pauseDialogController = createDialogController(pauseOverlay, { onEscape: resumeHunt });
  helpDialogController = createDialogController(helpOverlay, { onEscape: closeHelp });
  document
    .querySelector<HTMLButtonElement>("#sound-button")
    ?.addEventListener("click", toggleSound);
  document.querySelector<HTMLButtonElement>("#help-button")?.addEventListener("click", openHelp);
  document
    .querySelector<HTMLButtonElement>("#fullscreen-button")
    ?.addEventListener("click", toggleFullscreen);
  document.querySelector<HTMLButtonElement>("#pause-button")?.addEventListener("click", pauseHunt);
  document
    .querySelector<HTMLButtonElement>("#resume-button")
    ?.addEventListener("click", resumeHunt);
  document.querySelector<HTMLButtonElement>("#quit-button")?.addEventListener("click", quitHunt);
  document
    .querySelector<HTMLButtonElement>("#close-help-button")
    ?.addEventListener("click", closeHelp);
  renderQuestion();
}

function renderQuestion(): void {
  if (!session || !currentLocation) return;
  const snapshot = session.getSnapshot();
  if (snapshot.completed || !snapshot.currentQuestion) {
    finishLocation();
    return;
  }
  const question = snapshot.currentQuestion;
  if (activeQuestionId !== question.id) {
    activeQuestionId = question.id;
    activeChoices = shuffleQuestionChoices(question);
  }
  inputLocked = false;
  setText(
    "#treasure-progress-label",
    `Petunjuk ${Math.min(snapshot.progress + 1, snapshot.target)} dari ${snapshot.target}`,
  );
  setText("#treasure-question", question.prompt);
  setText("#treasure-clues", `${snapshot.progress}/${snapshot.target}`);
  updateHud();
  renderChoices();
  hideFeedback();
  document.querySelector<HTMLElement>("#treasure-question-title")?.focus({ preventScroll: true });
}

function renderChoices(): void {
  const choices = document.querySelector<HTMLElement>("#treasure-choices");
  if (!choices) return;
  choices.innerHTML = activeChoices
    .map(
      (choice, index) =>
        `<button class="treasure-choice" type="button" data-choice-index="${index}" aria-label="Pilihan ${index + 1}: ${escapeHtml(choice)}"><span>${index + 1}</span><strong>${escapeHtml(choice)}</strong></button>`,
    )
    .join("");
  choices
    .querySelectorAll<HTMLButtonElement>("[data-choice-index]")
    .forEach((button) =>
      button.addEventListener("click", () => chooseAnswer(Number(button.dataset.choiceIndex))),
    );
}

function chooseAnswer(index: number): void {
  if (inputLocked || !session || !currentLocation) return;
  const answer = activeChoices[index];
  if (answer === undefined) return;
  const question = session.getSnapshot().currentQuestion;
  if (!question) return;
  inputLocked = true;
  document
    .querySelectorAll<HTMLButtonElement>(".treasure-choice")
    .forEach((button) => (button.disabled = true));
  const attempt = session.submitAnswer(answer);
  if (attempt.correct) {
    streak += 1;
    progress.xp += 100;
    progress.coins += 8 + Math.min(streak - 1, 5);
    progress.bestStreak = Math.max(progress.bestStreak, streak);
    saveProgress();
    updateHud();
    document.querySelector<HTMLElement>("#scene-chest")?.classList.add("is-open");
    showFeedback(`🎉 Peti terbuka! +100 XP · +${8 + Math.min(streak - 1, 5)} koin`, "success");
    playTone(720, 0.18, "sine");
    scheduleTransition(renderQuestion, 950);
    return;
  }
  streak = 0;
  updateHud();
  playTone(150, 0.16, "sawtooth");
  const sameQuestion = session.getSnapshot().currentQuestion?.id === question.id;
  showFeedback(
    sameQuestion
      ? `🌱 Belum tepat. ${question.explanation}`
      : "🔎 Belum tepat. Petunjuk ini akan muncul lagi setelah lokasi berikutnya.",
    "error",
  );
  scheduleTransition(
    () => {
      if (sameQuestion) {
        inputLocked = false;
        renderChoices();
      } else renderQuestion();
    },
    sameQuestion ? 1_150 : 1_450,
  );
}

function finishLocation(): void {
  if (!session || !currentLocation || sessionFinished) return;
  sessionFinished = true;
  clearTransition();
  session.finish();
  progress.sessions += 1;
  saveProgress();
  const location = currentLocation;
  const wasCompleted = isCompleted(location.id);
  const completedLocations = new Set(huntSave.completedLocations);
  completedLocations.add(location.id);
  const unlockedLocations = new Set(huntSave.unlockedLocations);
  if (location.unlocks) unlockedLocations.add(location.unlocks);
  huntSave = {
    version: 1,
    completedLocations: [...completedLocations],
    unlockedLocations: [...unlockedLocations],
  };
  saveHunt();
  const report = createSessionReport(session.getResult(), currentQuestions);
  const rewardText = wasCompleted
    ? "Peti ini sudah tercatat sebelumnya."
    : `Hadiah lokasi: +${location.rewardXp} XP · +${location.rewardCoins} koin`;
  if (!wasCompleted) {
    progress.xp += location.rewardXp;
    progress.coins += location.rewardCoins;
    saveProgress();
  }
  destroyDialogs();
  const nextLabel = location.unlocks
    ? `Lanjut ke ${locationById(location.unlocks).region}`
    : "Lihat peta selesai";
  app.innerHTML = `<main class="treasure-result"><div class="treasure-result-card"><p class="treasure-result-eyebrow">PETI TERBUKA · ${location.region.toUpperCase()}</p><div class="treasure-result-icon">🧰</div><h1 id="treasure-result-title" tabindex="-1">Petunjuk berhasil ditemukan${playerNickname ? `, ${escapeHtml(playerNickname)}` : ""}!</h1><p>${rewardText}</p>${renderSessionReport(report)}<section class="treasure-reward"><span>PROGRES PETA</span><strong>${completedCount()}/3 lokasi</strong></section><div class="treasure-result-actions"><button class="treasure-primary-button" id="back-to-map" type="button">${nextLabel}</button><button class="treasure-secondary-button" id="retry-location" type="button">Ulangi lokasi</button></div><p class="treasure-result-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved. ${renderPlatformVersion()}</p></div></main>`;
  document.querySelector<HTMLButtonElement>("#back-to-map")?.addEventListener("click", renderMap);
  document
    .querySelector<HTMLButtonElement>("#retry-location")
    ?.addEventListener("click", () => startLocation(location.id));
  document.querySelector<HTMLElement>("#treasure-result-title")?.focus({ preventScroll: true });
}

function updateHud(): void {
  setText("#treasure-xp", progress.xp.toLocaleString("id-ID"));
  setText("#treasure-coins", progress.coins.toLocaleString("id-ID"));
  setText("#treasure-streak", String(streak));
  setText("#treasure-level", String(levelFromXp(progress.xp)));
  const snapshot = session?.getSnapshot();
  if (snapshot) setText("#treasure-clues", `${snapshot.progress}/${snapshot.target}`);
}

function showFeedback(message: string, kind: "success" | "error"): void {
  const feedback = document.querySelector<HTMLElement>("#treasure-feedback");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `treasure-feedback is-visible treasure-feedback--${kind}`;
}

function hideFeedback(): void {
  const feedback = document.querySelector<HTMLElement>("#treasure-feedback");
  if (feedback) {
    feedback.textContent = "";
    feedback.className = "treasure-feedback";
  }
}

function pauseHunt(): void {
  if (!session || session.getSnapshot().completed || inputLocked) return;
  session.pause();
  pauseDialogController?.open(document.querySelector<HTMLButtonElement>("#pause-button"));
}

function resumeHunt(): void {
  if (!session) return;
  pauseDialogController?.close();
  session.resume();
  const deferred = pendingTransition;
  pendingTransition = null;
  if (deferred) deferred();
}

function openHelp(): void {
  if (!session || inputLocked) return;
  resumeAfterHelp = !session.getSnapshot().paused;
  if (resumeAfterHelp) session.pause();
  helpDialogController?.open(document.querySelector<HTMLButtonElement>("#help-button"));
}

function closeHelp(): void {
  if (!helpDialogController?.isOpen()) return;
  helpDialogController.close();
  if (resumeAfterHelp) session?.resume();
  resumeAfterHelp = false;
}

function quitHunt(): void {
  if (
    !session ||
    window.confirm("Kembali ke peta? Progres peti sesi ini tetap tersimpan setelah selesai.")
  ) {
    clearTransition();
    session?.finish();
    renderMap();
  }
}

function scheduleTransition(callback: () => void, delayMs: number): void {
  clearTransition();
  transitionTimerId = window.setTimeout(() => {
    transitionTimerId = null;
    if (session?.getSnapshot().paused) pendingTransition = callback;
    else callback();
  }, delayMs);
}

function clearTransition(): void {
  if (transitionTimerId !== null) window.clearTimeout(transitionTimerId);
  transitionTimerId = null;
  pendingTransition = null;
}

function destroyDialogs(): void {
  pauseDialogController?.destroy();
  helpDialogController?.destroy();
  pauseDialogController = null;
  helpDialogController = null;
  resumeAfterHelp = false;
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
    gain.gain.setValueAtTime(0.07, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
    oscillator.addEventListener("ended", () => context.close(), { once: true });
  } catch {
    /* Audio adalah pelengkap. */
  }
}

async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
}

document.addEventListener("keydown", (event) => {
  if (!document.querySelector(".treasure-game-screen")) return;
  if (event.key.toLowerCase() === "p") {
    if (pauseDialogController?.isOpen()) resumeHunt();
    else pauseHunt();
    return;
  }
  if (
    event.key === "Escape" &&
    !pauseDialogController?.isOpen() &&
    !helpDialogController?.isOpen()
  ) {
    pauseHunt();
    return;
  }
  if (inputLocked || session?.getSnapshot().paused || helpDialogController?.isOpen()) return;
  const index = Number(event.key) - 1;
  if (index >= 0 && index < activeChoices.length) {
    event.preventDefault();
    document.querySelector<HTMLButtonElement>(`[data-choice-index="${index}"]`)?.click();
  }
});

document.addEventListener("visibilitychange", () => {
  if (
    document.hidden &&
    document.querySelector(".treasure-game-screen") &&
    session &&
    !session.getSnapshot().paused
  )
    pauseHunt();
});

renderSetup();

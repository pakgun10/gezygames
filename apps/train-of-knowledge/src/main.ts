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

type TrainPhase = Phase;
type LocationId = "harbor" | "forest" | "mountain";

interface LocationDefinition {
  readonly id: LocationId;
  readonly region: string;
  readonly title: string;
  readonly icon: string;
  readonly clue: string;
  readonly description: string;
  readonly topicsByPhase: Readonly<Record<TrainPhase, readonly string[]>>;
  readonly rewardXp: number;
  readonly rewardCoins: number;
  readonly unlocks?: LocationId;
}

interface HuntSave {
  readonly version: 1;
  readonly completedLocations: readonly LocationId[];
  readonly unlockedLocations: readonly LocationId[];
  readonly carriages: number;
}

interface HuntProgress {
  xp: number;
  coins: number;
  bestStreak: number;
  sessions: number;
  lastPlayedAt?: string;
}

const portalUrl = import.meta.env.DEV ? "http://localhost:5173/" : "/";
const storageKey = "gezy-games:train-of-knowledge:v1";
const appElement = document.querySelector<HTMLDivElement>("#app");
if (!appElement) throw new Error("Elemen aplikasi tidak ditemukan.");
const app = appElement;
const trainPhases: readonly TrainPhase[] = phases;
const phaseDescriptions: Record<TrainPhase, string> = {
  Fondasi: "TK–PAUD",
  A: "Kelas 1–2",
  B: "Kelas 3–4",
  C: "Kelas 5–6",
  D: "Kelas 7–9",
};

const locations: readonly LocationDefinition[] = [
  {
    id: "harbor",
    region: "Stasiun Pelabuhan",
    title: "Gerbong Keberangkatan",
    icon: "🚉",
    clue: "Kereta siap berangkat. Jawab soal pertama untuk memasang gerbong belajar.",
    description: "Mulai perjalanan dari pelabuhan dan kumpulkan gerbong pertama.",
    topicsByPhase: {
      Fondasi: ["Membilang", "Pola"],
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
    region: "Stasiun Hutan",
    title: "Gerbong Penjelajah",
    icon: "🌳",
    clue: "Rel bercabang di tengah hutan. Pilih jawaban yang tepat agar kereta membuka jalur berikutnya.",
    description: "Lewati hutan sambil menambah gerbong kedua.",
    topicsByPhase: {
      Fondasi: ["Bentuk", "Posisi"],
      A: ["Nilai tempat", "Pola bilangan"],
      B: ["Pecahan", "Keliling"],
      C: ["Persentase", "Perbandingan"],
      D: ["Fungsi", "Persamaan linear"],
    },
    rewardXp: 180,
    rewardCoins: 40,
    unlocks: "mountain",
  },
  {
    id: "mountain",
    region: "Stasiun Puncak",
    title: "Gerbong Pengetahuan",
    icon: "🏔️",
    clue: "Di puncak, kondektur memberi tantangan terakhir. Jawaban benar membawa kereta ke tujuan.",
    description: "Tuntaskan perjalanan dan rayakan semua gerbong yang terkumpul.",
    topicsByPhase: {
      Fondasi: ["Banyak dan sedikit", "Posisi"],
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
    if (!raw)
      return { version: 1, completedLocations: [], unlockedLocations: ["harbor"], carriages: 0 };
    const parsed = JSON.parse(raw) as Partial<HuntSave>;
    const validIds = new Set<LocationId>(locations.map((location) => location.id));
    if (parsed.version !== 1 || !Array.isArray(parsed.unlockedLocations)) {
      return { version: 1, completedLocations: [], unlockedLocations: ["harbor"], carriages: 0 };
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
      unlockedLocations: unlockedLocations.includes("harbor") ? unlockedLocations : ["harbor"],
      carriages:
        typeof parsed.carriages === "number" && parsed.carriages >= 0
          ? Math.floor(parsed.carriages)
          : completedLocations.length,
    };
  } catch {
    return { version: 1, completedLocations: [], unlockedLocations: ["harbor"], carriages: 0 };
  }
};

let huntSave = readHuntSave();
let trainCarriages = huntSave.carriages;
let selectedPhase: TrainPhase = "A";
let playerNickname = loadPlayerProgress().preferences.nickname;
let soundEnabled = loadPlayerProgress().preferences.audioEnabled;
const progress: HuntProgress = { ...loadGameProgress("train-of-knowledge") };
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
    localStorage.setItem(storageKey, JSON.stringify({ ...huntSave, carriages: trainCarriages }));
  } catch {
    // Progres peta adalah tambahan; sesi tetap dapat berjalan tanpa storage.
  }
};

const saveProgress = (): void => {
  saveGameProgress("train-of-knowledge", {
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
    <main class="train-setup">
      <header class="train-header">
        <a class="train-brand" href="${portalUrl}" aria-label="Kembali ke Gezy Games"><span aria-hidden="true">★</span><strong>Gezy</strong> Games</a>
        <a class="train-back" href="${portalUrl}">← Semua game</a>
      </header>
      <div class="train-setup-grid">
        <section class="train-intro" aria-labelledby="train-title">
          <p class="train-eyebrow">EKSPLORASI · PETUNJUK · HADIAH</p>
          <h1 id="train-title"><span>Train</span> of Knowledge</h1>
          <p>Naik kereta pengetahuan, jawab soal di tiga stasiun, dan tambahkan gerbong setelah jawaban benar.</p>
          <div class="train-preview" aria-hidden="true"><span class="preview-sun">☀</span><span class="preview-cloud cloud-one"></span><span class="preview-cloud cloud-two"></span><span class="preview-island">🚂</span><span class="preview-map">✦</span><span class="preview-chest">🎓</span><span class="preview-flag">⚑</span></div>
          <ul class="train-features"><li>✓ Stasiun terbuka bertahap</li><li>✓ Gerbong bertambah saat benar</li><li>✓ Ramah sentuh & keyboard</li></ul>
        </section>
        <section class="train-setup-card" aria-label="Pengaturan permainan">
          <div class="train-stats"><div><span>LEVEL</span><strong>${levelFromXp(progress.xp)}</strong></div><div><span>XP</span><strong>${progress.xp.toLocaleString("id-ID")}</strong></div><div><span>GERBONG</span><strong>${completedCount()}/3</strong></div></div>
          <label class="train-name-field"><span>Nama penjelajah <small>(opsional)</small></span><input id="train-nickname" type="text" maxlength="30" autocomplete="nickname" value="${escapeHtml(playerNickname)}" placeholder="Contoh: Bima" /></label>
          <fieldset><legend>Pilih fase belajar</legend><div class="train-phase-options">${trainPhases
            .map(
              (phase) =>
                `<button class="train-phase-option${phase === selectedPhase ? " is-selected" : ""}" type="button" data-phase="${phase}" aria-pressed="${phase === selectedPhase}"><strong>${phase}</strong><span>Fase ${phase}</span><small>${phaseDescriptions[phase]}</small></button>`,
            )
            .join("")}</div></fieldset>
          <button class="train-primary-button" id="open-map" type="button">Lihat rute <span aria-hidden="true">→</span></button>
          <p class="train-note">3 stasiun · sekitar 4 menit · tombol 1–3</p>
        </section>
      </div>
      <footer class="train-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved. ${renderPlatformVersion()}</footer>
    </main>
  `;
  document.querySelectorAll<HTMLButtonElement>("[data-phase]").forEach((button) =>
    button.addEventListener("click", () => {
      playerNickname =
        document.querySelector<HTMLInputElement>("#train-nickname")?.value.trim() ?? playerNickname;
      selectedPhase = button.dataset.phase as TrainPhase;
      savePlayerPreferences({ nickname: playerNickname, lastPhase: selectedPhase, lastTopic: "" });
      renderSetup();
    }),
  );
  document.querySelector<HTMLButtonElement>("#open-map")?.addEventListener("click", openMap);
}

function openMap(): void {
  playerNickname =
    document.querySelector<HTMLInputElement>("#train-nickname")?.value.trim().slice(0, 30) ??
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
    <main class="train-map-screen">
      ${renderGameHud({
        brandHref: portalUrl,
        brandLabel: "Train of Knowledge",
        soundEnabled,
        stats: [
          {
            id: "train-xp",
            icon: "⭐",
            label: "XP",
            value: progress.xp.toLocaleString("id-ID"),
          },
          {
            id: "train-coins",
            icon: "💰",
            label: "Koin",
            value: progress.coins.toLocaleString("id-ID"),
          },
          { id: "train-chests", icon: "🚃", label: "Gerbong", value: String(trainCarriages) },
          {
            id: "train-level",
            icon: "🏆",
            label: "Level",
            value: String(levelFromXp(progress.xp)),
          },
        ],
      })}
      <section class="train-map" aria-labelledby="map-title">
        <div class="train-map-heading"><div><p class="train-eyebrow">RUTE FASE ${selectedPhase}</p><h1 id="map-title">Pilih stasiun berikutnya</h1><p>Jawab soal untuk menambah gerbong dan membuka stasiun berikutnya.</p></div><button class="train-map-change" id="change-phase" type="button">Ganti fase</button></div>
        <div class="island-map" aria-label="Rute tiga stasiun Train of Knowledge"><span class="map-route route-one"></span><span class="map-route route-two"></span>${locations
          .map((location, index) => {
            const unlocked = isUnlocked(location.id);
            const completed = isCompleted(location.id);
            const status = completed ? "Gerbong terbuka" : unlocked ? "Jelajahi" : "Terkunci";
            return `<button class="map-location map-location--${location.id}${completed ? " is-completed" : ""}${unlocked ? " is-unlocked" : " is-locked"}" type="button" data-location="${location.id}" ${unlocked ? "" : "disabled"} aria-label="${location.region}: ${status}"><span class="map-location-icon">${location.icon}</span><strong>${location.region}</strong><small>${completed ? "✓ Gerbong terbuka" : unlocked ? "Buka gerbong" : `🔒 Lokasi ${index + 1}`}</small></button>`;
          })
          .join("")}<span class="map-compass" aria-hidden="true">N<br /><b>✦</b></span></div>
        <div class="train-map-tip"><span aria-hidden="true">🚂</span><p><strong>Petunjuk:</strong> stasiun baru terbuka setelah soal di stasiun sebelumnya selesai.</p></div>
      </section>
      <footer class="train-footer train-footer--map">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved. ${renderPlatformVersion()}</footer>
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
    <main class="train-game-screen">
      ${renderGameHud({
        brandHref: portalUrl,
        brandLabel: "Train of Knowledge",
        soundEnabled,
        stats: [
          {
            id: "train-xp",
            icon: "⭐",
            label: "XP",
            value: progress.xp.toLocaleString("id-ID"),
          },
          {
            id: "train-coins",
            icon: "💰",
            label: "Koin",
            value: progress.coins.toLocaleString("id-ID"),
          },
          {
            id: "train-clues",
            icon: "🗺️",
            label: "Petunjuk",
            value: `0/${session.getSnapshot().target}`,
          },
          { id: "train-streak", icon: "🔥", label: "Streak", value: "0" },
          {
            id: "train-level",
            icon: "🏆",
            label: "Level",
            value: String(levelFromXp(progress.xp)),
          },
        ],
      })}
      <section class="train-arena" aria-label="Perjalanan kereta di ${location.region}">
        <div class="train-scene train-scene--${location.id}" aria-hidden="true"><span class="scene-sun">☀</span><span class="scene-cloud scene-cloud-one"></span><span class="scene-cloud scene-cloud-two"></span><span class="scene-land scene-land-back"></span><span class="scene-land scene-land-front"></span><span class="scene-location-icon">${location.icon}</span><span class="scene-chest" id="scene-chest">🧰</span><span class="scene-spark spark-one">✦</span><span class="scene-spark spark-two">✦</span></div>
        <section class="train-question-card" aria-labelledby="train-question-title">
          <div class="train-question-meta"><span id="train-region">${location.region}</span><span id="train-progress-label"></span></div>
          <h1 id="train-question-title" tabindex="-1">Tantangan stasiun</h1>
          <p class="train-clue" id="train-clue">${location.clue}</p>
          <div class="train-source-question"><span>Soal kondektur</span><p id="train-question" aria-live="polite"></p></div>
          <div id="train-choices" class="train-choices" aria-label="Pilihan jawaban"></div>
          <div class="train-feedback" id="train-feedback" role="status" aria-live="assertive"></div>
        </section>
        <div class="train-tip"><span aria-hidden="true">💡</span><p><strong>Ingat:</strong> baca petunjuknya dahulu, lalu pilih jawaban yang membuka gerbong.</p></div>
      </section>
      ${renderSessionDialogs({
        gameName: "Train of Knowledge",
        helpItems: [
          {
            icon: "🚉",
            title: "Berangkat dari stasiun",
            detail: "Setiap stasiun memiliki materi dan tantangan berbeda.",
          },
          {
            icon: "🚃",
            title: "Tambah gerbong",
            detail: "Jawaban benar menambah gerbong dan XP.",
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
    "#train-progress-label",
    `Soal ${Math.min(snapshot.progress + 1, snapshot.target)} dari ${snapshot.target}`,
  );
  setText("#train-question", question.prompt);
  setText("#train-clues", `${snapshot.progress}/${snapshot.target}`);
  updateHud();
  renderChoices();
  hideFeedback();
  document.querySelector<HTMLElement>("#train-question-title")?.focus({ preventScroll: true });
}

function renderChoices(): void {
  const choices = document.querySelector<HTMLElement>("#train-choices");
  if (!choices) return;
  choices.innerHTML = activeChoices
    .map(
      (choice, index) =>
        `<button class="train-choice" type="button" data-choice-index="${index}" aria-label="Pilihan ${index + 1}: ${escapeHtml(choice)}"><span>${index + 1}</span><strong>${escapeHtml(choice)}</strong></button>`,
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
    .querySelectorAll<HTMLButtonElement>(".train-choice")
    .forEach((button) => (button.disabled = true));
  const attempt = session.submitAnswer(answer);
  if (attempt.correct) {
    streak += 1;
    trainCarriages += 1;
    progress.xp += 100;
    progress.coins += 8 + Math.min(streak - 1, 5);
    progress.bestStreak = Math.max(progress.bestStreak, streak);
    saveHunt();
    saveProgress();
    updateHud();
    document.querySelector<HTMLElement>("#scene-chest")?.classList.add("is-open");
    showFeedback(`🎉 Gerbong terbuka! +100 XP · +${8 + Math.min(streak - 1, 5)} koin`, "success");
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
      : "🔎 Belum tepat. Pembahasan tersimpan, lanjutkan perjalanan.",
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
    carriages: trainCarriages,
  };
  saveHunt();
  const report = createSessionReport(session.getResult(), currentQuestions);
  const rewardText = wasCompleted
    ? "Stasiun ini sudah tercatat sebelumnya."
    : `Hadiah stasiun: +${location.rewardXp} XP · +${location.rewardCoins} koin`;
  if (!wasCompleted) {
    progress.xp += location.rewardXp;
    progress.coins += location.rewardCoins;
    saveProgress();
  }
  destroyDialogs();
  const nextLabel = location.unlocks
    ? `Berangkat ke ${locationById(location.unlocks).region}`
    : "Lihat rute selesai";
  app.innerHTML = `<main class="train-result"><div class="train-result-card"><p class="train-result-eyebrow">STASIUN SELESAI · ${location.region.toUpperCase()}</p><div class="train-result-icon">🚂</div><h1 id="train-result-title" tabindex="-1">Perjalanan berlanjut${playerNickname ? `, ${escapeHtml(playerNickname)}` : ""}!</h1><p>${rewardText}</p>${renderSessionReport(report)}<section class="train-reward"><span>PROGRES PERJALANAN</span><strong>${completedCount()}/3 stasiun · ${trainCarriages} gerbong</strong></section><div class="train-result-actions"><button class="train-primary-button" id="back-to-map" type="button">${nextLabel}</button><button class="train-secondary-button" id="retry-location" type="button">Ulangi stasiun</button></div><p class="train-result-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved. ${renderPlatformVersion()}</p></div></main>`;
  document.querySelector<HTMLButtonElement>("#back-to-map")?.addEventListener("click", renderMap);
  document
    .querySelector<HTMLButtonElement>("#retry-location")
    ?.addEventListener("click", () => startLocation(location.id));
  document.querySelector<HTMLElement>("#train-result-title")?.focus({ preventScroll: true });
}

function updateHud(): void {
  setText("#train-xp", progress.xp.toLocaleString("id-ID"));
  setText("#train-coins", progress.coins.toLocaleString("id-ID"));
  setText("#train-chests", String(trainCarriages));
  setText("#train-streak", String(streak));
  setText("#train-level", String(levelFromXp(progress.xp)));
  const snapshot = session?.getSnapshot();
  if (snapshot) setText("#train-clues", `${snapshot.progress}/${snapshot.target}`);
}

function showFeedback(message: string, kind: "success" | "error"): void {
  const feedback = document.querySelector<HTMLElement>("#train-feedback");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `train-feedback is-visible train-feedback--${kind}`;
}

function hideFeedback(): void {
  const feedback = document.querySelector<HTMLElement>("#train-feedback");
  if (feedback) {
    feedback.textContent = "";
    feedback.className = "train-feedback";
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
    window.confirm("Kembali ke peta? Progres gerbong sesi ini tetap tersimpan setelah selesai.")
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
  if (!document.querySelector(".train-game-screen")) return;
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
    document.querySelector(".train-game-screen") &&
    session &&
    !session.getSnapshot().paused
  )
    pauseHunt();
});

renderSetup();

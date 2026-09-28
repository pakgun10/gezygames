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

type CityPhase = Exclude<Phase, "Fondasi">;
type LocationId = "school" | "market" | "park" | "factory";

interface LocationDefinition {
  readonly id: LocationId;
  readonly region: string;
  readonly title: string;
  readonly icon: string;
  readonly clue: string;
  readonly description: string;
  readonly topicsByPhase: Readonly<Record<CityPhase, readonly string[]>>;
  readonly rewardXp: number;
  readonly rewardCoins: number;
  readonly cost: number;
  readonly unlocks?: LocationId;
}

interface HuntSave {
  readonly version: 1;
  readonly completedLocations: readonly LocationId[];
  readonly unlockedLocations: readonly LocationId[];
  readonly budget: number;
}

interface HuntProgress {
  xp: number;
  coins: number;
  bestStreak: number;
  sessions: number;
  lastPlayedAt?: string;
}

const portalUrl = import.meta.env.DEV ? "http://localhost:5173/" : "/";
const storageKey = "gezy-games:build-the-city:v1";
const appElement = document.querySelector<HTMLDivElement>("#app");
if (!appElement) throw new Error("Elemen aplikasi tidak ditemukan.");
const app = appElement;
const cityPhases: readonly CityPhase[] = phases.filter(
  (phase): phase is CityPhase => phase !== "Fondasi",
);
const phaseDescriptions: Record<CityPhase, string> = {
  A: "Kelas 1–2",
  B: "Kelas 3–4",
  C: "Kelas 5–6",
  D: "Kelas 7–9",
};

const locations: readonly LocationDefinition[] = [
  {
    id: "school",
    region: "Sekolah Ceria",
    title: "Bangun sekolah",
    icon: "🏫",
    clue: "Anak-anak membutuhkan ruang belajar. Hitung dengan cermat sebelum membangun sekolah.",
    description: "Fasilitas pertama untuk memulai kota belajar.",
    topicsByPhase: {
      A: ["Penjumlahan", "Pengurangan"],
      B: ["Perkalian", "Pembagian"],
      C: ["Pecahan", "Desimal"],
      D: ["Himpunan", "Relasi"],
    },
    rewardXp: 140,
    rewardCoins: 30,
    cost: 50,
    unlocks: "market",
  },
  {
    id: "market",
    region: "Pasar Sejahtera",
    title: "Bangun pasar",
    icon: "🏪",
    clue: "Warga perlu tempat berbelanja. Gunakan konsep nilai tempat dan pola untuk menata pasar.",
    description: "Pasar menghidupkan ekonomi dan membuka taman kota.",
    topicsByPhase: {
      A: ["Nilai tempat", "Pola bilangan"],
      B: ["Pecahan", "Keliling"],
      C: ["Persentase", "Perbandingan"],
      D: ["Fungsi", "Persamaan linear"],
    },
    rewardXp: 180,
    rewardCoins: 40,
    cost: 80,
    unlocks: "park",
  },
  {
    id: "park",
    region: "Taman Pintar",
    title: "Bangun taman",
    icon: "🌳",
    clue: "Ruang hijau membuat kota sehat. Pecahkan soal pecahan, luas, atau desimal untuk menanam taman.",
    description: "Taman memberi ruang bermain dan belajar di luar kelas.",
    topicsByPhase: {
      A: ["Pengukuran panjang", "Penjumlahan"],
      B: ["Penjumlahan", "Perkalian"],
      C: ["Luas", "Desimal"],
      D: ["SPLDV", "Relasi"],
    },
    rewardXp: 240,
    rewardCoins: 60,
    cost: 100,
    unlocks: "factory",
  },
  {
    id: "factory",
    region: "Pabrik Inovasi",
    title: "Bangun pabrik",
    icon: "🏭",
    clue: "Tantangan akhir kota: rencanakan produksi dengan persamaan dan fungsi.",
    description: "Pabrik menyelesaikan kota dan menghasilkan masa depan baru.",
    topicsByPhase: {
      A: ["Penjumlahan", "Pengurangan"],
      B: ["Perkalian", "Pembagian"],
      C: ["Persentase", "Perbandingan"],
      D: ["SPLDV", "Persamaan linear"],
    },
    rewardXp: 300,
    rewardCoins: 80,
    cost: 130,
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
      return { version: 1, completedLocations: [], unlockedLocations: ["school"], budget: 240 };
    const parsed = JSON.parse(raw) as Partial<HuntSave>;
    const validIds = new Set<LocationId>(locations.map((location) => location.id));
    if (parsed.version !== 1 || !Array.isArray(parsed.unlockedLocations)) {
      return { version: 1, completedLocations: [], unlockedLocations: ["school"], budget: 240 };
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
      unlockedLocations: unlockedLocations.includes("school") ? unlockedLocations : ["school"],
      budget:
        typeof parsed.budget === "number" && parsed.budget >= 0 ? Math.floor(parsed.budget) : 240,
    };
  } catch {
    return { version: 1, completedLocations: [], unlockedLocations: ["school"], budget: 240 };
  }
};

let huntSave = readHuntSave();
let cityBudget = huntSave.budget;
let selectedPhase: CityPhase = "A";
let playerNickname = loadPlayerProgress().preferences.nickname;
let soundEnabled = loadPlayerProgress().preferences.audioEnabled;
const progress: HuntProgress = { ...loadGameProgress("build-the-city") };
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
    localStorage.setItem(storageKey, JSON.stringify({ ...huntSave, budget: cityBudget }));
  } catch {
    // Progres peta adalah tambahan; sesi tetap dapat berjalan tanpa storage.
  }
};

const saveProgress = (): void => {
  saveGameProgress("build-the-city", {
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
    <main class="city-setup">
      <header class="city-header">
        <a class="city-brand" href="${portalUrl}" aria-label="Kembali ke Gezy Games"><span aria-hidden="true">★</span><strong>Gezy</strong> Games</a>
        <a class="city-back" href="${portalUrl}">← Semua game</a>
      </header>
      <div class="city-setup-grid">
        <section class="city-intro" aria-labelledby="city-title">
          <p class="city-eyebrow">EKSPLORASI · PETUNJUK · HADIAH</p>
          <h1 id="city-title"><span>Build</span> the City</h1>
          <p>Bangun kota belajar dengan menjawab soal. Setiap jawaban benar menambah anggaran untuk fasilitas berikutnya.</p>
          <div class="city-preview" aria-hidden="true"><span class="preview-sun">☀</span><span class="preview-cloud cloud-one"></span><span class="preview-cloud cloud-two"></span><span class="preview-island">🏙️</span><span class="preview-map">✦</span><span class="preview-chest">🏫</span><span class="preview-flag">🌳</span></div>
          <ul class="city-features"><li>✓ Anggaran terlihat jelas</li><li>✓ Empat bangunan berdampak visual</li><li>✓ Saldo aman tanpa negatif</li></ul>
        </section>
        <section class="city-setup-card" aria-label="Pengaturan permainan">
          <div class="city-stats"><div><span>LEVEL</span><strong>${levelFromXp(progress.xp)}</strong></div><div><span>XP</span><strong>${progress.xp.toLocaleString("id-ID")}</strong></div><div><span>ANGGARAN</span><strong>💰${cityBudget}</strong></div></div>
          <label class="city-name-field"><span>Nama penjelajah <small>(opsional)</small></span><input id="city-nickname" type="text" maxlength="30" autocomplete="nickname" value="${escapeHtml(playerNickname)}" placeholder="Contoh: Bima" /></label>
          <fieldset><legend>Pilih fase belajar</legend><div class="city-phase-options">${cityPhases
            .map(
              (phase) =>
                `<button class="city-phase-option${phase === selectedPhase ? " is-selected" : ""}" type="button" data-phase="${phase}" aria-pressed="${phase === selectedPhase}"><strong>${phase}</strong><span>Fase ${phase}</span><small>${phaseDescriptions[phase]}</small></button>`,
            )
            .join("")}</div></fieldset>
          <button class="city-primary-button" id="open-map" type="button">Buka rencana kota <span aria-hidden="true">→</span></button>
          <p class="city-note">4 bangunan · sekitar 5 menit · tombol 1–3</p>
        </section>
      </div>
      <footer class="city-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved. ${renderPlatformVersion()}</footer>
    </main>
  `;
  document.querySelectorAll<HTMLButtonElement>("[data-phase]").forEach((button) =>
    button.addEventListener("click", () => {
      playerNickname =
        document.querySelector<HTMLInputElement>("#city-nickname")?.value.trim() ?? playerNickname;
      selectedPhase = button.dataset.phase as CityPhase;
      savePlayerPreferences({ nickname: playerNickname, lastPhase: selectedPhase, lastTopic: "" });
      renderSetup();
    }),
  );
  document.querySelector<HTMLButtonElement>("#open-map")?.addEventListener("click", openMap);
}

function openMap(): void {
  playerNickname =
    document.querySelector<HTMLInputElement>("#city-nickname")?.value.trim().slice(0, 30) ??
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
    <main class="city-map-screen">
      ${renderGameHud({
        brandHref: portalUrl,
        brandLabel: "Build the City",
        soundEnabled,
        stats: [
          {
            id: "city-xp",
            icon: "⭐",
            label: "XP",
            value: progress.xp.toLocaleString("id-ID"),
          },
          {
            id: "city-coins",
            icon: "💰",
            label: "Koin",
            value: progress.coins.toLocaleString("id-ID"),
          },
          { id: "city-chests", icon: "💰", label: "Anggaran", value: String(cityBudget) },
          {
            id: "city-level",
            icon: "🏆",
            label: "Level",
            value: String(levelFromXp(progress.xp)),
          },
        ],
      })}
      <section class="city-map" aria-labelledby="map-title">
        <div class="city-map-heading"><div><p class="city-eyebrow">RENCANA KOTA · FASE ${selectedPhase}</p><h1 id="map-title">Pilih pembangunan</h1><p>Jawab soal, kumpulkan anggaran, lalu pilih fasilitas yang ingin dibangun.</p></div><button class="city-map-change" id="change-phase" type="button">Ganti fase</button></div>
        <div class="island-map island-map--city" aria-label="Rencana empat bangunan kota">${locations
          .map((location, index) => {
            const unlocked = isUnlocked(location.id);
            const completed = isCompleted(location.id);
            const affordable = cityBudget >= location.cost;
            const status = completed
              ? "Selesai"
              : unlocked && affordable
                ? "Bangun"
                : unlocked
                  ? "Anggaran belum cukup"
                  : "Terkunci";
            return `<button class="map-location map-location--${location.id}${completed ? " is-completed" : ""}${unlocked ? " is-unlocked" : " is-locked"}" type="button" data-location="${location.id}" ${unlocked && (completed || affordable) ? "" : "disabled"} aria-label="${location.region}: ${status}"><span class="map-location-icon">${location.icon}</span><strong>${location.region}</strong><small>${completed ? "✓ Selesai" : unlocked ? `💰 ${location.cost} · ${affordable ? "Bangun" : "Tambah anggaran"}` : `🔒 Bangunan ${index + 1}`}</small></button>`;
          })
          .join("")}<span class="map-compass" aria-hidden="true">N<br /><b>✦</b></span></div>
        <div class="city-map-tip"><span aria-hidden="true">🏗️</span><p><strong>Anggaran:</strong> jawaban benar memberi 💰25. Bangunan tidak bisa dipilih bila saldo belum cukup.</p></div>
      </section>
      <footer class="city-footer city-footer--map">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved. ${renderPlatformVersion()}</footer>
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
  if (!isCompleted(id) && cityBudget < location.cost) {
    renderMap();
    return;
  }
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
    <main class="city-game-screen">
      ${renderGameHud({
        brandHref: portalUrl,
        brandLabel: "Build the City",
        soundEnabled,
        stats: [
          {
            id: "city-xp",
            icon: "⭐",
            label: "XP",
            value: progress.xp.toLocaleString("id-ID"),
          },
          {
            id: "city-coins",
            icon: "💰",
            label: "Koin",
            value: progress.coins.toLocaleString("id-ID"),
          },
          {
            id: "city-clues",
            icon: "🗺️",
            label: "Soal",
            value: `0/${session.getSnapshot().target}`,
          },
          { id: "city-streak", icon: "🔥", label: "Streak", value: "0" },
          {
            id: "city-level",
            icon: "🏆",
            label: "Level",
            value: String(levelFromXp(progress.xp)),
          },
        ],
      })}
      <section class="city-arena" aria-label="Pembangunan ${location.region}">
        <div class="city-scene city-scene--${location.id}" aria-hidden="true"><span class="scene-sun">☀</span><span class="scene-cloud scene-cloud-one"></span><span class="scene-cloud scene-cloud-two"></span><span class="scene-land scene-land-back"></span><span class="scene-land scene-land-front"></span><span class="scene-location-icon">${location.icon}</span><span class="scene-chest" id="scene-chest">🏗️</span><span class="scene-spark spark-one">✦</span><span class="scene-spark spark-two">✦</span></div>
        <section class="city-question-card" aria-labelledby="city-question-title">
          <div class="city-question-meta"><span id="city-region">${location.region}</span><span id="city-progress-label"></span></div>
          <h1 id="city-question-title" tabindex="-1">Hitung untuk membangun</h1>
          <p class="city-clue" id="city-clue">${location.clue}</p>
          <div class="city-source-question"><span>Soal kondektur</span><p id="city-question" aria-live="polite"></p></div>
          <div id="city-choices" class="city-choices" aria-label="Pilihan jawaban"></div>
          <div class="city-feedback" id="city-feedback" role="status" aria-live="assertive"></div>
        </section>
        <div class="city-tip"><span aria-hidden="true">💡</span><p><strong>Ingat:</strong> jawaban benar menambah anggaran pembangunan.</p></div>
      </section>
      ${renderSessionDialogs({
        gameName: "Build the City",
        helpItems: [
          {
            icon: "🚉",
            title: "Pilih bangunan",
            detail: "Setiap fasilitas membutuhkan anggaran yang terlihat di rencana kota.",
          },
          {
            icon: "🚃",
            title: "Tambah anggaran",
            detail: "Jawaban benar menambah 💰25 dan XP.",
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
    "#city-progress-label",
    `Soal ${Math.min(snapshot.progress + 1, snapshot.target)} dari ${snapshot.target}`,
  );
  setText("#city-question", question.prompt);
  setText("#city-clues", `${snapshot.progress}/${snapshot.target}`);
  updateHud();
  renderChoices();
  hideFeedback();
  document.querySelector<HTMLElement>("#city-question-title")?.focus({ preventScroll: true });
}

function renderChoices(): void {
  const choices = document.querySelector<HTMLElement>("#city-choices");
  if (!choices) return;
  choices.innerHTML = activeChoices
    .map(
      (choice, index) =>
        `<button class="city-choice" type="button" data-choice-index="${index}" aria-label="Pilihan ${index + 1}: ${escapeHtml(choice)}"><span>${index + 1}</span><strong>${escapeHtml(choice)}</strong></button>`,
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
    .querySelectorAll<HTMLButtonElement>(".city-choice")
    .forEach((button) => (button.disabled = true));
  const attempt = session.submitAnswer(answer);
  if (attempt.correct) {
    streak += 1;
    cityBudget += 25;
    progress.xp += 100;
    progress.coins += 8 + Math.min(streak - 1, 5);
    progress.bestStreak = Math.max(progress.bestStreak, streak);
    saveHunt();
    saveProgress();
    updateHud();
    document.querySelector<HTMLElement>("#scene-chest")?.classList.add("is-open");
    showFeedback(`🎉 Hitungan tepat! Anggaran +💰25 · +100 XP`, "success");
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
  if (!wasCompleted) cityBudget = Math.max(0, cityBudget - location.cost);
  const completedLocations = new Set(huntSave.completedLocations);
  completedLocations.add(location.id);
  const unlockedLocations = new Set(huntSave.unlockedLocations);
  if (location.unlocks) unlockedLocations.add(location.unlocks);
  huntSave = {
    version: 1,
    completedLocations: [...completedLocations],
    unlockedLocations: [...unlockedLocations],
    budget: cityBudget,
  };
  saveHunt();
  const report = createSessionReport(session.getResult(), currentQuestions);
  const rewardText = wasCompleted
    ? "Stasiun ini sudah tercatat sebelumnya."
    : `Bangunan selesai · biaya 💰${location.cost} · hadiah +${location.rewardXp} XP`;
  if (!wasCompleted) {
    progress.xp += location.rewardXp;
    progress.coins += location.rewardCoins;
    saveProgress();
  }
  destroyDialogs();
  const nextLabel = location.unlocks
    ? `Rencanakan ${locationById(location.unlocks).region}`
    : "Lihat kota selesai";
  app.innerHTML = `<main class="city-result"><div class="city-result-card"><p class="city-result-eyebrow">BANGUNAN SELESAI · ${location.region.toUpperCase()}</p><div class="city-result-icon">🏙️</div><h1 id="city-result-title" tabindex="-1">Kota bertumbuh${playerNickname ? `, ${escapeHtml(playerNickname)}` : ""}!</h1><p>${rewardText}</p>${renderSessionReport(report)}<section class="city-reward"><span>STATUS KOTA</span><strong>${completedCount()}/4 bangunan · 💰${cityBudget} tersisa</strong></section><div class="city-result-actions"><button class="city-primary-button" id="back-to-map" type="button">${nextLabel}</button><button class="city-secondary-button" id="retry-location" type="button">Ulangi pembangunan</button></div><p class="city-result-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved. ${renderPlatformVersion()}</p></div></main>`;
  document.querySelector<HTMLButtonElement>("#back-to-map")?.addEventListener("click", renderMap);
  document
    .querySelector<HTMLButtonElement>("#retry-location")
    ?.addEventListener("click", () => startLocation(location.id));
  document.querySelector<HTMLElement>("#city-result-title")?.focus({ preventScroll: true });
}

function updateHud(): void {
  setText("#city-xp", progress.xp.toLocaleString("id-ID"));
  setText("#city-coins", progress.coins.toLocaleString("id-ID"));
  setText("#city-chests", String(cityBudget));
  setText("#city-streak", String(streak));
  setText("#city-level", String(levelFromXp(progress.xp)));
  const snapshot = session?.getSnapshot();
  if (snapshot) setText("#city-clues", `${snapshot.progress}/${snapshot.target}`);
}

function showFeedback(message: string, kind: "success" | "error"): void {
  const feedback = document.querySelector<HTMLElement>("#city-feedback");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `city-feedback is-visible city-feedback--${kind}`;
}

function hideFeedback(): void {
  const feedback = document.querySelector<HTMLElement>("#city-feedback");
  if (feedback) {
    feedback.textContent = "";
    feedback.className = "city-feedback";
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
    window.confirm("Kembali ke rencana kota? Anggaran sesi ini tetap tersimpan setelah selesai.")
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
  if (!document.querySelector(".city-game-screen")) return;
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
    document.querySelector(".city-game-screen") &&
    session &&
    !session.getSnapshot().paused
  )
    pauseHunt();
});

renderSetup();

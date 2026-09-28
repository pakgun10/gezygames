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
import { mathQuestions, type Question } from "@gezy-games/question-bank";
import { createSessionReport, renderSessionReport } from "@gezy-games/session-report";
import "./styles.css";

type MissionId = "beach" | "forest" | "boss";

interface MissionDefinition {
  readonly id: MissionId;
  readonly region: string;
  readonly title: string;
  readonly icon: string;
  readonly topicLabel: string;
  readonly topics: readonly string[];
  readonly description: string;
  readonly interaction: string;
  readonly questionCount: number;
  readonly rewardXp: number;
  readonly rewardCoins: number;
  readonly unlocks?: MissionId;
}

interface AdventureSave {
  readonly version: 1;
  readonly completedMissions: readonly MissionId[];
  readonly unlockedMissions: readonly MissionId[];
}

interface AdventureProgress {
  xp: number;
  coins: number;
  bestStreak: number;
  sessions: number;
  lastPlayedAt?: string;
}

const portalUrl = import.meta.env.DEV ? "http://localhost:5173/" : "/";
const storageKey = "gezy-games:math-adventure:v1";
const appElement = document.querySelector<HTMLDivElement>("#app");

if (!appElement) throw new Error("Elemen aplikasi tidak ditemukan.");
const app: HTMLDivElement = appElement;

const missions: readonly MissionDefinition[] = [
  {
    id: "beach",
    region: "Pantai",
    title: "Harta di Tepian Pantai",
    icon: "🏝️",
    topicLabel: "Himpunan",
    topics: ["Himpunan"],
    description: "Kelompokkan temuan pantai dan temukan kunci peta pertama.",
    interaction: "Pilih pernyataan himpunan yang membuka peti.",
    questionCount: 2,
    rewardXp: 120,
    rewardCoins: 25,
    unlocks: "forest",
  },
  {
    id: "forest",
    region: "Hutan",
    title: "Gerbang Relasi",
    icon: "🌳",
    topicLabel: "Relasi",
    topics: ["Relasi"],
    description: "Hubungkan jejak makhluk dengan pasangan yang tepat.",
    interaction: "Pilih diagram pasangan yang benar.",
    questionCount: 2,
    rewardXp: 160,
    rewardCoins: 35,
    unlocks: "boss",
  },
  {
    id: "boss",
    region: "Kastil Karang",
    title: "Penjaga Pulau",
    icon: "🐉",
    topicLabel: "Himpunan + Relasi",
    topics: ["Himpunan", "Relasi"],
    description: "Hadapi penjaga pulau dengan menggabungkan dua keterampilan.",
    interaction: "Lewati dua fase tantangan untuk membuka peta berikutnya.",
    questionCount: 4,
    rewardXp: 260,
    rewardCoins: 60,
  },
] as const;

const missionById = (id: MissionId): MissionDefinition => {
  const mission = missions.find((candidate) => candidate.id === id);
  if (!mission) throw new Error(`Misi ${id} tidak ditemukan.`);
  return mission;
};

const readAdventureSave = (): AdventureSave => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { version: 1, completedMissions: [], unlockedMissions: ["beach"] };
    const parsed = JSON.parse(raw) as Partial<AdventureSave>;
    if (parsed.version !== 1 || !Array.isArray(parsed.unlockedMissions)) {
      return { version: 1, completedMissions: [], unlockedMissions: ["beach"] };
    }
    const validIds = new Set<MissionId>(missions.map((mission) => mission.id));
    const completedMissions = Array.isArray(parsed.completedMissions)
      ? parsed.completedMissions.filter((id): id is MissionId => validIds.has(id as MissionId))
      : [];
    const unlockedMissions = parsed.unlockedMissions.filter((id): id is MissionId =>
      validIds.has(id as MissionId),
    );
    return {
      version: 1,
      completedMissions,
      unlockedMissions: unlockedMissions.includes("beach") ? unlockedMissions : ["beach"],
    };
  } catch {
    return { version: 1, completedMissions: [], unlockedMissions: ["beach"] };
  }
};

let adventureSave = readAdventureSave();
let playerNickname = loadPlayerProgress().preferences.nickname;
let soundEnabled = loadPlayerProgress().preferences.audioEnabled;
const progress: AdventureProgress = { ...loadGameProgress("math-adventure") };
let currentMission: MissionDefinition | null = null;
let currentQuestions: readonly Question[] = [];
let session: GameSession | null = null;
let activeQuestionId = "";
let activeChoices: readonly string[] = [];
let inputLocked = false;
let missionFinished = false;
let missionStreak = 0;
let transitionTimerId: number | null = null;
let pendingTransition: (() => void) | null = null;
let pauseDialogController: DialogController | null = null;
let helpDialogController: DialogController | null = null;

const levelFromXp = (xp: number): number => Math.floor(xp / 1_000) + 1;
const completedCount = (): number => adventureSave.completedMissions.length;
const isUnlocked = (id: MissionId): boolean => adventureSave.unlockedMissions.includes(id);
const isCompleted = (id: MissionId): boolean => adventureSave.completedMissions.includes(id);

const saveAdventure = (): void => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(adventureSave));
  } catch {
    // Progres peta bersifat tambahan; sesi tetap dapat dimainkan tanpa storage.
  }
};

const saveProgress = (): void => {
  saveGameProgress("math-adventure", {
    ...progress,
    lastPlayedAt: new Date().toISOString(),
  });
};

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

const formatChoiceVisual = (choice: string, topic: string): string => {
  if (topic === "Relasi") {
    const pairs = [...choice.matchAll(/\(([^)]+)\)/g)].map((match) => match[1]);
    if (pairs.length > 0) {
      return `<span class="relation-diagram" aria-hidden="true">${pairs
        .map((pair) => {
          const [from, to] = pair.split(",").map((part) => part.trim());
          return `<span><b>${escapeHtml(from ?? "")}</b><i>→</i><b>${escapeHtml(to ?? "")}</b></span>`;
        })
        .join("")}</span>`;
    }
  }
  if (choice.includes("∈") || choice.includes("∪")) {
    return `<span class="set-diagram" aria-hidden="true">◈</span>`;
  }
  return `<span class="set-diagram" aria-hidden="true">✦</span>`;
};

function renderSetup(): void {
  clearTransition();
  destroyDialogs();
  session = null;
  currentMission = null;
  missionFinished = false;
  app.innerHTML = `
    <main class="adventure-setup">
      <header class="adventure-header">
        <a class="adventure-brand" href="${portalUrl}" aria-label="Kembali ke Gezy Games">
          <span aria-hidden="true">★</span><strong>Gezy</strong> Games
        </a>
        <a class="adventure-back" href="${portalUrl}">← Semua game</a>
      </header>
      <div class="adventure-setup-grid">
        <section class="adventure-intro" aria-labelledby="adventure-title">
          <p class="adventure-eyebrow">VERTICAL SLICE · FASE D</p>
          <h1 id="adventure-title">Math <span>Adventure</span></h1>
          <p>Jelajahi pulau, buka gerbang, dan gunakan matematika untuk menolong penjaga pulau.</p>
          <div class="island-preview" aria-hidden="true">
            <span class="preview-sun">☀</span><span class="preview-mountain">🏔️</span><span class="preview-palm">🌴</span><span class="preview-boat">⛵</span>
          </div>
          <ul class="adventure-promises">
            <li>✓ Peta Pantai dan Hutan</li>
            <li>✓ Tantangan diagram dan himpunan</li>
            <li>✓ Boss Penjaga Pulau</li>
          </ul>
        </section>
        <section class="adventure-setup-card" aria-label="Mulai petualangan">
          <div class="adventure-mini-stats">
            <div><span>LEVEL</span><strong>${levelFromXp(progress.xp)}</strong></div>
            <div><span>XP</span><strong>${progress.xp.toLocaleString("id-ID")}</strong></div>
            <div><span>MISI</span><strong>${completedCount()}/3</strong></div>
          </div>
          <label class="adventure-name-field">
            <span>Nama penjelajah <small>(opsional)</small></span>
            <input id="adventure-nickname" type="text" maxlength="30" autocomplete="nickname" value="${escapeHtml(playerNickname)}" placeholder="Contoh: Raka" />
          </label>
          <div class="adventure-preview-route" aria-label="Urutan vertical slice">
            <span>🏝️<small>Pantai</small></span><i aria-hidden="true">→</i><span>🌳<small>Hutan</small></span><i aria-hidden="true">→</i><span>🐉<small>Boss</small></span>
          </div>
          <button class="adventure-primary-button" id="enter-island-button" type="button">Masuk ke pulau <span aria-hidden="true">→</span></button>
          <p class="adventure-note">Sekitar 8–12 menit · dapat dimainkan dengan sentuh, mouse, atau keyboard</p>
        </section>
      </div>
      <footer class="adventure-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved. ${renderPlatformVersion()}</footer>
    </main>
  `;
  document.querySelector<HTMLInputElement>("#adventure-nickname")?.focus();
  document
    .querySelector<HTMLButtonElement>("#enter-island-button")
    ?.addEventListener("click", () => {
      playerNickname =
        document.querySelector<HTMLInputElement>("#adventure-nickname")?.value.trim() ?? "";
      savePlayerPreferences({ nickname: playerNickname });
      renderMap();
    });
}

function renderMap(): void {
  clearTransition();
  destroyDialogs();
  session = null;
  currentMission = null;
  missionFinished = false;
  inputLocked = false;
  const playerLabel = playerNickname ? `, ${escapeHtml(playerNickname)}` : "";
  app.innerHTML = `
    <main class="adventure-screen map-screen">
      ${renderGameHud({
        brandHref: portalUrl,
        brandLabel: "Math Adventure",
        soundEnabled,
        stats: [
          {
            id: "adventure-xp",
            icon: "⭐",
            label: "XP",
            value: progress.xp.toLocaleString("id-ID"),
          },
          {
            id: "adventure-coins",
            icon: "💰",
            label: "Koin",
            value: progress.coins.toLocaleString("id-ID"),
          },
          {
            id: "adventure-level",
            icon: "🏆",
            label: "Level",
            value: String(levelFromXp(progress.xp)),
          },
          { id: "adventure-missions", icon: "🗺️", label: "Misi", value: `${completedCount()}/3` },
        ],
      })}
      <section class="map-board" aria-labelledby="map-title">
        <div class="map-heading">
          <p class="adventure-eyebrow">PETA FASE D</p>
          <h1 id="map-title">Selamat datang di Pulau Matematika${playerLabel}!</h1>
          <p>Setiap wilayah menyimpan cara baru untuk melihat matematika. Buka jalanmu satu misi demi satu.</p>
        </div>
        <div class="island-map" aria-label="Peta misi Pantai, Hutan, dan Penjaga Pulau">
          <span class="map-cloud map-cloud-one" aria-hidden="true">☁</span><span class="map-cloud map-cloud-two" aria-hidden="true">☁</span>
          <span class="map-mountain" aria-hidden="true">🏔️</span><span class="map-tree map-tree-one" aria-hidden="true">🌲</span><span class="map-tree map-tree-two" aria-hidden="true">🌲</span>
          <div class="map-path" aria-hidden="true"></div>
          ${missions.map(renderMissionNode).join("")}
        </div>
        <div class="map-footer-row">
          <div class="map-legend"><span>✓ Selesai</span><span>✦ Terbuka</span><span>🔒 Terkunci</span></div>
          <p class="map-tip">Petunjuk: tekan tombol misi, lalu pilih jawaban dengan angka 1–3.</p>
        </div>
      </section>
      ${renderSessionDialogs({
        gameName: "Math Adventure",
        helpItems: [
          {
            icon: "🗺️",
            title: "Pilih wilayah",
            detail: "Misi yang terbuka dapat dimainkan kapan saja.",
          },
          {
            icon: "✨",
            title: "Jawaban mengubah pulau",
            detail: "Benar membuka jalan dan memberi XP serta koin.",
          },
        ],
      })}
    </main>
  `;
  setupShellListeners();
  document.querySelectorAll<HTMLButtonElement>("[data-mission]").forEach((button) => {
    button.addEventListener("click", () => {
      const missionId = button.dataset.mission as MissionId | undefined;
      if (missionId && isUnlocked(missionId)) startMission(missionId);
    });
  });
}

function renderMissionNode(mission: MissionDefinition): string {
  const locked = !isUnlocked(mission.id);
  const completed = isCompleted(mission.id);
  const stateLabel = locked ? "Terkunci" : completed ? "Selesai · Mainkan lagi" : "Terbuka";
  return `
    <article class="mission-node mission-node--${mission.id} ${locked ? "is-locked" : ""} ${completed ? "is-completed" : ""}">
      <div class="mission-node-art" aria-hidden="true"><span>${mission.icon}</span>${completed ? "✓" : locked ? "🔒" : "✦"}</div>
      <div class="mission-node-copy"><span class="mission-state">${stateLabel}</span><h2>${mission.region}</h2><p>${mission.topicLabel} · ${mission.title}</p></div>
      <button class="mission-node-button" type="button" data-mission="${mission.id}" ${locked ? "disabled" : ""}>${locked ? "Belum terbuka" : completed ? "Jelajah lagi" : "Mulai misi"}</button>
    </article>
  `;
}

function setupShellListeners(): void {
  pauseDialogController = createDialogController(
    document.querySelector<HTMLElement>("#pause-overlay") as HTMLElement,
    { onEscape: resumeGame },
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
  document.querySelector<HTMLButtonElement>("#pause-button")?.addEventListener("click", pauseGame);
  document
    .querySelector<HTMLButtonElement>("#resume-button")
    ?.addEventListener("click", resumeGame);
  document
    .querySelector<HTMLButtonElement>("#close-help-button")
    ?.addEventListener("click", closeHelp);
  document.querySelector<HTMLButtonElement>("#quit-button")?.addEventListener("click", () => {
    if (session) {
      session.finish();
      session = null;
    }
    renderMap();
  });
}

function startMission(missionId: MissionId): void {
  const mission = missionById(missionId);
  currentMission = mission;
  const availableQuestions = mission.topics.flatMap((topic) =>
    selectQuestions(mathQuestions, { phase: "D", topic }),
  );
  currentQuestions = availableQuestions;
  session = createGameSession(availableQuestions, {
    questionCount: mission.questionCount,
    remedialGap: 1,
    pointsPerCorrectAnswer: 100,
    immediateRetries: 1,
  });
  activeQuestionId = "";
  activeChoices = [];
  inputLocked = false;
  missionFinished = false;
  missionStreak = 0;
  destroyDialogs();
  app.innerHTML = `
    <main class="adventure-screen mission-screen">
      ${renderGameHud({
        brandHref: portalUrl,
        brandLabel: "Math Adventure",
        soundEnabled,
        stats: [
          {
            id: "adventure-xp",
            icon: "⭐",
            label: "XP",
            value: progress.xp.toLocaleString("id-ID"),
          },
          {
            id: "adventure-coins",
            icon: "💰",
            label: "Koin",
            value: progress.coins.toLocaleString("id-ID"),
          },
          { id: "adventure-streak", icon: "🔥", label: "Streak", value: "0" },
          {
            id: "adventure-level",
            icon: "🏆",
            label: "Level",
            value: String(levelFromXp(progress.xp)),
          },
        ],
      })}
      <section class="mission-challenge" aria-labelledby="mission-title">
        <div class="mission-breadcrumb"><button id="back-to-map" type="button">← Peta pulau</button><span>${mission.icon} ${mission.region}</span></div>
        <div class="mission-title-row"><div><p class="adventure-eyebrow">MISI · ${mission.topicLabel.toUpperCase()}</p><h1 id="mission-title">${mission.title}</h1><p>${mission.description}</p></div><div class="mission-reward"><span>HADIAH</span><strong>+${mission.rewardXp} XP</strong><small>+${mission.rewardCoins} koin</small></div></div>
        <div class="mission-question-card">
          <div class="mission-question-meta"><span id="mission-topic"></span><span id="mission-progress"></span></div>
          <p class="interaction-label">${mission.interaction}</p>
          <h2 id="mission-prompt" tabindex="-1" aria-live="polite" aria-atomic="true"></h2>
        </div>
        <div class="adventure-choices" id="adventure-choices" aria-label="Pilihan jawaban"></div>
        <div class="mission-progress-bar"><span>Perjalanan misi</span><div><i id="mission-progress-fill"></i></div><strong id="mission-progress-text">0/${mission.questionCount}</strong></div>
        <div class="adventure-feedback" id="adventure-feedback" role="status" aria-live="assertive"></div>
      </section>
      ${renderSessionDialogs({
        gameName: "Math Adventure",
        helpItems: [
          {
            icon: "👆",
            title: "Pilih jawaban",
            detail: "Sentuh kartu atau tekan tombol 1, 2, atau 3.",
          },
          {
            icon: "🌱",
            title: "Coba lagi",
            detail: "Jawaban belum tepat menjadi petunjuk untuk percobaan berikutnya.",
          },
        ],
      })}
    </main>
  `;
  setupShellListeners();
  document.querySelector<HTMLButtonElement>("#back-to-map")?.addEventListener("click", () => {
    if (inputLocked) return;
    session?.finish();
    session = null;
    renderMap();
  });
  renderMissionQuestion();
}

function renderMissionQuestion(): void {
  if (!session || !currentMission) return;
  const snapshot = session.getSnapshot();
  if (snapshot.completed || !snapshot.currentQuestion) {
    finishMission();
    return;
  }
  const question = snapshot.currentQuestion;
  if (activeQuestionId !== question.id) {
    activeQuestionId = question.id;
    activeChoices = shuffleQuestionChoices(question);
  }
  setText("#mission-topic", `${question.topic} · Fase D`);
  setText(
    "#mission-progress",
    `Tantangan ${Math.min(snapshot.progress + 1, snapshot.target)} dari ${snapshot.target}`,
  );
  setText("#mission-prompt", question.prompt);
  setText("#mission-progress-text", `${snapshot.progress}/${snapshot.target}`);
  const fill = document.querySelector<HTMLElement>("#mission-progress-fill");
  if (fill) fill.style.width = `${(snapshot.progress / snapshot.target) * 100}%`;
  document.querySelector<HTMLElement>("#mission-prompt")?.focus({ preventScroll: true });
  const choices = document.querySelector<HTMLElement>("#adventure-choices");
  if (!choices) return;
  choices.innerHTML = activeChoices
    .map(
      (choice, index) => `
        <button class="adventure-choice" type="button" data-answer="${escapeHtml(choice)}" aria-label="Pilihan ${index + 1}: ${escapeHtml(choice)}">
          <span class="choice-index">${index + 1}</span>
          ${formatChoiceVisual(choice, question.topic)}
          <strong>${escapeHtml(choice)}</strong>
        </button>
      `,
    )
    .join("");
  choices.querySelectorAll<HTMLButtonElement>(".adventure-choice").forEach((button) => {
    button.addEventListener("click", () => answerMission(button));
  });
  hideFeedback();
}

function answerMission(button: HTMLButtonElement): void {
  if (!session || !currentMission || inputLocked || button.disabled) return;
  const question = session.getSnapshot().currentQuestion;
  if (!question) return;
  inputLocked = true;
  document.querySelectorAll<HTMLButtonElement>(".adventure-choice").forEach((choice) => {
    choice.disabled = true;
  });
  const attempt = session.submitAnswer(button.dataset.answer ?? "");
  playTone(
    attempt.correct ? 650 : 170,
    attempt.correct ? 0.12 : 0.16,
    attempt.correct ? "sine" : "sawtooth",
  );
  button.classList.add(attempt.correct ? "is-correct" : "is-wrong");
  if (attempt.correct) {
    missionStreak += 1;
    progress.xp += 40;
    progress.coins += 5;
    progress.bestStreak = Math.max(progress.bestStreak, missionStreak);
    saveProgress();
    updateAdventureHud();
    showFeedback(`✨ Jalur terbuka! +40 XP · Streak ${missionStreak}`, "success");
    scheduleTransition(() => {
      if (session?.getSnapshot().completed) finishMission();
      else {
        activeQuestionId = "";
        inputLocked = false;
        renderMissionQuestion();
      }
    }, 900);
    return;
  }

  missionStreak = 0;
  updateAdventureHud();
  const sameQuestion = session.getSnapshot().currentQuestion?.id === question.id;
  showFeedback(
    sameQuestion
      ? "Belum tepat. Periksa hubungan antarobjek, lalu coba lagi."
      : `Petunjuk: ${question.explanation}`,
    "error",
  );
  scheduleTransition(
    () => {
      if (sameQuestion) {
        inputLocked = false;
        document
          .querySelectorAll<HTMLButtonElement>(".adventure-choice:not(.is-wrong)")
          .forEach((choice) => {
            choice.disabled = false;
          });
      } else {
        activeQuestionId = "";
        inputLocked = false;
        renderMissionQuestion();
      }
    },
    sameQuestion ? 850 : 1_250,
  );
}

function finishMission(): void {
  if (!session || !currentMission || missionFinished) return;
  missionFinished = true;
  clearTransition();
  session.finish();
  const mission = currentMission;
  const result = session.getResult();
  const report = createSessionReport(result, currentQuestions);
  const firstCompletion = !isCompleted(mission.id);
  if (firstCompletion) {
    progress.xp += mission.rewardXp;
    progress.coins += mission.rewardCoins;
    if (!adventureSave.completedMissions.includes(mission.id)) {
      adventureSave = {
        ...adventureSave,
        completedMissions: [...adventureSave.completedMissions, mission.id],
        unlockedMissions:
          mission.unlocks && !adventureSave.unlockedMissions.includes(mission.unlocks)
            ? [...adventureSave.unlockedMissions, mission.unlocks]
            : adventureSave.unlockedMissions,
      };
    }
  }
  progress.sessions += 1;
  saveProgress();
  saveAdventure();
  const playerGreeting = playerNickname ? `, ${escapeHtml(playerNickname)}` : "";
  destroyDialogs();
  app.innerHTML = `
    <main class="adventure-result" aria-labelledby="adventure-result-title">
      <div class="adventure-result-card">
        <p class="adventure-eyebrow">${mission.id === "boss" ? "PULAU AMAN" : "MISI SELESAI"}</p>
        <div class="adventure-result-icon" aria-hidden="true">${mission.id === "boss" ? "🏆" : "🗝️"}</div>
        <h1 id="adventure-result-title" tabindex="-1">${mission.id === "boss" ? `Penjaga mundur${playerGreeting}!` : `${mission.region} terbuka${playerGreeting}!`}</h1>
        <p>${firstCompletion ? `Kamu memperoleh +${mission.rewardXp} XP dan +${mission.rewardCoins} koin.` : "Misi ini sudah pernah diselesaikan. Coba tantangan lain untuk membuka pulau."}</p>
        ${renderSessionReport(report)}
        <div class="adventure-result-actions">
          <button class="adventure-primary-button" id="back-map-button" type="button">Kembali ke peta</button>
          <button class="adventure-secondary-button" id="retry-mission-button" type="button">Ulangi misi</button>
          <a class="adventure-secondary-button" href="${portalUrl}">Semua game</a>
        </div>
        <p class="adventure-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved. ${renderPlatformVersion()}</p>
      </div>
    </main>
  `;
  document.querySelector<HTMLElement>("#adventure-result-title")?.focus({ preventScroll: true });
  document
    .querySelector<HTMLButtonElement>("#back-map-button")
    ?.addEventListener("click", renderMap);
  document
    .querySelector<HTMLButtonElement>("#retry-mission-button")
    ?.addEventListener("click", () => startMission(mission.id));
}

function updateAdventureHud(): void {
  setText("#adventure-xp", progress.xp.toLocaleString("id-ID"));
  setText("#adventure-coins", progress.coins.toLocaleString("id-ID"));
  setText("#adventure-level", String(levelFromXp(progress.xp)));
  setText("#adventure-streak", String(missionStreak));
  setText("#adventure-missions", `${completedCount()}/3`);
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
    // Cue audio bersifat tambahan.
  }
}

async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
}

function pauseGame(): void {
  if (!session || missionFinished) {
    pauseDialogController?.open(document.querySelector<HTMLButtonElement>("#pause-button"));
    return;
  }
  if (inputLocked || session.getSnapshot().paused) return;
  session.pause();
  pauseDialogController?.open(document.querySelector<HTMLButtonElement>("#pause-button"));
}

function resumeGame(): void {
  pauseDialogController?.close();
  if (!session) return;
  session.resume();
  const deferredTransition = pendingTransition;
  pendingTransition = null;
  if (deferredTransition) deferredTransition();
}

function openHelp(): void {
  helpDialogController?.open(document.querySelector<HTMLButtonElement>("#help-button"));
}

function closeHelp(): void {
  helpDialogController?.close();
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
}

function showFeedback(message: string, kind: "success" | "error"): void {
  const feedback = document.querySelector<HTMLElement>("#adventure-feedback");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `adventure-feedback is-visible adventure-feedback--${kind}`;
}

function hideFeedback(): void {
  const feedback = document.querySelector<HTMLElement>("#adventure-feedback");
  if (!feedback) return;
  feedback.className = "adventure-feedback";
  feedback.textContent = "";
}

document.addEventListener("keydown", (event) => {
  if (!document.querySelector(".mission-screen")) return;
  if (event.key.toLowerCase() === "p") {
    if (helpDialogController?.isOpen()) return;
    if (pauseDialogController?.isOpen()) resumeGame();
    else pauseGame();
    return;
  }
  if (event.key === "Escape") {
    if (!pauseDialogController?.isOpen() && !helpDialogController?.isOpen()) pauseGame();
    return;
  }
  const targetIndex = Number(event.key) - 1;
  if (targetIndex >= 0 && targetIndex <= 2 && !inputLocked && !session?.getSnapshot().paused) {
    document.querySelectorAll<HTMLButtonElement>(".adventure-choice")[targetIndex]?.click();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && session && !session.getSnapshot().paused && !inputLocked) pauseGame();
});

renderSetup();

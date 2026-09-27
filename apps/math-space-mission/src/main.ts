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

interface MissionProgress {
  xp: number;
  coins: number;
  bestStreak: number;
  sessions: number;
  lastPlayedAt?: string;
}

interface Planet {
  readonly name: string;
  readonly icon: string;
  readonly detail: string;
}

const planets: readonly Planet[] = [
  { name: "Bumi", icon: "🌍", detail: "Titik peluncuran" },
  { name: "Planet Merah", icon: "🪐", detail: "Lembah angka" },
  { name: "Planet Biru", icon: "🌎", detail: "Tujuan pengetahuan" },
];
const portalUrl = import.meta.env.DEV ? "http://localhost:5173/" : "/";
const appElement = document.querySelector<HTMLDivElement>("#app");
if (!appElement) throw new Error("Elemen aplikasi tidak ditemukan.");
const app = appElement;

const phaseDescriptions: Record<Phase, string> = {
  Fondasi: "PAUD / TK",
  A: "Kelas 1–2",
  B: "Kelas 3–4",
  C: "Kelas 5–6",
  D: "Kelas 7–9",
};
const topicsForPhase = (phase: Phase): readonly string[] => [
  ...new Set(
    mathQuestions
      .filter((question) => question.phase === phase && question.status === "published")
      .map((question) => question.topic),
  ),
];

let selectedPhase: Phase = "A";
let selectedTopic: string | null = null;
let playerNickname = loadPlayerProgress().preferences.nickname;
let soundEnabled = loadPlayerProgress().preferences.audioEnabled;
const progress: MissionProgress = { ...loadGameProgress("math-space-mission") };
let session: GameSession | null = null;
let currentQuestions: readonly Question[] = [];
let activeQuestionId = "";
let activeChoices: readonly string[] = [];
let inputLocked = false;
let fuel = 20;
let streak = 0;
let sessionFinished = false;
let transitionTimerId: number | null = null;
let pendingTransition: (() => void) | null = null;
let pauseDialogController: DialogController | null = null;
let helpDialogController: DialogController | null = null;
let resumeAfterHelp = false;

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
  saveGameProgress("math-space-mission", { ...progress, lastPlayedAt: new Date().toISOString() });
};

function renderSetup(): void {
  clearTransition();
  destroyDialogs();
  session = null;
  const availableTopics = topicsForPhase(selectedPhase);
  if (selectedTopic && !availableTopics.includes(selectedTopic)) selectedTopic = null;
  const count = selectQuestions(mathQuestions, {
    phase: selectedPhase,
    ...(selectedTopic ? { topic: selectedTopic } : {}),
  }).length;
  app.innerHTML = `
    <main class="mission-setup">
      <header class="mission-header"><a class="mission-brand" href="${portalUrl}" aria-label="Kembali ke Gezy Games"><span aria-hidden="true">★</span><strong>Gezy</strong> Games</a><a class="mission-back" href="${portalUrl}">← Semua game</a></header>
      <div class="mission-setup-grid">
        <section class="mission-intro" aria-labelledby="mission-title"><p class="mission-eyebrow">PETUALANGAN · MATEMATIKA</p><h1 id="mission-title"><span>Math Space</span> Mission</h1><p>Jawab tantangan, isi bahan bakar, dan terbang menuju planet pengetahuan berikutnya.</p><div class="mission-preview" aria-hidden="true"><span class="preview-star star-one">✦</span><span class="preview-star star-two">✧</span><span class="preview-orbit"></span><span class="preview-rocket">🚀</span><span class="preview-planet">🪐</span><span class="preview-spark">✦</span></div><ul class="mission-features"><li>✓ Tiga planet untuk dijelajahi</li><li>✓ Jawaban benar mengisi energi</li><li>✓ Fondasi sampai SMP</li></ul></section>
        <section class="mission-setup-card" aria-label="Pengaturan misi"><div class="mission-stats"><div><span>LEVEL</span><strong>${levelFromXp(progress.xp)}</strong></div><div><span>XP</span><strong>${progress.xp.toLocaleString("id-ID")}</strong></div><div><span>KOIN</span><strong>${progress.coins.toLocaleString("id-ID")}</strong></div></div><label class="mission-name-field"><span>Nama kapten <small>(opsional)</small></span><input id="mission-nickname" type="text" maxlength="30" autocomplete="nickname" value="${escapeHtml(playerNickname)}" placeholder="Contoh: Naya" /></label><fieldset><legend>Pilih fase belajar</legend><div class="mission-phase-options">${phases.map((phase) => `<button class="mission-phase-option${phase === selectedPhase ? " is-selected" : ""}" type="button" data-phase="${phase}" aria-pressed="${phase === selectedPhase}"><strong>${phase === "Fondasi" ? "F" : phase}</strong><span>${phase}</span><small>${phaseDescriptions[phase]}</small></button>`).join("")}</div></fieldset><label class="mission-topic-field"><span>Pilih materi</span><select id="mission-topic"><option value="">Semua materi (${availableTopics.length} topik)</option>${availableTopics.map((topic) => `<option value="${escapeHtml(topic)}"${topic === selectedTopic ? " selected" : ""}>${escapeHtml(topic)}</option>`).join("")}</select></label><button class="mission-primary-button" id="start-mission" type="button">Luncurkan misi <span aria-hidden="true">→</span></button><p class="mission-note">${Math.min(5, count)} navigasi · sekitar 3 menit · tombol 1–4</p></section>
      </div>
      <footer class="mission-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved.</footer>
    </main>`;
  document.querySelectorAll<HTMLButtonElement>("[data-phase]").forEach((button) =>
    button.addEventListener("click", () => {
      playerNickname =
        document.querySelector<HTMLInputElement>("#mission-nickname")?.value.trim() ??
        playerNickname;
      selectedPhase = button.dataset.phase as Phase;
      selectedTopic = null;
      savePlayerPreferences({ nickname: playerNickname, lastPhase: selectedPhase, lastTopic: "" });
      renderSetup();
    }),
  );
  document
    .querySelector<HTMLSelectElement>("#mission-topic")
    ?.addEventListener("change", (event) => {
      selectedTopic = (event.currentTarget as HTMLSelectElement).value || null;
      renderSetup();
    });
  document
    .querySelector<HTMLButtonElement>("#start-mission")
    ?.addEventListener("click", startMission);
}

function startMission(): void {
  clearTransition();
  destroyDialogs();
  playerNickname =
    document.querySelector<HTMLInputElement>("#mission-nickname")?.value.trim().slice(0, 30) ??
    playerNickname;
  selectedTopic = document.querySelector<HTMLSelectElement>("#mission-topic")?.value || null;
  currentQuestions = selectQuestions(mathQuestions, {
    phase: selectedPhase,
    ...(selectedTopic ? { topic: selectedTopic } : {}),
  });
  if (currentQuestions.length === 0) throw new Error(`Belum ada soal untuk Fase ${selectedPhase}.`);
  savePlayerPreferences({
    nickname: playerNickname,
    lastPhase: selectedPhase,
    lastTopic: selectedTopic ?? "",
  });
  session = createGameSession(currentQuestions, {
    questionCount: Math.min(5, currentQuestions.length),
    remedialGap: 2,
    pointsPerCorrectAnswer: 100,
    immediateRetries: 1,
  });
  activeQuestionId = "";
  inputLocked = false;
  fuel = 20;
  streak = 0;
  sessionFinished = false;
  app.innerHTML = `
    <main class="mission-screen">${renderGameHud({
      brandHref: portalUrl,
      brandLabel: "Space Mission",
      soundEnabled,
      stats: [
        { id: "mission-xp", icon: "⭐", label: "XP", value: progress.xp.toLocaleString("id-ID") },
        {
          id: "mission-coins",
          icon: "💰",
          label: "Koin",
          value: progress.coins.toLocaleString("id-ID"),
        },
        { id: "mission-fuel", icon: "⚡", label: "Energi", value: "20%" },
        {
          id: "mission-level",
          icon: "🏆",
          label: "Level",
          value: String(levelFromXp(progress.xp)),
        },
      ],
    })}<section class="mission-arena" aria-label="Jalur misi antariksa"><div class="space-background"><span class="space-star s-one">✦</span><span class="space-star s-two">✧</span><span class="space-star s-three">·</span><span class="space-star s-four">✦</span><span class="space-nebula"></span></div><div class="planet-route" id="planet-route" aria-label="Progres planet">${planets.map((planet, index) => `<div class="planet-stop${index === 0 ? " is-active" : ""}" data-planet="${index}"><span>${planet.icon}</span><strong>${planet.name}</strong><small>${planet.detail}</small></div>`).join("")}<i class="route-line"><b id="route-progress"></b></i></div><div class="rocket-flight" id="rocket-flight"><span id="mission-rocket" aria-hidden="true">🚀</span><i id="rocket-trail"></i></div><section class="mission-question-card"><div class="mission-question-meta"><span id="mission-topic-label"></span><span id="mission-progress-label"></span></div><h1 id="mission-question" tabindex="-1" aria-live="polite" aria-atomic="true"></h1><button id="mission-listen" class="mission-listen" type="button">🔊 Dengarkan soal</button></section><div class="mission-choices" id="mission-choices" aria-label="Pilihan navigasi"></div><div class="fuel-panel"><div class="fuel-label"><span>BAHAN BAKAR</span><strong id="fuel-value">20%</strong></div><div class="fuel-track"><i id="fuel-fill"></i></div><p id="fuel-note">Jawaban benar mengisi energi roket.</p></div><div class="mission-feedback" id="mission-feedback" role="status" aria-live="assertive"></div></section>${renderSessionDialogs(
      {
        gameName: "Math Space Mission",
        helpItems: [
          {
            icon: "🚀",
            title: "Terbang lebih jauh",
            detail: "Jawaban benar mengisi bahan bakar dan membuka planet.",
          },
          {
            icon: "🛰️",
            title: "Coba kembali",
            detail: "Jawaban salah memberi pembahasan lalu soal dapat dicoba lagi.",
          },
        ],
      },
    )}</main>`;
  const pauseOverlay = document.querySelector<HTMLElement>("#pause-overlay");
  const helpOverlay = document.querySelector<HTMLElement>("#help-overlay");
  if (!pauseOverlay || !helpOverlay) throw new Error("Dialog shell permainan tidak ditemukan.");
  pauseDialogController = createDialogController(pauseOverlay, { onEscape: resumeMission });
  helpDialogController = createDialogController(helpOverlay, { onEscape: closeHelp });
  document
    .querySelector<HTMLButtonElement>("#sound-button")
    ?.addEventListener("click", toggleSound);
  document.querySelector<HTMLButtonElement>("#help-button")?.addEventListener("click", openHelp);
  document
    .querySelector<HTMLButtonElement>("#fullscreen-button")
    ?.addEventListener("click", toggleFullscreen);
  document
    .querySelector<HTMLButtonElement>("#pause-button")
    ?.addEventListener("click", pauseMission);
  document
    .querySelector<HTMLButtonElement>("#resume-button")
    ?.addEventListener("click", resumeMission);
  document.querySelector<HTMLButtonElement>("#quit-button")?.addEventListener("click", quitMission);
  document
    .querySelector<HTMLButtonElement>("#close-help-button")
    ?.addEventListener("click", closeHelp);
  document
    .querySelector<HTMLButtonElement>("#mission-listen")
    ?.addEventListener("click", readCurrentQuestion);
  renderQuestion();
}

function renderQuestion(): void {
  if (!session) return;
  const snapshot = session.getSnapshot();
  if (snapshot.completed || !snapshot.currentQuestion) {
    finishMission(true);
    return;
  }
  const question = snapshot.currentQuestion;
  if (activeQuestionId !== question.id) {
    activeQuestionId = question.id;
    activeChoices = shuffleQuestionChoices(question);
  }
  inputLocked = false;
  const planetIndex = Math.min(
    planets.length - 1,
    Math.floor(snapshot.progress / Math.max(1, Math.ceil(snapshot.target / planets.length))),
  );
  setText(
    "#mission-topic-label",
    `${selectedPhase === "Fondasi" ? "FASE FONDASI" : `FASE ${selectedPhase}`} · ${question.topic}`,
  );
  setText(
    "#mission-progress-label",
    `Navigasi ${Math.min(snapshot.progress + 1, snapshot.target)} dari ${snapshot.target}`,
  );
  setText("#mission-question", question.prompt);
  const routeProgress = document.querySelector<HTMLElement>("#route-progress");
  if (routeProgress) routeProgress.style.width = `${(snapshot.progress / snapshot.target) * 100}%`;
  document.querySelectorAll<HTMLElement>(".planet-stop").forEach((stop, index) => {
    stop.classList.toggle("is-active", index === planetIndex);
    stop.classList.toggle("is-complete", index < planetIndex);
  });
  const rocket = document.querySelector<HTMLElement>("#rocket-flight");
  if (rocket) rocket.style.left = `${8 + (snapshot.progress / snapshot.target) * 77}%`;
  setText("#fuel-value", `${fuel}%`);
  const fuelFill = document.querySelector<HTMLElement>("#fuel-fill");
  if (fuelFill) fuelFill.style.width = `${fuel}%`;
  const choices = document.querySelector<HTMLElement>("#mission-choices");
  if (choices) {
    choices.innerHTML = activeChoices
      .map(
        (choice, index) =>
          `<button class="mission-answer" type="button" data-answer="${escapeHtml(choice)}" aria-label="Pilihan ${index + 1}: ${escapeHtml(choice)}"><span>${index + 1}</span><strong>${escapeHtml(choice)}</strong><i aria-hidden="true">✦</i></button>`,
      )
      .join("");
    choices
      .querySelectorAll<HTMLButtonElement>(".mission-answer")
      .forEach((button) => button.addEventListener("click", () => answerQuestion(button)));
  }
  document.querySelector<HTMLElement>("#mission-question")?.focus({ preventScroll: true });
  hideFeedback();
}

async function answerQuestion(button: HTMLButtonElement): Promise<void> {
  if (!session || inputLocked || button.disabled) return;
  const question = session.getSnapshot().currentQuestion;
  if (!question) return;
  inputLocked = true;
  document
    .querySelectorAll<HTMLButtonElement>(".mission-answer")
    .forEach((answer) => (answer.disabled = true));
  const attempt = session.submitAnswer(button.dataset.answer ?? "");
  if (attempt.correct) {
    button.classList.add("is-correct");
    document.querySelector("#mission-rocket")?.classList.add("is-boosting");
    fuel = Math.min(100, fuel + 20);
    streak += 1;
    progress.xp += 100;
    progress.coins += 10 + Math.min(streak - 1, 5);
    progress.bestStreak = Math.max(progress.bestStreak, streak);
    updateHud();
    showFeedback(`🚀 Berhasil! Roket melaju menuju planet berikutnya. +100 XP`, "success");
    playTone(660, 0.14, "sine");
    scheduleTransition(() => {
      activeQuestionId = "";
      renderQuestion();
    }, 950);
    return;
  }
  button.classList.add("is-wrong");
  document.querySelector("#mission-rocket")?.classList.add("is-shaking");
  fuel = Math.max(8, fuel - 8);
  streak = 0;
  updateHud();
  playTone(150, 0.16, "sawtooth");
  const sameQuestion = session.getSnapshot().currentQuestion?.id === question.id;
  if (sameQuestion) {
    showFeedback(`☄️ Asteroid menghalangi! Coba lagi. ${question.explanation}`, "error");
    scheduleTransition(() => {
      inputLocked = false;
      document.querySelector("#mission-rocket")?.classList.remove("is-shaking");
      document
        .querySelectorAll<HTMLButtonElement>(".mission-answer:not(.is-wrong)")
        .forEach((answer) => (answer.disabled = false));
    }, 1_150);
  } else {
    showFeedback("☄️ Energi berkurang. Kita ulangi konsep ini di orbit berikutnya.", "error");
    scheduleTransition(() => {
      activeQuestionId = "";
      renderQuestion();
    }, 1_450);
  }
}

function updateHud(): void {
  setText("#mission-xp", progress.xp.toLocaleString("id-ID"));
  setText("#mission-coins", progress.coins.toLocaleString("id-ID"));
  setText("#mission-fuel", `${fuel}%`);
  setText("#mission-level", String(levelFromXp(progress.xp)));
  setText("#fuel-value", `${fuel}%`);
  const fill = document.querySelector<HTMLElement>("#fuel-fill");
  if (fill) fill.style.width = `${fuel}%`;
}
function finishMission(victory: boolean): void {
  if (!session || sessionFinished) return;
  sessionFinished = true;
  clearTransition();
  session.finish();
  progress.sessions += 1;
  saveProgress();
  const report = createSessionReport(session.getResult(), currentQuestions);
  const greeting = playerNickname ? `, ${escapeHtml(playerNickname)}` : "";
  destroyDialogs();
  app.innerHTML = `<main class="mission-result" aria-labelledby="mission-result-title"><div class="mission-result-card"><p class="mission-result-eyebrow">${victory ? "MISI SELESAI" : "LATIHAN SELESAI"}</p><div class="mission-result-icon">${victory ? "🌌" : "🛰️"}</div><h1 id="mission-result-title" tabindex="-1">${victory ? `Planet baru menunggumu${greeting}!` : `Kapten hebat terus berlatih${greeting}!`}</h1><p>${victory ? "Semua navigasi berhasil diselesaikan dan rute antariksa terbuka." : "Coba lagi untuk menguasai konsep yang masih menantang."}</p>${renderSessionReport(report)}<section class="mission-rewards"><h2>Progres misi</h2><div><p><span>TOTAL XP</span><strong>${progress.xp.toLocaleString("id-ID")}</strong></p><p><span>TOTAL KOIN</span><strong>${progress.coins.toLocaleString("id-ID")}</strong></p><p><span>STREAK TERBAIK</span><strong>${progress.bestStreak}</strong></p></div></section><div class="mission-result-actions"><button class="mission-primary-button" id="retry-mission" type="button">Terbang lagi</button><button class="mission-secondary-button" id="change-mission" type="button">Ganti fase</button><a href="${portalUrl}">Kembali ke semua game</a></div><p class="mission-result-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved.</p></div></main>`;
  document
    .querySelector<HTMLButtonElement>("#retry-mission")
    ?.addEventListener("click", startMission);
  document
    .querySelector<HTMLButtonElement>("#change-mission")
    ?.addEventListener("click", renderSetup);
  document.querySelector<HTMLElement>("#mission-result-title")?.focus({ preventScroll: true });
}
function showFeedback(message: string, kind: "success" | "error"): void {
  const feedback = document.querySelector<HTMLElement>("#mission-feedback");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `mission-feedback is-visible mission-feedback--${kind}`;
}
function hideFeedback(): void {
  const feedback = document.querySelector<HTMLElement>("#mission-feedback");
  if (feedback) {
    feedback.textContent = "";
    feedback.className = "mission-feedback";
  }
}
function pauseMission(): void {
  if (!session || session.getSnapshot().completed || inputLocked) return;
  session.pause();
  pauseDialogController?.open(document.querySelector<HTMLButtonElement>("#pause-button"));
}
function resumeMission(): void {
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
function quitMission(): void {
  if (!session || window.confirm("Kembali ke persiapan? Progres sesi ini tidak akan disimpan.")) {
    clearTransition();
    session?.finish();
    renderSetup();
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
function readCurrentQuestion(): void {
  const prompt = session?.getSnapshot().currentQuestion?.prompt;
  if (!prompt) return;
  if (!soundEnabled) {
    showFeedback("Nyalakan suara di pojok atas untuk mendengarkan soal.", "error");
    return;
  }
  try {
    const utterance = new SpeechSynthesisUtterance(
      prompt.replaceAll("×", " kali ").replaceAll("÷", " dibagi ").replaceAll("=", " sama dengan "),
    );
    utterance.lang = "id-ID";
    utterance.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch {
    showFeedback("Perangkat ini belum dapat membacakan soal.", "error");
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
  if (!document.querySelector(".mission-screen")) return;
  if (event.key.toLowerCase() === "p") {
    if (pauseDialogController?.isOpen()) resumeMission();
    else pauseMission();
    return;
  }
  if (
    event.key === "Escape" &&
    !pauseDialogController?.isOpen() &&
    !helpDialogController?.isOpen()
  ) {
    pauseMission();
    return;
  }
  const index = Number(event.key) - 1;
  if (
    index >= 0 &&
    index < 4 &&
    !inputLocked &&
    !session?.getSnapshot().paused &&
    !helpDialogController?.isOpen()
  )
    document.querySelectorAll<HTMLButtonElement>(".mission-answer")[index]?.click();
});
document.addEventListener("visibilitychange", () => {
  if (
    document.hidden &&
    document.querySelector(".mission-screen") &&
    session &&
    !session.getSnapshot().paused
  )
    pauseMission();
});
renderSetup();

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

interface RunnerProgress {
  xp: number;
  coins: number;
  bestStreak: number;
  sessions: number;
  lastPlayedAt?: string;
}
const portalUrl = import.meta.env.DEV ? "http://localhost:5173/" : "/";
const appElement = document.querySelector<HTMLDivElement>("#app");
if (!appElement) throw new Error("Elemen aplikasi tidak ditemukan.");
const app = appElement;
const laneNames = ["Jalur A", "Jalur B", "Jalur C", "Jalur D"] as const;
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
const progress: RunnerProgress = { ...loadGameProgress("quiz-runner") };
let session: GameSession | null = null;
let currentQuestions: readonly Question[] = [];
let activeQuestionId = "";
let activeChoices: readonly string[] = [];
let inputLocked = false;
let distance = 0;
let lives = 3;
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
  saveGameProgress("quiz-runner", { ...progress, lastPlayedAt: new Date().toISOString() });
};

function renderSetup(): void {
  clearTransition();
  destroyDialogs();
  session = null;
  const topics = topicsForPhase(selectedPhase);
  if (selectedTopic && !topics.includes(selectedTopic)) selectedTopic = null;
  const count = selectQuestions(mathQuestions, {
    phase: selectedPhase,
    ...(selectedTopic ? { topic: selectedTopic } : {}),
  }).length;
  app.innerHTML = `<main class="runner-setup"><header class="runner-header"><a class="runner-brand" href="${portalUrl}" aria-label="Kembali ke Gezy Games"><span aria-hidden="true">★</span><strong>Gezy</strong> Games</a><a class="runner-back" href="${portalUrl}">← Semua game</a></header><div class="runner-setup-grid"><section class="runner-intro" aria-labelledby="runner-title"><p class="runner-eyebrow">AKSI · MATEMATIKA</p><h1 id="runner-title"><span>Quiz</span> Runner</h1><p>Berlari melewati rintangan, pilih jalur jawaban yang tepat, dan capai garis akhir.</p><div class="runner-preview" aria-hidden="true"><span class="preview-sun">☀</span><span class="preview-cloud cloud-a"></span><span class="preview-cloud cloud-b"></span><span class="preview-runner">🏃</span><span class="preview-flag">⚑</span><span class="preview-tree tree-a">♠</span><span class="preview-tree tree-b">♠</span></div><ul class="runner-features"><li>✓ Empat jalur jawaban</li><li>✓ Mode ramah belajar</li><li>✓ Fondasi sampai SMP</li></ul></section><section class="runner-setup-card" aria-label="Pengaturan permainan"><div class="runner-stats"><div><span>LEVEL</span><strong>${levelFromXp(progress.xp)}</strong></div><div><span>XP</span><strong>${progress.xp.toLocaleString("id-ID")}</strong></div><div><span>KOIN</span><strong>${progress.coins.toLocaleString("id-ID")}</strong></div></div><label class="runner-name-field"><span>Nama pelari <small>(opsional)</small></span><input id="runner-nickname" type="text" maxlength="30" autocomplete="nickname" value="${escapeHtml(playerNickname)}" placeholder="Contoh: Bima" /></label><fieldset><legend>Pilih fase belajar</legend><div class="runner-phase-options">${phases.map((phase) => `<button class="runner-phase-option${phase === selectedPhase ? " is-selected" : ""}" type="button" data-phase="${phase}" aria-pressed="${phase === selectedPhase}"><strong>${phase === "Fondasi" ? "F" : phase}</strong><span>${phase}</span><small>${phaseDescriptions[phase]}</small></button>`).join("")}</div></fieldset><label class="runner-topic-field"><span>Pilih materi</span><select id="runner-topic"><option value="">Semua materi (${topics.length} topik)</option>${topics.map((topic) => `<option value="${escapeHtml(topic)}"${topic === selectedTopic ? " selected" : ""}>${escapeHtml(topic)}</option>`).join("")}</select></label><button class="runner-primary-button" id="start-runner" type="button">Mulai berlari <span aria-hidden="true">→</span></button><p class="runner-note">${Math.min(5, count)} rintangan · sekitar 3 menit · tombol 1–4</p></section></div><footer class="runner-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved.</footer></main>`;
  document.querySelectorAll<HTMLButtonElement>("[data-phase]").forEach((button) =>
    button.addEventListener("click", () => {
      playerNickname =
        document.querySelector<HTMLInputElement>("#runner-nickname")?.value.trim() ??
        playerNickname;
      selectedPhase = button.dataset.phase as Phase;
      selectedTopic = null;
      savePlayerPreferences({ nickname: playerNickname, lastPhase: selectedPhase, lastTopic: "" });
      renderSetup();
    }),
  );
  document
    .querySelector<HTMLSelectElement>("#runner-topic")
    ?.addEventListener("change", (event) => {
      selectedTopic = (event.currentTarget as HTMLSelectElement).value || null;
      renderSetup();
    });
  document
    .querySelector<HTMLButtonElement>("#start-runner")
    ?.addEventListener("click", startRunner);
}

function startRunner(): void {
  clearTransition();
  destroyDialogs();
  playerNickname =
    document.querySelector<HTMLInputElement>("#runner-nickname")?.value.trim().slice(0, 30) ??
    playerNickname;
  selectedTopic = document.querySelector<HTMLSelectElement>("#runner-topic")?.value || null;
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
  distance = 0;
  lives = 3;
  streak = 0;
  sessionFinished = false;
  app.innerHTML = `<main class="runner-screen">${renderGameHud({
    brandHref: portalUrl,
    brandLabel: "Quiz Runner",
    soundEnabled,
    stats: [
      { id: "runner-xp", icon: "⭐", label: "XP", value: progress.xp.toLocaleString("id-ID") },
      {
        id: "runner-coins",
        icon: "💰",
        label: "Koin",
        value: progress.coins.toLocaleString("id-ID"),
      },
      { id: "runner-speed", icon: "🏃", label: "Jarak", value: "0%" },
      { id: "runner-lives", icon: "❤️", label: "Nyawa", value: "3" },
      { id: "runner-level", icon: "🏆", label: "Level", value: String(levelFromXp(progress.xp)) },
    ],
  })}<section class="runner-arena" aria-label="Lintasan Quiz Runner"><div class="runner-sky"><span class="sky-sun">☀</span><span class="sky-cloud cloud-one"></span><span class="sky-cloud cloud-two"></span></div><div class="runner-hills" aria-hidden="true"></div><div class="runner-track" id="runner-track"><span class="track-finish">FINISH</span><span class="track-line line-one"></span><span class="track-line line-two"></span><span class="track-obstacle obstacle-one">🪨</span><span class="track-obstacle obstacle-two">🌵</span><span class="track-obstacle obstacle-three">🪵</span><div class="runner-avatar" id="runner-avatar" aria-label="Karakter pelari">🏃</div></div><div class="runner-question-card"><div class="runner-question-meta"><span id="runner-topic-label"></span><span id="runner-progress-label"></span></div><h1 id="runner-question" tabindex="-1" aria-live="polite" aria-atomic="true"></h1><button id="runner-listen" class="runner-listen" type="button">🔊 Dengarkan soal</button></div><div class="runner-lanes" id="runner-lanes" aria-label="Pilihan jalur jawaban"></div><div class="runner-progress-panel"><span>Progres lintasan</span><div class="runner-progress-track"><i id="runner-progress-fill"></i></div><strong id="runner-progress-text">0/5</strong></div><div class="runner-feedback" id="runner-feedback" role="status" aria-live="assertive"></div></section>${renderSessionDialogs(
    {
      gameName: "Quiz Runner",
      helpItems: [
        {
          icon: "🏃",
          title: "Pilih jalur",
          detail: "Sentuh jalur yang berisi jawaban tepat atau tekan tombol 1–4.",
        },
        {
          icon: "🌱",
          title: "Terus mencoba",
          detail: "Kalau menabrak rintangan, pembahasan akan membantu sebelum mencoba lagi.",
        },
      ],
    },
  )}</main>`;
  const pauseOverlay = document.querySelector<HTMLElement>("#pause-overlay");
  const helpOverlay = document.querySelector<HTMLElement>("#help-overlay");
  if (!pauseOverlay || !helpOverlay) throw new Error("Dialog shell permainan tidak ditemukan.");
  pauseDialogController = createDialogController(pauseOverlay, { onEscape: resumeRunner });
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
    ?.addEventListener("click", pauseRunner);
  document
    .querySelector<HTMLButtonElement>("#resume-button")
    ?.addEventListener("click", resumeRunner);
  document.querySelector<HTMLButtonElement>("#quit-button")?.addEventListener("click", quitRunner);
  document
    .querySelector<HTMLButtonElement>("#close-help-button")
    ?.addEventListener("click", closeHelp);
  document
    .querySelector<HTMLButtonElement>("#runner-listen")
    ?.addEventListener("click", readCurrentQuestion);
  renderQuestion();
}

function renderQuestion(): void {
  if (!session) return;
  const snapshot = session.getSnapshot();
  if (snapshot.completed || !snapshot.currentQuestion) {
    finishRunner(true);
    return;
  }
  const question = snapshot.currentQuestion;
  if (activeQuestionId !== question.id) {
    activeQuestionId = question.id;
    activeChoices = shuffleQuestionChoices(question);
  }
  inputLocked = false;
  setText(
    "#runner-topic-label",
    `${selectedPhase === "Fondasi" ? "FASE FONDASI" : `FASE ${selectedPhase}`} · ${question.topic}`,
  );
  setText(
    "#runner-progress-label",
    `Rintangan ${Math.min(snapshot.progress + 1, snapshot.target)} dari ${snapshot.target}`,
  );
  setText("#runner-question", question.prompt);
  setText("#runner-progress-text", `${snapshot.progress}/${snapshot.target}`);
  const fill = document.querySelector<HTMLElement>("#runner-progress-fill");
  if (fill) fill.style.width = `${(snapshot.progress / snapshot.target) * 100}%`;
  const lanes = document.querySelector<HTMLElement>("#runner-lanes");
  if (lanes) {
    const laneChoices = [...activeChoices];
    const decoys = ["Jalur latihan", "Jalur cadangan", "Jalur observasi"];
    while (laneChoices.length < 4)
      laneChoices.push(decoys[laneChoices.length - activeChoices.length] ?? "Jalur latihan");
    lanes.innerHTML = laneChoices
      .map(
        (choice, index) =>
          `<button class="runner-lane" type="button" data-answer="${escapeHtml(choice)}" aria-label="${laneNames[index]}: ${escapeHtml(choice)}"><span class="lane-key">${index + 1}</span><strong>${escapeHtml(choice)}</strong><small>${laneNames[index]}</small></button>`,
      )
      .join("");
    lanes
      .querySelectorAll<HTMLButtonElement>(".runner-lane")
      .forEach((button) => button.addEventListener("click", () => chooseLane(button)));
  }
  document.querySelector<HTMLElement>("#runner-question")?.focus({ preventScroll: true });
  hideFeedback();
}

async function chooseLane(button: HTMLButtonElement): Promise<void> {
  if (!session || inputLocked || button.disabled) return;
  const question = session.getSnapshot().currentQuestion;
  if (!question) return;
  inputLocked = true;
  document
    .querySelectorAll<HTMLButtonElement>(".runner-lane")
    .forEach((lane) => (lane.disabled = true));
  const attempt = session.submitAnswer(button.dataset.answer ?? "");
  const avatar = document.querySelector<HTMLElement>("#runner-avatar");
  if (attempt.correct) {
    button.classList.add("is-correct");
    avatar?.classList.add("is-running");
    distance = Math.min(100, distance + 18);
    streak += 1;
    progress.xp += 100;
    progress.coins += 10 + Math.min(streak - 1, 5);
    progress.bestStreak = Math.max(progress.bestStreak, streak);
    updateHud();
    showFeedback(`🏃 Jalur aman! Kamu melaju. +100 XP · Streak ${streak}`, "success");
    playTone(650, 0.13, "sine");
    scheduleTransition(() => {
      activeQuestionId = "";
      renderQuestion();
    }, 950);
    return;
  }
  button.classList.add("is-wrong");
  avatar?.classList.add("is-stumbling");
  distance = Math.max(0, distance - 8);
  lives = Math.max(1, lives - 1);
  streak = 0;
  updateHud();
  playTone(150, 0.16, "sawtooth");
  const sameQuestion = session.getSnapshot().currentQuestion?.id === question.id;
  if (sameQuestion) {
    showFeedback(`💥 Rintangan! Coba jalur lain. ${question.explanation}`, "error");
    scheduleTransition(() => {
      inputLocked = false;
      avatar?.classList.remove("is-stumbling");
      document
        .querySelectorAll<HTMLButtonElement>(".runner-lane:not(.is-wrong)")
        .forEach((lane) => (lane.disabled = false));
    }, 1_150);
  } else {
    showFeedback("💥 Pelan sedikit. Konsep ini akan kembali di lintasan berikutnya.", "error");
    scheduleTransition(() => {
      activeQuestionId = "";
      renderQuestion();
    }, 1_450);
  }
}

function updateHud(): void {
  setText("#runner-xp", progress.xp.toLocaleString("id-ID"));
  setText("#runner-coins", progress.coins.toLocaleString("id-ID"));
  setText("#runner-speed", `${distance}%`);
  setText("#runner-lives", "❤️".repeat(lives));
  setText("#runner-level", String(levelFromXp(progress.xp)));
}
function finishRunner(victory: boolean): void {
  if (!session || sessionFinished) return;
  sessionFinished = true;
  clearTransition();
  session.finish();
  progress.sessions += 1;
  saveProgress();
  const report = createSessionReport(session.getResult(), currentQuestions);
  const greeting = playerNickname ? `, ${escapeHtml(playerNickname)}` : "";
  destroyDialogs();
  app.innerHTML = `<main class="runner-result" aria-labelledby="runner-result-title"><div class="runner-result-card"><p class="runner-result-eyebrow">${victory ? "GARIS AKHIR" : "LATIHAN SELESAI"}</p><div class="runner-result-icon">${victory ? "🏆" : "🌱"}</div><h1 id="runner-result-title" tabindex="-1">${victory ? `Kamu sampai di garis akhir${greeting}!` : `Pelari tangguh terus berlatih${greeting}!`}</h1><p>${victory ? "Semua rintangan berhasil dilewati dengan strategi matematika." : "Ulangi lintasan untuk menguasai jalur yang masih menantang."}</p>${renderSessionReport(report)}<section class="runner-rewards"><h2>Progres permainan</h2><div><p><span>TOTAL XP</span><strong>${progress.xp.toLocaleString("id-ID")}</strong></p><p><span>TOTAL KOIN</span><strong>${progress.coins.toLocaleString("id-ID")}</strong></p><p><span>STREAK TERBAIK</span><strong>${progress.bestStreak}</strong></p></div></section><div class="runner-result-actions"><button class="runner-primary-button" id="retry-runner" type="button">Lari lagi</button><button class="runner-secondary-button" id="change-runner" type="button">Ganti fase</button><a href="${portalUrl}">Kembali ke semua game</a></div><p class="runner-result-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved.</p></div></main>`;
  document
    .querySelector<HTMLButtonElement>("#retry-runner")
    ?.addEventListener("click", startRunner);
  document
    .querySelector<HTMLButtonElement>("#change-runner")
    ?.addEventListener("click", renderSetup);
  document.querySelector<HTMLElement>("#runner-result-title")?.focus({ preventScroll: true });
}
function showFeedback(message: string, kind: "success" | "error"): void {
  const feedback = document.querySelector<HTMLElement>("#runner-feedback");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `runner-feedback is-visible runner-feedback--${kind}`;
}
function hideFeedback(): void {
  const feedback = document.querySelector<HTMLElement>("#runner-feedback");
  if (feedback) {
    feedback.textContent = "";
    feedback.className = "runner-feedback";
  }
}
function pauseRunner(): void {
  if (!session || session.getSnapshot().completed || inputLocked) return;
  session.pause();
  pauseDialogController?.open(document.querySelector<HTMLButtonElement>("#pause-button"));
}
function resumeRunner(): void {
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
function quitRunner(): void {
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
  if (!document.querySelector(".runner-screen")) return;
  if (event.key.toLowerCase() === "p") {
    if (pauseDialogController?.isOpen()) resumeRunner();
    else pauseRunner();
    return;
  }
  if (
    event.key === "Escape" &&
    !pauseDialogController?.isOpen() &&
    !helpDialogController?.isOpen()
  ) {
    pauseRunner();
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
    document.querySelectorAll<HTMLButtonElement>(".runner-lane")[index]?.click();
});
document.addEventListener("visibilitychange", () => {
  if (
    document.hidden &&
    document.querySelector(".runner-screen") &&
    session &&
    !session.getSnapshot().paused
  )
    pauseRunner();
});
renderSetup();

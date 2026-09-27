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

interface CastleProgress {
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
const progress: CastleProgress = { ...loadGameProgress("math-castle") };
let session: GameSession | null = null;
let currentQuestions: readonly Question[] = [];
let activeQuestionId = "";
let activeChoices: readonly string[] = [];
let inputLocked = false;
let streak = 0;
let wallStrength = 100;
let hearts = 3;
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
  saveGameProgress("math-castle", { ...progress, lastPlayedAt: new Date().toISOString() });
};

function renderSetup(): void {
  clearTransition();
  destroyShellDialogs();
  session = null;
  const availableTopics = topicsForPhase(selectedPhase);
  if (selectedTopic && !availableTopics.includes(selectedTopic)) selectedTopic = null;
  const availableQuestionCount = selectQuestions(mathQuestions, {
    phase: selectedPhase,
    ...(selectedTopic ? { topic: selectedTopic } : {}),
  }).length;

  app.innerHTML = `
    <main class="castle-setup">
      <header class="castle-header"><a class="castle-brand" href="${portalUrl}" aria-label="Kembali ke Gezy Games"><span aria-hidden="true">★</span><strong>Gezy</strong> Games</a><a class="castle-back" href="${portalUrl}">← Semua game</a></header>
      <div class="castle-setup-grid">
        <section class="castle-intro" aria-labelledby="castle-title">
          <p class="castle-eyebrow">STRATEGI · MATEMATIKA</p>
          <h1 id="castle-title"><span>Math</span> Castle</h1>
          <p>Musuh mendekat! Perkuat tembok dengan jawaban yang tepat dan lindungi kastil sampai gelombang terakhir.</p>
          <div class="castle-preview" aria-hidden="true"><span class="preview-cloud cloud-one"></span><span class="preview-cloud cloud-two"></span><span class="preview-tower tower-left">🏰</span><span class="preview-flag">⚑</span><span class="preview-knight">🛡️</span><span class="preview-enemy">👾</span></div>
          <ul class="castle-features"><li>✓ Jawaban benar memperkuat kastil</li><li>✓ Bisa dimainkan dengan sentuh</li><li>✓ Fondasi sampai SMP</li></ul>
        </section>
        <section class="castle-setup-card" aria-label="Pengaturan permainan">
          <div class="castle-stats"><div><span>LEVEL</span><strong>${levelFromXp(progress.xp)}</strong></div><div><span>XP</span><strong>${progress.xp.toLocaleString("id-ID")}</strong></div><div><span>KOIN</span><strong>${progress.coins.toLocaleString("id-ID")}</strong></div></div>
          <label class="castle-name-field"><span>Nama penjaga <small>(opsional)</small></span><input id="castle-nickname" type="text" maxlength="30" autocomplete="nickname" value="${escapeHtml(playerNickname)}" placeholder="Contoh: Raka" /></label>
          <fieldset><legend>Pilih fase belajar</legend><div class="castle-phase-options">${phases.map((phase) => `<button class="castle-phase-option${phase === selectedPhase ? " is-selected" : ""}" type="button" data-phase="${phase}" aria-pressed="${phase === selectedPhase}"><strong>${phase === "Fondasi" ? "F" : phase}</strong><span>${phase}</span><small>${phaseDescriptions[phase]}</small></button>`).join("")}</div></fieldset>
          <label class="castle-topic-field"><span>Pilih materi</span><select id="castle-topic"><option value="">Semua materi (${availableTopics.length} topik)</option>${availableTopics.map((topic) => `<option value="${escapeHtml(topic)}"${topic === selectedTopic ? " selected" : ""}>${escapeHtml(topic)}</option>`).join("")}</select></label>
          <button class="castle-primary-button" id="start-castle" type="button">Pertahankan kastil <span aria-hidden="true">→</span></button>
          <p class="castle-note">${Math.min(5, availableQuestionCount)} gelombang · sekitar 3 menit · tombol 1–4</p>
        </section>
      </div>
      <footer class="castle-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved.</footer>
    </main>
  `;

  document.querySelectorAll<HTMLButtonElement>("[data-phase]").forEach((button) =>
    button.addEventListener("click", () => {
      playerNickname =
        document.querySelector<HTMLInputElement>("#castle-nickname")?.value.trim() ??
        playerNickname;
      selectedPhase = button.dataset.phase as Phase;
      selectedTopic = null;
      savePlayerPreferences({ nickname: playerNickname, lastPhase: selectedPhase, lastTopic: "" });
      renderSetup();
    }),
  );
  document
    .querySelector<HTMLSelectElement>("#castle-topic")
    ?.addEventListener("change", (event) => {
      selectedTopic = (event.currentTarget as HTMLSelectElement).value || null;
      renderSetup();
    });
  document.querySelector<HTMLButtonElement>("#start-castle")?.addEventListener("click", startGame);
}

function startGame(): void {
  clearTransition();
  destroyShellDialogs();
  playerNickname =
    document.querySelector<HTMLInputElement>("#castle-nickname")?.value.trim().slice(0, 30) ??
    playerNickname;
  selectedTopic = document.querySelector<HTMLSelectElement>("#castle-topic")?.value || null;
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
  streak = 0;
  wallStrength = 100;
  hearts = 3;
  sessionFinished = false;

  app.innerHTML = `
    <main class="castle-screen">
      ${renderGameHud({
        brandHref: portalUrl,
        brandLabel: "Math Castle",
        soundEnabled,
        stats: [
          { id: "castle-xp", icon: "⭐", label: "XP", value: progress.xp.toLocaleString("id-ID") },
          {
            id: "castle-coins",
            icon: "💰",
            label: "Koin",
            value: progress.coins.toLocaleString("id-ID"),
          },
          { id: "castle-wall", icon: "🧱", label: "Tembok", value: "100%" },
          { id: "castle-hearts", icon: "❤️", label: "Nyawa", value: "3" },
          {
            id: "castle-level",
            icon: "🏆",
            label: "Level",
            value: String(levelFromXp(progress.xp)),
          },
        ],
      })}
      <section class="castle-arena" aria-label="Arena pertahanan kastil">
        <div class="castle-sky"><span class="castle-moon">✦</span><span class="castle-bird">✧</span></div>
        <div class="castle-hills" aria-hidden="true"></div>
        <div class="castle-question-card"><div class="castle-question-meta"><span id="castle-topic-label"></span><span id="castle-wave-label"></span></div><h1 id="castle-question" tabindex="-1" aria-live="polite" aria-atomic="true"></h1><button id="castle-listen" class="castle-listen" type="button">🔊 Dengarkan soal</button></div>
        <div class="castle-battlefield"><div class="castle-stronghold" id="castle-stronghold"><span class="castle-wall-icon" aria-hidden="true">🏰</span><span class="castle-bar"><i id="castle-wall-fill"></i></span><small>TEMBOK</small></div><div class="battle-path"><span class="battle-marker marker-one">👾</span><span class="battle-marker marker-two">👾</span><span class="battle-marker marker-three">👾</span></div><div class="castle-enemy" id="castle-enemy" aria-label="Musuh mendekati kastil"><span aria-hidden="true">👹</span><small>GELOMBANG</small></div></div>
        <div class="castle-choices" id="castle-choices" aria-label="Pilihan pertahanan"></div>
        <div class="castle-progress-panel"><span>Gelombang serangan</span><div class="castle-progress-track"><i id="castle-progress-fill"></i></div><strong id="castle-progress-text">0/5</strong></div>
        <div class="castle-feedback" id="castle-feedback" role="status" aria-live="assertive"></div>
      </section>
      ${renderSessionDialogs({
        gameName: "Math Castle",
        helpItems: [
          {
            icon: "🧱",
            title: "Perkuat tembok",
            detail: "Pilih jawaban yang tepat untuk menghentikan musuh.",
          },
          {
            icon: "🛡️",
            title: "Coba lagi",
            detail: "Jawaban salah memberi petunjuk. Kamu masih punya kesempatan.",
          },
        ],
      })}
    </main>
  `;
  const pauseOverlay = document.querySelector<HTMLElement>("#pause-overlay");
  const helpOverlay = document.querySelector<HTMLElement>("#help-overlay");
  if (!pauseOverlay || !helpOverlay) throw new Error("Dialog shell permainan tidak ditemukan.");
  pauseDialogController = createDialogController(pauseOverlay, { onEscape: resumeGame });
  helpDialogController = createDialogController(helpOverlay, { onEscape: closeHelp });
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
  document.querySelector<HTMLButtonElement>("#quit-button")?.addEventListener("click", quitSession);
  document
    .querySelector<HTMLButtonElement>("#close-help-button")
    ?.addEventListener("click", closeHelp);
  document
    .querySelector<HTMLButtonElement>("#castle-listen")
    ?.addEventListener("click", readCurrentQuestion);
  renderQuestion();
}

function renderQuestion(): void {
  if (!session) return;
  const snapshot = session.getSnapshot();
  if (snapshot.completed || !snapshot.currentQuestion) {
    finishGame(true);
    return;
  }
  const question = snapshot.currentQuestion;
  if (activeQuestionId !== question.id) {
    activeQuestionId = question.id;
    activeChoices = shuffleQuestionChoices(question);
  }
  inputLocked = false;
  setText(
    "#castle-topic-label",
    `${selectedPhase === "Fondasi" ? "FASE FONDASI" : `FASE ${selectedPhase}`} · ${question.topic}`,
  );
  setText(
    "#castle-wave-label",
    `Gelombang ${Math.min(snapshot.progress + 1, snapshot.target)} dari ${snapshot.target}`,
  );
  setText("#castle-question", question.prompt);
  setText("#castle-progress-text", `${snapshot.progress}/${snapshot.target}`);
  const progressFill = document.querySelector<HTMLElement>("#castle-progress-fill");
  if (progressFill) progressFill.style.width = `${(snapshot.progress / snapshot.target) * 100}%`;
  const choices = document.querySelector<HTMLElement>("#castle-choices");
  if (choices) {
    choices.innerHTML = activeChoices
      .map(
        (choice, index) =>
          `<button class="castle-answer" type="button" data-answer="${escapeHtml(choice)}" aria-label="Pilihan ${index + 1}: ${escapeHtml(choice)}"><span>${index + 1}</span><strong>${escapeHtml(choice)}</strong><i aria-hidden="true">🛡️</i></button>`,
      )
      .join("");
    choices
      .querySelectorAll<HTMLButtonElement>(".castle-answer")
      .forEach((button) => button.addEventListener("click", () => answerQuestion(button)));
  }
  document.querySelector<HTMLElement>("#castle-question")?.focus({ preventScroll: true });
  hideFeedback();
}

async function answerQuestion(button: HTMLButtonElement): Promise<void> {
  if (!session || inputLocked || button.disabled) return;
  const question = session.getSnapshot().currentQuestion;
  if (!question) return;
  inputLocked = true;
  document
    .querySelectorAll<HTMLButtonElement>(".castle-answer")
    .forEach((answer) => (answer.disabled = true));
  const attempt = session.submitAnswer(button.dataset.answer ?? "");
  playTone(260, 0.08, "triangle");
  const enemy = document.querySelector<HTMLElement>("#castle-enemy");
  if (attempt.correct) {
    button.classList.add("is-correct");
    enemy?.classList.add("is-defeated");
    streak += 1;
    wallStrength = Math.min(100, wallStrength + 8);
    progress.xp += 100;
    progress.coins += 10 + Math.min(streak - 1, 5);
    progress.bestStreak = Math.max(progress.bestStreak, streak);
    updateHud();
    showFeedback(`🛡️ Tembok diperkuat! +100 XP · Streak ${streak}`, "success");
    playTone(650, 0.13, "sine");
    scheduleTransition(() => {
      activeQuestionId = "";
      renderQuestion();
    }, 950);
    return;
  }
  button.classList.add("is-wrong");
  enemy?.classList.add("is-attacking");
  streak = 0;
  wallStrength = Math.max(20, wallStrength - 12);
  hearts = Math.max(1, hearts - 1);
  updateHud();
  playTone(150, 0.16, "sawtooth");
  const sameQuestion = session.getSnapshot().currentQuestion?.id === question.id;
  if (sameQuestion) {
    showFeedback(`💥 Serangan mengenai tembok. Coba lagi! ${question.explanation}`, "error");
    scheduleTransition(() => {
      inputLocked = false;
      enemy?.classList.remove("is-attacking");
      document
        .querySelectorAll<HTMLButtonElement>(".castle-answer:not(.is-wrong)")
        .forEach((answer) => (answer.disabled = false));
    }, 1_150);
  } else {
    showFeedback(`💥 Tembok bergetar. Materi ini akan kembali lagi.`, "error");
    scheduleTransition(() => {
      activeQuestionId = "";
      renderQuestion();
    }, 1_450);
  }
}

function updateHud(): void {
  setText("#castle-xp", progress.xp.toLocaleString("id-ID"));
  setText("#castle-coins", progress.coins.toLocaleString("id-ID"));
  setText("#castle-wall", `${wallStrength}%`);
  setText("#castle-hearts", "❤️".repeat(hearts));
  setText("#castle-level", String(levelFromXp(progress.xp)));
  const wallFill = document.querySelector<HTMLElement>("#castle-wall-fill");
  if (wallFill) wallFill.style.width = `${wallStrength}%`;
  const stronghold = document.querySelector<HTMLElement>("#castle-stronghold");
  stronghold?.classList.toggle("is-damaged", wallStrength < 55);
}

function finishGame(victory: boolean): void {
  if (!session || sessionFinished) return;
  sessionFinished = true;
  clearTransition();
  session.finish();
  progress.sessions += 1;
  saveProgress();
  const report = createSessionReport(session.getResult(), currentQuestions);
  const greeting = playerNickname ? `, ${escapeHtml(playerNickname)}` : "";
  destroyShellDialogs();
  app.innerHTML = `<main class="castle-result" aria-labelledby="castle-result-title"><div class="castle-result-card"><p class="castle-result-eyebrow">${victory ? "KASTIL SELAMAT" : "LATIHAN SELESAI"}</p><div class="castle-result-icon">${victory ? "🏰" : "🧱"}</div><h1 id="castle-result-title" tabindex="-1">${victory ? `Kastilmu bertahan${greeting}!` : `Penjagamu terus belajar${greeting}!`}</h1><p>${victory ? "Semua gelombang berhasil dihalau dengan strategi matematika." : "Ulangi latihan untuk memperkuat konsep yang masih menantang."}</p>${renderSessionReport(report)}<section class="castle-rewards"><h2>Progres permainan</h2><div><p><span>TOTAL XP</span><strong>${progress.xp.toLocaleString("id-ID")}</strong></p><p><span>TOTAL KOIN</span><strong>${progress.coins.toLocaleString("id-ID")}</strong></p><p><span>STREAK TERBAIK</span><strong>${progress.bestStreak}</strong></p></div></section><div class="castle-result-actions"><button class="castle-primary-button" id="retry-castle" type="button">Pertahankan lagi</button><button class="castle-secondary-button" id="change-castle" type="button">Ganti fase</button><a href="${portalUrl}">Kembali ke semua game</a></div><p class="castle-result-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved.</p></div></main>`;
  document.querySelector<HTMLButtonElement>("#retry-castle")?.addEventListener("click", startGame);
  document
    .querySelector<HTMLButtonElement>("#change-castle")
    ?.addEventListener("click", renderSetup);
  document.querySelector<HTMLElement>("#castle-result-title")?.focus({ preventScroll: true });
}

function showFeedback(message: string, kind: "success" | "error"): void {
  const feedback = document.querySelector<HTMLElement>("#castle-feedback");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `castle-feedback is-visible castle-feedback--${kind}`;
}
function hideFeedback(): void {
  const feedback = document.querySelector<HTMLElement>("#castle-feedback");
  if (feedback) {
    feedback.textContent = "";
    feedback.className = "castle-feedback";
  }
}
function pauseGame(): void {
  if (!session || session.getSnapshot().completed || inputLocked) return;
  session.pause();
  pauseDialogController?.open(document.querySelector<HTMLButtonElement>("#pause-button"));
}
function resumeGame(): void {
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
function quitSession(): void {
  if (!session || window.confirm("Keluar dari sesi? Progres sesi ini tidak akan disimpan.")) {
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
function destroyShellDialogs(): void {
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
  if (!document.querySelector(".castle-screen")) return;
  if (event.key.toLowerCase() === "p") {
    if (pauseDialogController?.isOpen()) resumeGame();
    else pauseGame();
    return;
  }
  if (
    event.key === "Escape" &&
    !pauseDialogController?.isOpen() &&
    !helpDialogController?.isOpen()
  ) {
    pauseGame();
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
    document.querySelectorAll<HTMLButtonElement>(".castle-answer")[index]?.click();
});
document.addEventListener("visibilitychange", () => {
  if (
    document.hidden &&
    document.querySelector(".castle-screen") &&
    session &&
    !session.getSnapshot().paused
  )
    pauseGame();
});

renderSetup();

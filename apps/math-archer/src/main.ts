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
  loadPlayerProgress,
  migrateLegacyMathArcherProgress,
  saveGameProgress,
  savePlayerPreferences,
} from "@gezy-games/progress";
import { mathQuestions, phases, type Phase, type Question } from "@gezy-games/question-bank";
import { createSessionReport, renderSessionReport } from "@gezy-games/session-report";
import "./styles.css";

type GameMode = "calm" | "practice" | "challenge";

interface PlayerProgress {
  xp: number;
  coins: number;
  bestStreak: number;
  sessions: number;
}

const portalUrl = import.meta.env.DEV ? "http://localhost:5173/" : "/";
const appElement = document.querySelector<HTMLDivElement>("#app");

if (!appElement) throw new Error("Elemen aplikasi tidak ditemukan.");
const app: HTMLDivElement = appElement;

const phaseDescriptions: Record<Phase, string> = {
  Fondasi: "PAUD / TK",
  A: "Kelas 1–2",
  B: "Kelas 3–4",
  C: "Kelas 5–6",
  D: "Kelas 7–9",
};

const modeDetails: Record<GameMode, { label: string; detail: string; seconds: number | null }> = {
  calm: { label: "Santai", detail: "Tanpa timer dan tanpa kalah", seconds: null },
  practice: { label: "Latihan", detail: "30 detik per sasaran", seconds: 30 },
  challenge: { label: "Tantangan", detail: "18 detik dan 3 hati", seconds: 18 },
};

const initialPreferences = loadPlayerProgress().preferences;
let selectedPhase: Phase = phases.includes(initialPreferences.lastPhase as Phase)
  ? (initialPreferences.lastPhase as Phase)
  : "A";
const topicsForPhase = (phase: Phase): readonly string[] => [
  ...new Set(
    mathQuestions
      .filter((question) => question.phase === phase && question.status === "published")
      .map((question) => question.topic),
  ),
];
let selectedTopic: string | null =
  initialPreferences.lastTopic &&
  topicsForPhase(selectedPhase).includes(initialPreferences.lastTopic)
    ? initialPreferences.lastTopic
    : null;
let selectedMode: GameMode = "calm";
let session: GameSession | null = null;
let currentQuestions: readonly Question[] = [];
let activeQuestionId = "";
let activeChoices: readonly string[] = [];
let streak = 0;
let hearts = 3;
let inputLocked = false;
let soundEnabled = initialPreferences.audioEnabled;
let playerNickname = initialPreferences.nickname;
let timerId: number | null = null;
let deadline = 0;
let remainingMs = 0;
let sessionFinished = false;
let transitionTimerId: number | null = null;
let pendingTransition: (() => void) | null = null;
let pauseDialogController: DialogController | null = null;
let helpDialogController: DialogController | null = null;
let resumeAfterHelp = false;
const progress: PlayerProgress = { ...migrateLegacyMathArcherProgress() };

function saveProgress(): void {
  saveGameProgress("math-archer", {
    ...progress,
    lastPlayedAt: new Date().toISOString(),
  });
}

const levelFromXp = (xp: number): number => Math.floor(xp / 1_000) + 1;

function renderSetup(): void {
  clearTimer();
  clearTransition();
  destroyShellDialogs();
  const availableTopics = topicsForPhase(selectedPhase);
  if (selectedTopic && !availableTopics.includes(selectedTopic)) selectedTopic = null;
  const availableQuestionCount = selectQuestions(mathQuestions, {
    phase: selectedPhase,
    ...(selectedTopic ? { topic: selectedTopic } : {}),
  }).length;
  app.innerHTML = `
    <main class="setup-screen">
      <header class="game-header">
        <a class="mini-brand" href="${portalUrl}" aria-label="Kembali ke Gezy Games">
          <span>★</span><strong>Gezy</strong> Games
        </a>
        <a class="back-link" href="${portalUrl}">← Semua game</a>
      </header>

      <div class="setup-layout">
        <section class="setup-hero" aria-labelledby="game-title">
          <p class="setup-eyebrow">GAME PERTAMA GEZY GAMES</p>
          <h1 id="game-title"><span>Pemanah</span> Matematika</h1>
          <p>Baca tantangannya, bidik jawaban, dan lepaskan panahmu menuju sasaran yang tepat.</p>
          <div class="setup-scene" aria-hidden="true">
            <span class="setup-archer">🏹</span>
            <span class="setup-arrow">➳</span>
            <span class="setup-target">🎯</span>
          </div>
          <ul class="setup-features">
            <li>✓ Bisa disentuh langsung</li>
            <li>✓ Soal salah kembali lagi</li>
            <li>✓ Fondasi sampai SMP</li>
          </ul>
        </section>

        <section class="setup-panel" aria-label="Pengaturan permainan">
          <div class="player-summary">
            <div><span>LEVEL</span><strong>${levelFromXp(progress.xp)}</strong></div>
            <div><span>XP</span><strong>${progress.xp.toLocaleString("id-ID")}</strong></div>
            <div><span>KOIN</span><strong>${progress.coins.toLocaleString("id-ID")}</strong></div>
          </div>

          <label class="nickname-field">
            <span>Nama pemain <small>(opsional)</small></span>
            <input id="player-nickname" type="text" maxlength="30" autocomplete="nickname" value="${escapeHtml(playerNickname)}" placeholder="Contoh: Raka" />
          </label>

          <fieldset>
            <legend>Pilih fase belajar</legend>
            <div class="phase-options">
              ${phases
                .map(
                  (phase) => `
                    <button class="phase-option${phase === selectedPhase ? " is-selected" : ""}" type="button" data-phase="${phase}" aria-pressed="${phase === selectedPhase}">
                      <strong>${phase === "Fondasi" ? "F" : phase}</strong>
                      <span>${phase}</span>
                      <small>${phaseDescriptions[phase]}</small>
                    </button>
                  `,
                )
                .join("")}
            </div>
          </fieldset>

          <label class="topic-field">
            <span>Pilih materi</span>
            <select id="topic-select">
              <option value="">Semua materi (${availableTopics.length} topik)</option>
              ${availableTopics
                .map((topic) => {
                  const questionCount = selectQuestions(mathQuestions, {
                    phase: selectedPhase,
                    topic,
                  }).length;
                  return `<option value="${escapeHtml(topic)}"${topic === selectedTopic ? " selected" : ""}>${escapeHtml(topic)} (${questionCount} soal)</option>`;
                })
                .join("")}
            </select>
          </label>

          <fieldset>
            <legend>Pilih cara bermain</legend>
            <div class="mode-options">
              ${(Object.entries(modeDetails) as [GameMode, (typeof modeDetails)[GameMode]][])
                .map(
                  ([mode, info]) => `
                    <button class="mode-option${mode === selectedMode ? " is-selected" : ""}" type="button" data-mode="${mode}" aria-pressed="${mode === selectedMode}">
                      <span>${mode === "calm" ? "🌿" : mode === "practice" ? "🎯" : "⚡"}</span>
                      <strong>${info.label}</strong>
                      <small>${info.detail}</small>
                    </button>
                  `,
                )
                .join("")}
            </div>
          </fieldset>

          <button class="start-button" type="button">Mulai Memanah <span aria-hidden="true">→</span></button>
          <p class="setup-note">${Math.min(5, availableQuestionCount)} sasaran · sekitar 3 menit · sentuh atau tombol 1–3</p>
        </section>
      </div>
      <footer class="legal-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved.</footer>
    </main>
  `;

  document.querySelectorAll<HTMLButtonElement>("[data-phase]").forEach((button) => {
    button.addEventListener("click", () => {
      playerNickname =
        document.querySelector<HTMLInputElement>("#player-nickname")?.value.trim() ??
        playerNickname;
      selectedPhase = button.dataset.phase as Phase;
      selectedTopic = null;
      savePlayerPreferences({ nickname: playerNickname, lastPhase: selectedPhase, lastTopic: "" });
      renderSetup();
    });
  });

  document
    .querySelector<HTMLSelectElement>("#topic-select")
    ?.addEventListener("change", (event) => {
      selectedTopic = (event.currentTarget as HTMLSelectElement).value || null;
      savePlayerPreferences({ lastPhase: selectedPhase, lastTopic: selectedTopic ?? "" });
      renderSetup();
    });

  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      playerNickname =
        document.querySelector<HTMLInputElement>("#player-nickname")?.value.trim() ??
        playerNickname;
      selectedMode = button.dataset.mode as GameMode;
      savePlayerPreferences({ nickname: playerNickname });
      renderSetup();
    });
  });

  document.querySelector<HTMLButtonElement>(".start-button")?.addEventListener("click", startGame);
}

function startGame(): void {
  clearTransition();
  destroyShellDialogs();
  const nicknameInput = document.querySelector<HTMLInputElement>("#player-nickname");
  if (nicknameInput) playerNickname = nicknameInput.value.trim().slice(0, 30);
  const topicSelect = document.querySelector<HTMLSelectElement>("#topic-select");
  if (topicSelect) selectedTopic = topicSelect.value || null;
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
  streak = 0;
  hearts = 3;
  inputLocked = false;
  sessionFinished = false;

  app.innerHTML = `
    <main class="play-screen">
      ${renderGameHud({
        brandHref: portalUrl,
        soundEnabled,
        stats: [
          { id: "hud-xp", icon: "⭐", label: "XP", value: progress.xp.toLocaleString("id-ID") },
          {
            id: "hud-coins",
            icon: "💰",
            label: "Koin",
            value: progress.coins.toLocaleString("id-ID"),
          },
          { id: "hud-streak", icon: "🔥", label: "Streak", value: "0" },
          {
            id: "hud-hearts",
            icon: "❤️",
            label: "Nyawa",
            value: selectedMode === "challenge" ? "3" : "∞",
            className: "hearts-stat",
          },
          { id: "hud-level", icon: "🏆", label: "Level", value: String(levelFromXp(progress.xp)) },
        ],
      })}

      <section class="arena" aria-label="Arena memanah">
        <div class="sky-decoration" aria-hidden="true"><span></span><span></span><span></span></div>
        <div class="distant-hills" aria-hidden="true"></div>
        <div class="forest-line" aria-hidden="true">♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠</div>

        <div class="question-board">
          <div class="question-meta">
            <span id="topic-label"></span>
            <span id="question-progress"></span>
          </div>
          <h1 id="question-prompt"></h1>
          <button class="listen-question-button" id="listen-question-button" type="button">
            🔊 Dengarkan soal
          </button>
          <div class="timer-row" id="timer-row" hidden>
            <div class="timer-track"><span id="timer-fill"></span></div>
            <strong id="timer-text"></strong>
          </div>
        </div>

        <div class="targets" id="targets" aria-label="Pilihan sasaran"></div>

        <div class="archer-zone" aria-hidden="true">
          <div class="archer-character"><span>🧒</span><i class="archer-bow">)</i></div>
          <span class="grass-patch"></span>
        </div>

        <div class="progress-panel">
          <span>Penguasaan</span>
          <div class="mastery-track"><i id="mastery-fill"></i></div>
          <strong id="mastery-text">0/5</strong>
        </div>

        <div class="feedback" id="feedback" role="status" aria-live="assertive"></div>
      </section>

      ${renderSessionDialogs({
        gameName: "Pemanah Matematika",
        helpItems: [
          {
            icon: "👆",
            title: "Sentuh atau klik",
            detail: "Pilih target dengan jawaban yang tepat.",
          },
          {
            icon: "🏹",
            title: "Bidik dengan tenang",
            detail: "Jawaban salah boleh dicoba kembali.",
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
  document
    .querySelector<HTMLButtonElement>("#pause-button")
    ?.addEventListener("click", () => pauseGame());
  document
    .querySelector<HTMLButtonElement>("#resume-button")
    ?.addEventListener("click", resumeGame);
  document.querySelector<HTMLButtonElement>("#quit-button")?.addEventListener("click", quitSession);
  document
    .querySelector<HTMLButtonElement>("#close-help-button")
    ?.addEventListener("click", closeHelp);
  document
    .querySelector<HTMLButtonElement>("#listen-question-button")
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
    "#topic-label",
    `${selectedPhase === "Fondasi" ? "FASE FONDASI" : `FASE ${selectedPhase}`} · ${question.topic}`,
  );
  setText(
    "#question-progress",
    `Sasaran ${Math.min(snapshot.progress + 1, snapshot.target)} dari ${snapshot.target}`,
  );
  setText("#question-prompt", question.prompt);
  setText("#mastery-text", `${snapshot.progress}/${snapshot.target}`);
  const masteryFill = document.querySelector<HTMLElement>("#mastery-fill");
  if (masteryFill) masteryFill.style.width = `${(snapshot.progress / snapshot.target) * 100}%`;

  const targets = document.querySelector<HTMLElement>("#targets");
  if (targets) {
    targets.innerHTML = activeChoices
      .map(
        (choice, index) => `
          <button class="target-button" type="button" data-answer="${escapeHtml(choice)}" aria-label="Pilihan ${index + 1}: ${escapeHtml(choice)}">
            <span class="target-number">${index + 1}</span>
            <span class="target-face" aria-hidden="true"><i></i><b></b></span>
            <strong>${escapeHtml(choice)}</strong>
          </button>
        `,
      )
      .join("");
    targets.querySelectorAll<HTMLButtonElement>(".target-button").forEach((button) => {
      button.addEventListener("click", () => shootAt(button));
    });
  }

  hideFeedback();
  startQuestionTimer();
}

async function shootAt(target: HTMLButtonElement): Promise<void> {
  if (!session || inputLocked || target.disabled) return;
  const question = session.getSnapshot().currentQuestion;
  if (!question) return;

  inputLocked = true;
  clearTimer();
  document.querySelectorAll<HTMLButtonElement>(".target-button").forEach((button) => {
    button.disabled = true;
  });
  document.querySelector(".archer-character")?.classList.add("is-shooting");
  const answer = target.dataset.answer ?? "";
  const attempt = session.submitAnswer(answer);
  playTone(260, 0.08, "triangle");
  await animateArrow(target);

  if (attempt.correct) {
    target.classList.add("is-hit");
    streak += 1;
    progress.xp += 100;
    progress.coins += 10 + Math.min(streak - 1, 5);
    progress.bestStreak = Math.max(progress.bestStreak, streak);
    updateHud();
    showFeedback(`🎯 Tepat! +100 XP · Streak ${streak}`, "success");
    playTone(620, 0.12, "sine");
    scheduleTransition(() => {
      activeQuestionId = "";
      renderQuestion();
    }, 1_050);
    return;
  }

  target.classList.add("is-miss");
  streak = 0;
  if (selectedMode === "challenge") hearts = Math.max(0, hearts - 1);
  updateHud();
  playTone(150, 0.16, "sawtooth");

  const sameQuestion = session.getSnapshot().currentQuestion?.id === question.id;
  if (selectedMode === "challenge" && hearts === 0) {
    showFeedback("Perisaimu habis. Kita lihat apa yang sudah dikuasai.", "error");
    scheduleTransition(() => finishGame(false), 1_200);
    return;
  }

  if (sameQuestion) {
    showFeedback("Belum tepat. Coba sasaran lain!", "error");
    scheduleTransition(() => {
      inputLocked = false;
      document.querySelector(".archer-character")?.classList.remove("is-shooting");
      document
        .querySelectorAll<HTMLButtonElement>(".target-button:not(.is-miss)")
        .forEach((button) => {
          button.disabled = false;
        });
      startQuestionTimer(true);
    }, 900);
  } else {
    showFeedback(`Kita coba konsep ini lagi nanti. ${question.explanation}`, "error");
    scheduleTransition(() => {
      activeQuestionId = "";
      renderQuestion();
    }, 1_700);
  }
}

function animateArrow(target: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const arena = document.querySelector<HTMLElement>(".arena");
    const bow = document.querySelector<HTMLElement>(".archer-bow");
    if (!arena || !bow) {
      resolve();
      return;
    }

    const arenaRect = arena.getBoundingClientRect();
    const bowRect = bow.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const startX = bowRect.left + bowRect.width / 2 - arenaRect.left;
    const startY = bowRect.top + bowRect.height / 2 - arenaRect.top;
    const endX = targetRect.left + targetRect.width / 2 - arenaRect.left;
    const endY = targetRect.top + targetRect.height / 2 - arenaRect.top;
    const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

    const arrow = document.createElement("span");
    arrow.className = "flying-arrow";
    arrow.textContent = "➳";
    arrow.style.left = `${startX}px`;
    arrow.style.top = `${startY}px`;
    arrow.style.setProperty("--arrow-x", `${endX - startX}px`);
    arrow.style.setProperty("--arrow-y", `${endY - startY}px`);
    arrow.style.setProperty("--arrow-angle", `${angle}deg`);
    arena.append(arrow);
    arrow.addEventListener(
      "animationend",
      () => {
        arrow.remove();
        resolve();
      },
      { once: true },
    );
  });
}

function startQuestionTimer(preserve = false): void {
  clearTimer();
  const seconds = modeDetails[selectedMode].seconds;
  const row = document.querySelector<HTMLElement>("#timer-row");
  if (!seconds) {
    if (row) row.hidden = true;
    return;
  }

  if (row) row.hidden = false;
  if (!preserve || remainingMs <= 0) remainingMs = seconds * 1_000;
  deadline = Date.now() + remainingMs;
  updateTimer();
  timerId = window.setInterval(updateTimer, 100);
}

function updateTimer(): void {
  const total = modeDetails[selectedMode].seconds;
  if (!total) return;
  remainingMs = Math.max(0, deadline - Date.now());
  const ratio = remainingMs / (total * 1_000);
  const fill = document.querySelector<HTMLElement>("#timer-fill");
  if (fill) fill.style.width = `${ratio * 100}%`;
  setText("#timer-text", String(Math.ceil(remainingMs / 1_000)));
  if (remainingMs === 0) handleTimeout();
}

function handleTimeout(): void {
  if (!session || inputLocked) return;
  clearTimer();
  inputLocked = true;
  streak = 0;
  if (selectedMode === "challenge") hearts = Math.max(0, hearts - 1);
  const question = session.getSnapshot().currentQuestion;
  if (!question) return;
  session.submitAnswer("__TIMEOUT__");
  updateHud();
  showFeedback("Waktu habis. Tarik napas, lalu coba lagi.", "error");

  if (selectedMode === "challenge" && hearts === 0) {
    scheduleTransition(() => finishGame(false), 1_200);
    return;
  }

  const sameQuestion = session.getSnapshot().currentQuestion?.id === question.id;
  scheduleTransition(() => {
    if (sameQuestion) {
      inputLocked = false;
      startQuestionTimer();
    } else {
      activeQuestionId = "";
      renderQuestion();
    }
  }, 1_100);
}

function pauseGame(force = false): void {
  if (!session || session.getSnapshot().completed) return;
  if (inputLocked && !force) return;
  session.pause();
  if (deadline) remainingMs = Math.max(0, deadline - Date.now());
  clearTimer();
  pauseDialogController?.open(document.querySelector<HTMLButtonElement>("#pause-button"));
}

function resumeGame(): void {
  if (!session) return;
  pauseDialogController?.close();
  session.resume();
  const deferredTransition = pendingTransition;
  pendingTransition = null;
  if (deferredTransition) deferredTransition();
  else if (!inputLocked) startQuestionTimer(true);
}

function openHelp(): void {
  if (!session || inputLocked || helpDialogController?.isOpen()) return;
  resumeAfterHelp = !session.getSnapshot().paused;
  if (resumeAfterHelp) {
    session.pause();
    if (deadline) remainingMs = Math.max(0, deadline - Date.now());
    clearTimer();
  }
  helpDialogController?.open(document.querySelector<HTMLButtonElement>("#help-button"));
}

function closeHelp(): void {
  if (!helpDialogController?.isOpen()) return;
  helpDialogController.close();
  if (resumeAfterHelp && session) {
    session.resume();
    startQuestionTimer(true);
  }
  resumeAfterHelp = false;
}

function quitSession(): void {
  if (!session) {
    renderSetup();
    return;
  }
  const snapshot = session.getSnapshot();
  if (
    snapshot.attempts.length > 0 &&
    !window.confirm("Keluar dari sesi? Progres sesi yang sedang berjalan tidak akan disimpan.")
  ) {
    return;
  }
  clearTimer();
  clearTransition();
  session.finish();
  session = null;
  renderSetup();
}

function finishGame(victory: boolean): void {
  if (!session || sessionFinished) return;
  sessionFinished = true;
  clearTimer();
  clearTransition();
  session.finish();
  progress.sessions += 1;
  saveProgress();
  const result = session.getResult();
  const report = createSessionReport(result, currentQuestions);
  const playerGreeting = playerNickname ? `, ${escapeHtml(playerNickname)}` : "";
  destroyShellDialogs();

  app.innerHTML = `
    <main class="result-screen">
      <div class="result-card">
        <p class="result-eyebrow">${victory ? "MISI SELESAI" : "LATIHAN SELESAI"}</p>
        <div class="result-icon">${victory ? "🏆" : "🌱"}</div>
        <h1>${victory ? `Panahmu tepat sasaran${playerGreeting}!` : `Kemampuanmu terus tumbuh${playerGreeting}!`}</h1>
        <p>${victory ? "Semua konsep pada sesi ini sudah kamu kuasai." : "Coba lagi dengan mode Santai untuk menguasai sasaran yang tersisa."}</p>

        ${renderSessionReport(report)}

        <section class="game-rewards" aria-labelledby="game-rewards-title">
          <h2 id="game-rewards-title">Progres permainan</h2>
          <div>
            <p><span>TOTAL XP</span><strong>${progress.xp.toLocaleString("id-ID")}</strong></p>
            <p><span>TOTAL KOIN</span><strong>${progress.coins.toLocaleString("id-ID")}</strong></p>
            <p><span>STREAK TERBAIK</span><strong>${progress.bestStreak}</strong></p>
          </div>
        </section>

        <div class="result-actions">
          <button class="play-again-button retry-session-button" type="button">Ulangi materi</button>
          <button class="change-material-button" type="button">Ganti materi</button>
          <a href="${portalUrl}">Kembali ke semua game</a>
        </div>
        <p class="result-legal">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved.</p>
      </div>
    </main>
  `;

  document
    .querySelector<HTMLButtonElement>(".retry-session-button")
    ?.addEventListener("click", startGame);
  document
    .querySelector<HTMLButtonElement>(".change-material-button")
    ?.addEventListener("click", renderSetup);
}

function updateHud(): void {
  setText("#hud-xp", progress.xp.toLocaleString("id-ID"));
  setText("#hud-coins", progress.coins.toLocaleString("id-ID"));
  setText("#hud-streak", String(streak));
  setText("#hud-hearts", selectedMode === "challenge" ? String(hearts) : "∞");
  setText("#hud-level", String(levelFromXp(progress.xp)));
}

function showFeedback(message: string, kind: "success" | "error"): void {
  const feedback = document.querySelector<HTMLElement>("#feedback");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `feedback is-visible feedback--${kind}`;
}

function hideFeedback(): void {
  const feedback = document.querySelector<HTMLElement>("#feedback");
  if (!feedback) return;
  feedback.className = "feedback";
  feedback.textContent = "";
}

function clearTimer(): void {
  if (timerId !== null) window.clearInterval(timerId);
  timerId = null;
}

function scheduleTransition(callback: () => void, delayMs: number): void {
  if (transitionTimerId !== null) window.clearTimeout(transitionTimerId);
  pendingTransition = null;
  transitionTimerId = window.setTimeout(() => {
    transitionTimerId = null;
    if (session?.getSnapshot().paused) {
      pendingTransition = callback;
      return;
    }
    callback();
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
  if (!soundEnabled) window.speechSynthesis?.cancel();
  savePlayerPreferences({ audioEnabled: soundEnabled });
  const button = document.querySelector<HTMLButtonElement>("#sound-button");
  if (button) {
    button.textContent = soundEnabled ? "🔊" : "🔇";
    button.setAttribute("aria-label", soundEnabled ? "Matikan suara" : "Nyalakan suara");
  }
}

function readCurrentQuestion(): void {
  const question = session?.getSnapshot().currentQuestion;
  if (!question) return;
  if (!soundEnabled) {
    showFeedback("Nyalakan suara di pojok atas untuk mendengarkan soal.", "error");
    return;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(questionToSpeech(question.prompt));
    utterance.lang = "id-ID";
    utterance.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch {
    showFeedback(
      "Perangkat ini belum dapat membacakan soal. Kamu tetap bisa membaca di papan.",
      "error",
    );
  }
}

function questionToSpeech(prompt: string): string {
  return prompt
    .replace(/[\p{Extended_Pictographic}]/gu, "")
    .replaceAll("cm²", "sentimeter persegi")
    .replaceAll("×", " kali ")
    .replaceAll("÷", " dibagi ")
    .replaceAll("−", " dikurangi ")
    .replaceAll("+", " ditambah ")
    .replaceAll("=", " sama dengan ")
    .replaceAll("%", " persen ")
    .replaceAll("∈", " anggota dari ")
    .replaceAll("∪", " gabungan ")
    .replace(/\s+/g, " ")
    .trim();
}

function playTone(frequency: number, duration: number, type: OscillatorType): void {
  if (!soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
    oscillator.addEventListener("ended", () => context.close(), { once: true });
  } catch {
    // Audio bersifat tambahan; kegagalan audio tidak menghentikan permainan.
  }
}

async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
}

function setText(selector: string, value: string): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (element) element.textContent = value;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("keydown", (event) => {
  if (!document.querySelector(".play-screen")) return;

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
  if (
    targetIndex >= 0 &&
    targetIndex <= 2 &&
    !inputLocked &&
    !session?.getSnapshot().paused &&
    !helpDialogController?.isOpen()
  ) {
    document.querySelectorAll<HTMLButtonElement>(".target-button")[targetIndex]?.click();
  }
});

document.addEventListener("visibilitychange", () => {
  if (
    document.hidden &&
    document.querySelector(".play-screen") &&
    session &&
    !session.getSnapshot().paused
  ) {
    pauseGame(true);
  }
});

renderSetup();

import "@gezy-games/design-system/base.css";
import { createGameSession, type GameSession } from "@gezy-games/game-core";
import { mathQuestions, phases, type Phase, type Question } from "@gezy-games/question-bank";
import "./styles.css";

type GameMode = "calm" | "practice" | "challenge";

interface PlayerProgress {
  xp: number;
  coins: number;
  bestStreak: number;
  sessions: number;
}

const storageKey = "gezy-games:math-archer:v1";
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

let selectedPhase: Phase = "A";
let selectedMode: GameMode = "calm";
let session: GameSession | null = null;
let currentQuestions: readonly Question[] = [];
let activeQuestionId = "";
let activeChoices: readonly string[] = [];
let streak = 0;
let hearts = 3;
let inputLocked = false;
let soundEnabled = true;
let timerId: number | null = null;
let deadline = 0;
let remainingMs = 0;
let progress = loadProgress();

function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { xp: 0, coins: 0, bestStreak: 0, sessions: 0 };
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    return {
      xp: Number.isFinite(parsed.xp) ? Number(parsed.xp) : 0,
      coins: Number.isFinite(parsed.coins) ? Number(parsed.coins) : 0,
      bestStreak: Number.isFinite(parsed.bestStreak) ? Number(parsed.bestStreak) : 0,
      sessions: Number.isFinite(parsed.sessions) ? Number(parsed.sessions) : 0,
    };
  } catch {
    return { xp: 0, coins: 0, bestStreak: 0, sessions: 0 };
  }
}

function saveProgress(): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    // Permainan tetap berjalan ketika penyimpanan browser tidak tersedia.
  }
}

const shuffle = <T>(values: readonly T[]): T[] => {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex] as T, output[index] as T];
  }
  return output;
};

const levelFromXp = (xp: number): number => Math.floor(xp / 1_000) + 1;

function renderSetup(): void {
  clearTimer();
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
          <p class="setup-note">5 sasaran · sekitar 3 menit · sentuh atau tombol 1–3</p>
        </section>
      </div>
    </main>
  `;

  document.querySelectorAll<HTMLButtonElement>("[data-phase]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedPhase = button.dataset.phase as Phase;
      renderSetup();
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMode = button.dataset.mode as GameMode;
      renderSetup();
    });
  });

  document.querySelector<HTMLButtonElement>(".start-button")?.addEventListener("click", startGame);
}

function startGame(): void {
  currentQuestions = mathQuestions.filter(
    (question) => question.phase === selectedPhase && question.status === "published",
  );
  if (currentQuestions.length === 0) throw new Error(`Belum ada soal untuk Fase ${selectedPhase}.`);

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

  app.innerHTML = `
    <main class="play-screen">
      <header class="play-hud">
        <a class="hud-brand" href="${portalUrl}" aria-label="Keluar ke Gezy Games">★ <span>Gezy Games</span></a>
        <div class="hud-stats">
          <div><span>⭐</span><p><small>XP</small><strong id="hud-xp">${progress.xp.toLocaleString("id-ID")}</strong></p></div>
          <div><span>💰</span><p><small>KOIN</small><strong id="hud-coins">${progress.coins.toLocaleString("id-ID")}</strong></p></div>
          <div><span>🔥</span><p><small>STREAK</small><strong id="hud-streak">0</strong></p></div>
          <div class="hearts-stat"><span>❤️</span><p><small>NYAWA</small><strong id="hud-hearts">${selectedMode === "challenge" ? "3" : "∞"}</strong></p></div>
          <div><span>🏆</span><p><small>LEVEL</small><strong id="hud-level">${levelFromXp(progress.xp)}</strong></p></div>
        </div>
        <div class="hud-actions">
          <button id="sound-button" type="button" aria-label="Matikan suara">🔊</button>
          <button id="fullscreen-button" type="button" aria-label="Layar penuh">⛶</button>
          <button id="pause-button" type="button" aria-label="Jeda permainan">Ⅱ</button>
        </div>
      </header>

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

      <div class="pause-overlay" id="pause-overlay" hidden>
        <div class="pause-card" role="dialog" aria-modal="true" aria-labelledby="pause-title">
          <span class="pause-icon">🌿</span>
          <h2 id="pause-title">Permainan dijeda</h2>
          <p>Tarik napas dulu. Waktu berhenti selama layar ini terbuka.</p>
          <button id="resume-button" type="button">Lanjutkan</button>
          <button id="quit-button" type="button">Kembali ke pengaturan</button>
        </div>
      </div>
    </main>
  `;

  document.querySelector<HTMLButtonElement>("#sound-button")?.addEventListener("click", toggleSound);
  document.querySelector<HTMLButtonElement>("#fullscreen-button")?.addEventListener("click", toggleFullscreen);
  document.querySelector<HTMLButtonElement>("#pause-button")?.addEventListener("click", pauseGame);
  document.querySelector<HTMLButtonElement>("#resume-button")?.addEventListener("click", resumeGame);
  document.querySelector<HTMLButtonElement>("#quit-button")?.addEventListener("click", renderSetup);
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
    activeChoices = shuffle(question.choices);
  }
  inputLocked = false;

  setText("#topic-label", `${selectedPhase === "Fondasi" ? "FASE FONDASI" : `FASE ${selectedPhase}`} · ${question.topic}`);
  setText("#question-progress", `Sasaran ${Math.min(snapshot.progress + 1, snapshot.target)} dari ${snapshot.target}`);
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
  playTone(260, 0.08, "triangle");
  await animateArrow(target);

  const answer = target.dataset.answer ?? "";
  const attempt = session.submitAnswer(answer);

  if (attempt.correct) {
    target.classList.add("is-hit");
    streak += 1;
    progress.xp += 100;
    progress.coins += 10 + Math.min(streak - 1, 5);
    progress.bestStreak = Math.max(progress.bestStreak, streak);
    updateHud();
    showFeedback(`🎯 Tepat! +100 XP · Streak ${streak}`, "success");
    playTone(620, 0.12, "sine");
    window.setTimeout(() => {
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
    window.setTimeout(() => finishGame(false), 1_200);
    return;
  }

  if (sameQuestion) {
    showFeedback("Belum tepat. Coba sasaran lain!", "error");
    window.setTimeout(() => {
      inputLocked = false;
      document.querySelector(".archer-character")?.classList.remove("is-shooting");
      document.querySelectorAll<HTMLButtonElement>(".target-button:not(.is-miss)").forEach((button) => {
        button.disabled = false;
      });
      startQuestionTimer(true);
    }, 900);
  } else {
    showFeedback(`Kita coba konsep ini lagi nanti. ${question.explanation}`, "error");
    window.setTimeout(() => {
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
    arrow.addEventListener("animationend", () => {
      arrow.remove();
      resolve();
    }, { once: true });
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
    window.setTimeout(() => finishGame(false), 1_200);
    return;
  }

  const sameQuestion = session.getSnapshot().currentQuestion?.id === question.id;
  window.setTimeout(() => {
    if (sameQuestion) {
      inputLocked = false;
      startQuestionTimer();
    } else {
      activeQuestionId = "";
      renderQuestion();
    }
  }, 1_100);
}

function pauseGame(): void {
  if (!session || session.getSnapshot().completed) return;
  session.pause();
  if (deadline) remainingMs = Math.max(0, deadline - Date.now());
  clearTimer();
  const overlay = document.querySelector<HTMLElement>("#pause-overlay");
  if (overlay) overlay.hidden = false;
  document.querySelector<HTMLButtonElement>("#resume-button")?.focus();
}

function resumeGame(): void {
  if (!session) return;
  session.resume();
  const overlay = document.querySelector<HTMLElement>("#pause-overlay");
  if (overlay) overlay.hidden = true;
  startQuestionTimer(true);
  document.querySelector<HTMLButtonElement>("#pause-button")?.focus();
}

function finishGame(victory: boolean): void {
  if (!session) return;
  clearTimer();
  progress.sessions += 1;
  saveProgress();
  const result = session.getResult();
  const accuracy = Math.round(result.accuracy * 100);
  const missedIds = new Set(result.attempts.filter((attempt) => !attempt.correct).map((attempt) => attempt.questionId));
  const review = currentQuestions.filter((question) => missedIds.has(question.id));

  app.innerHTML = `
    <main class="result-screen">
      <div class="result-card">
        <p class="result-eyebrow">${victory ? "MISI SELESAI" : "LATIHAN SELESAI"}</p>
        <div class="result-icon">${victory ? "🏆" : "🌱"}</div>
        <h1>${victory ? "Panahmu tepat sasaran!" : "Kemampuanmu terus tumbuh!"}</h1>
        <p>${victory ? "Semua konsep pada sesi ini sudah kamu kuasai." : "Coba lagi dengan mode Santai untuk menguasai sasaran yang tersisa."}</p>

        <div class="result-stats">
          <div><span>AKURASI</span><strong>${accuracy}%</strong></div>
          <div><span>DIKUASAI</span><strong>${result.masteredQuestions}/${result.targetQuestions}</strong></div>
          <div><span>STREAK TERBAIK</span><strong>${progress.bestStreak}</strong></div>
          <div><span>TOTAL XP</span><strong>${progress.xp.toLocaleString("id-ID")}</strong></div>
        </div>

        ${review.length > 0 ? `
          <details class="review-panel">
            <summary>Lihat pembahasan (${review.length})</summary>
            ${review.map((question) => `<article><strong>${escapeHtml(question.prompt)}</strong><p>${escapeHtml(question.explanation)}</p></article>`).join("")}
          </details>
        ` : '<p class="perfect-note">✨ Tidak ada konsep yang perlu diulang pada sesi ini.</p>'}

        <div class="result-actions">
          <button class="play-again-button" type="button">Main lagi</button>
          <a href="${portalUrl}">Kembali ke semua game</a>
        </div>
      </div>
    </main>
  `;

  document.querySelector<HTMLButtonElement>(".play-again-button")?.addEventListener("click", renderSetup);
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

function toggleSound(): void {
  soundEnabled = !soundEnabled;
  const button = document.querySelector<HTMLButtonElement>("#sound-button");
  if (button) {
    button.textContent = soundEnabled ? "🔊" : "🔇";
    button.setAttribute("aria-label", soundEnabled ? "Matikan suara" : "Nyalakan suara");
  }
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
  if (event.key === "Escape" && document.querySelector(".play-screen")) {
    const overlay = document.querySelector<HTMLElement>("#pause-overlay");
    if (overlay?.hidden) pauseGame();
    else resumeGame();
    return;
  }

  const targetIndex = Number(event.key) - 1;
  if (targetIndex >= 0 && targetIndex <= 3 && !inputLocked) {
    document.querySelectorAll<HTMLButtonElement>(".target-button")[targetIndex]?.click();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && document.querySelector(".play-screen") && session && !session.getSnapshot().paused) {
    pauseGame();
  }
});

renderSetup();

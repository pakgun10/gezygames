import "@gezy-games/design-system/base.css";
import "@gezy-games/game-shell/styles.css";
import { createGameSession, type GameSession } from "@gezy-games/game-core";
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
import { mathQuestions, type Phase, type Question } from "@gezy-games/question-bank";
import { createSessionReport, renderSessionReport } from "@gezy-games/session-report";
import {
  getPuzzleChallenge,
  puzzleQuestionsForPhase,
  type MatchPuzzle,
  type PuzzleChallenge,
  type SequencePuzzle,
} from "./puzzles";
import "./styles.css";

type PuzzlePhase = Exclude<Phase, "Fondasi">;

interface PuzzleProgress {
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

const phases: readonly PuzzlePhase[] = ["A", "B", "C", "D"];
const phaseDescriptions: Record<PuzzlePhase, string> = {
  A: "Kelas 1–2",
  B: "Kelas 3–4",
  C: "Kelas 5–6",
  D: "Kelas 7–9",
};
const initialPreferences = loadPlayerProgress().preferences;
const isPuzzlePhase = (value: string | undefined): value is PuzzlePhase =>
  value !== undefined && phases.includes(value as PuzzlePhase);

let selectedPhase: PuzzlePhase = isPuzzlePhase(initialPreferences.lastPhase)
  ? initialPreferences.lastPhase
  : "A";
let selectedTopic: string | null = null;
let playerNickname = initialPreferences.nickname;
let soundEnabled = initialPreferences.audioEnabled;
const progress: PuzzleProgress = { ...loadGameProgress("puzzle-quest") };

let session: GameSession | null = null;
let currentQuestions: readonly Question[] = [];
let activeChallenge: PuzzleChallenge | null = null;
let sequenceOrder: number[] = [];
let selectedMatchLeft: number | null = null;
let matchPairs: Array<readonly [number, number]> = [];
let inputLocked = false;
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
  saveGameProgress("puzzle-quest", { ...progress, lastPlayedAt: new Date().toISOString() });
};
const topicsForPhase = (phase: PuzzlePhase): readonly string[] => [
  ...new Set(puzzleQuestionsForPhase(mathQuestions, phase).map((question) => question.topic)),
];
const puzzleCountForSelection = (phase: PuzzlePhase, topic: string | null): number =>
  puzzleQuestionsForPhase(mathQuestions, phase, topic).length;

function renderSetup(): void {
  clearTransition();
  destroyDialogs();
  session = null;
  activeChallenge = null;
  const topics = topicsForPhase(selectedPhase);
  if (selectedTopic && !topics.includes(selectedTopic)) selectedTopic = null;
  const count = puzzleCountForSelection(selectedPhase, selectedTopic);

  app.innerHTML = `
    <main class="puzzle-setup">
      <header class="puzzle-header">
        <a class="puzzle-brand" href="${portalUrl}" aria-label="Kembali ke Gezy Games"><span aria-hidden="true">★</span><strong>Gezy</strong> Games</a>
        <a class="puzzle-back" href="${portalUrl}">← Semua game</a>
      </header>
      <div class="puzzle-setup-grid">
        <section class="puzzle-intro" aria-labelledby="puzzle-title">
          <p class="puzzle-eyebrow">LOGIKA · MATEMATIKA</p>
          <h1 id="puzzle-title"><span>Puzzle</span> Quest</h1>
          <p>Susun langkah, pasangkan konsep, dan buka pintu rahasia dengan cara berpikir yang tepat.</p>
          <div class="puzzle-preview" aria-hidden="true">
            <span class="preview-star star-one">✦</span><span class="preview-star star-two">✦</span>
            <span class="preview-moon">☾</span><span class="preview-cloud cloud-one"></span><span class="preview-cloud cloud-two"></span>
            <span class="preview-tower tower-one">▥</span><span class="preview-tower tower-two">▥</span>
            <span class="preview-door"><i></i></span><span class="preview-key">◆</span>
            <span class="preview-path"></span>
          </div>
          <ul class="puzzle-features"><li>✓ Susun langkah</li><li>✓ Pasangkan konsep</li><li>✓ Ramah sentuh & keyboard</li></ul>
        </section>
        <section class="puzzle-setup-card" aria-label="Pengaturan permainan">
          <div class="puzzle-stats">
            <div><span>LEVEL</span><strong>${levelFromXp(progress.xp)}</strong></div>
            <div><span>XP</span><strong>${progress.xp.toLocaleString("id-ID")}</strong></div>
            <div><span>KOIN</span><strong>${progress.coins.toLocaleString("id-ID")}</strong></div>
          </div>
          <label class="puzzle-name-field"><span>Nama penjelajah <small>(opsional)</small></span><input id="puzzle-nickname" type="text" maxlength="30" autocomplete="nickname" value="${escapeHtml(playerNickname)}" placeholder="Contoh: Bima" /></label>
          <fieldset><legend>Pilih fase belajar</legend><div class="puzzle-phase-options">${phases
            .map(
              (phase) =>
                `<button class="puzzle-phase-option${phase === selectedPhase ? " is-selected" : ""}" type="button" data-phase="${phase}" aria-pressed="${phase === selectedPhase}"><strong>${phase}</strong><span>Fase ${phase}</span><small>${phaseDescriptions[phase]}</small></button>`,
            )
            .join("")}</div></fieldset>
          <label class="puzzle-topic-field"><span>Pilih materi</span><select id="puzzle-topic"><option value="">Semua materi (${topics.length} topik)</option>${topics
            .map(
              (topic) =>
                `<option value="${escapeHtml(topic)}"${topic === selectedTopic ? " selected" : ""}>${escapeHtml(topic)}</option>`,
            )
            .join("")}</select></label>
          <button class="puzzle-primary-button" id="start-puzzle" type="button">Mulai memecahkan <span aria-hidden="true">→</span></button>
          <p class="puzzle-note">${Math.min(4, count)} pintu · sekitar 4 menit · ketuk kepingan untuk bermain</p>
        </section>
      </div>
      <footer class="puzzle-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved. ${renderPlatformVersion()}</footer>
    </main>
  `;

  document.querySelectorAll<HTMLButtonElement>("[data-phase]").forEach((button) =>
    button.addEventListener("click", () => {
      playerNickname =
        document.querySelector<HTMLInputElement>("#puzzle-nickname")?.value.trim() ??
        playerNickname;
      selectedPhase = button.dataset.phase as PuzzlePhase;
      selectedTopic = null;
      savePlayerPreferences({ nickname: playerNickname, lastPhase: selectedPhase, lastTopic: "" });
      renderSetup();
    }),
  );
  document
    .querySelector<HTMLSelectElement>("#puzzle-topic")
    ?.addEventListener("change", (event) => {
      selectedTopic = (event.currentTarget as HTMLSelectElement).value || null;
      renderSetup();
    });
  document
    .querySelector<HTMLButtonElement>("#start-puzzle")
    ?.addEventListener("click", startPuzzle);
}

function startPuzzle(): void {
  clearTransition();
  destroyDialogs();
  playerNickname =
    document.querySelector<HTMLInputElement>("#puzzle-nickname")?.value.trim().slice(0, 30) ??
    playerNickname;
  selectedTopic = document.querySelector<HTMLSelectElement>("#puzzle-topic")?.value || null;
  currentQuestions = puzzleQuestionsForPhase(mathQuestions, selectedPhase, selectedTopic);
  if (currentQuestions.length === 0)
    throw new Error(`Belum ada puzzle untuk Fase ${selectedPhase}.`);
  savePlayerPreferences({
    nickname: playerNickname,
    lastPhase: selectedPhase,
    lastTopic: selectedTopic ?? "",
  });
  session = createGameSession(currentQuestions, {
    questionCount: Math.min(4, currentQuestions.length),
    remedialGap: 2,
    pointsPerCorrectAnswer: 100,
    immediateRetries: 1,
  });
  activeChallenge = null;
  sequenceOrder = [];
  selectedMatchLeft = null;
  matchPairs = [];
  inputLocked = false;
  streak = 0;
  sessionFinished = false;

  app.innerHTML = `
    <main class="puzzle-screen">
      ${renderGameHud({
        brandHref: portalUrl,
        brandLabel: "Puzzle Quest",
        soundEnabled,
        stats: [
          { id: "puzzle-xp", icon: "⭐", label: "XP", value: progress.xp.toLocaleString("id-ID") },
          {
            id: "puzzle-coins",
            icon: "💎",
            label: "Koin",
            value: progress.coins.toLocaleString("id-ID"),
          },
          { id: "puzzle-doors", icon: "🚪", label: "Pintu", value: "0/4" },
          { id: "puzzle-streak", icon: "🔥", label: "Streak", value: "0" },
          {
            id: "puzzle-level",
            icon: "🏆",
            label: "Level",
            value: String(levelFromXp(progress.xp)),
          },
        ],
      })}
      <section class="puzzle-world" aria-label="Ruang teka-teki">
        <div class="puzzle-room-art" aria-hidden="true"><span class="room-window"></span><span class="room-lamp">✦</span><span class="room-vine vine-one"></span><span class="room-vine vine-two"></span><span class="room-floor"></span><div class="room-door" id="room-door"><span>?</span><i></i></div><span class="room-crystal crystal-one">◆</span><span class="room-crystal crystal-two">◆</span></div>
        <section class="puzzle-challenge-card" aria-labelledby="challenge-title">
          <div class="puzzle-challenge-meta"><span id="puzzle-topic-label"></span><span id="puzzle-progress-label"></span></div>
          <h1 id="challenge-title" tabindex="-1"></h1>
          <p class="puzzle-instruction" id="puzzle-instruction"></p>
          <div class="puzzle-source-question"><span>Soal misi</span><p id="puzzle-question" aria-live="polite"></p></div>
          <div id="puzzle-board" class="puzzle-board"></div>
          <div class="puzzle-actions"><button class="puzzle-secondary-button" id="reset-puzzle" type="button">↺ Atur ulang</button><button class="puzzle-check-button" id="check-puzzle" type="button">Periksa jawaban <span aria-hidden="true">→</span></button></div>
          <div class="puzzle-feedback" id="puzzle-feedback" role="status" aria-live="assertive"></div>
        </section>
        <div class="puzzle-tip"><span aria-hidden="true">💡</span><p><strong>Petunjuk:</strong> <span id="puzzle-tip-text">Baca soal, lalu cari hubungan antar kepingan.</span></p></div>
      </section>
      ${renderSessionDialogs({
        gameName: "Puzzle Quest",
        helpItems: [
          {
            icon: "🧩",
            title: "Susun kepingan",
            detail: "Ketuk kepingan sesuai urutan. Tombol angka juga dapat dipakai.",
          },
          {
            icon: "🔗",
            title: "Pasangkan konsep",
            detail: "Ketuk keping kiri lalu keping kanan. Tidak perlu menahan drag.",
          },
          {
            icon: "⌨️",
            title: "Gunakan keyboard",
            detail: "Tab dan Enter bekerja pada semua kepingan; P atau Escape untuk jeda.",
          },
        ],
      })}
    </main>
  `;
  const pauseOverlay = document.querySelector<HTMLElement>("#pause-overlay");
  const helpOverlay = document.querySelector<HTMLElement>("#help-overlay");
  if (!pauseOverlay || !helpOverlay) throw new Error("Dialog shell permainan tidak ditemukan.");
  pauseDialogController = createDialogController(pauseOverlay, { onEscape: resumePuzzle });
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
    ?.addEventListener("click", pausePuzzle);
  document
    .querySelector<HTMLButtonElement>("#resume-button")
    ?.addEventListener("click", resumePuzzle);
  document.querySelector<HTMLButtonElement>("#quit-button")?.addEventListener("click", quitPuzzle);
  document
    .querySelector<HTMLButtonElement>("#close-help-button")
    ?.addEventListener("click", closeHelp);
  document
    .querySelector<HTMLButtonElement>("#reset-puzzle")
    ?.addEventListener("click", resetPuzzle);
  document
    .querySelector<HTMLButtonElement>("#check-puzzle")
    ?.addEventListener("click", checkPuzzle);
  renderChallenge();
}

function renderChallenge(): void {
  if (!session) return;
  const snapshot = session.getSnapshot();
  if (snapshot.completed || !snapshot.currentQuestion) {
    finishPuzzle();
    return;
  }
  const question = snapshot.currentQuestion;
  const challenge = getPuzzleChallenge(question.id);
  if (!challenge) throw new Error(`Puzzle untuk soal ${question.id} tidak ditemukan.`);
  activeChallenge = challenge;
  sequenceOrder = [];
  selectedMatchLeft = null;
  matchPairs = [];
  inputLocked = false;
  setText("#puzzle-topic-label", `FASE ${selectedPhase} · ${question.topic}`);
  setText(
    "#puzzle-progress-label",
    `Pintu ${Math.min(snapshot.progress + 1, snapshot.target)} dari ${snapshot.target}`,
  );
  setText("#challenge-title", challenge.title);
  setText("#puzzle-instruction", challenge.instruction);
  setText("#puzzle-question", question.prompt);
  setText(
    "#puzzle-tip-text",
    challenge.kind === "sequence"
      ? "Urutan membuat jalan terbuka."
      : "Setiap pasangan yang tepat menyalakan kristal.",
  );
  updateDoor(snapshot.progress, snapshot.target);
  updateHud();
  renderBoard();
  hideFeedback();
  document.querySelector<HTMLElement>("#challenge-title")?.focus({ preventScroll: true });
}

function renderBoard(): void {
  const board = document.querySelector<HTMLElement>("#puzzle-board");
  if (!board || !activeChallenge) return;
  board.innerHTML =
    activeChallenge.kind === "sequence"
      ? renderSequenceBoard(activeChallenge)
      : renderMatchBoard(activeChallenge);
  if (activeChallenge.kind === "sequence") {
    board
      .querySelectorAll<HTMLButtonElement>("[data-piece-index]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          chooseSequencePiece(Number(button.dataset.pieceIndex)),
        ),
      );
  } else {
    board
      .querySelectorAll<HTMLButtonElement>("[data-left-index]")
      .forEach((button) =>
        button.addEventListener("click", () => chooseMatchLeft(Number(button.dataset.leftIndex))),
      );
    board
      .querySelectorAll<HTMLButtonElement>("[data-right-index]")
      .forEach((button) =>
        button.addEventListener("click", () => chooseMatchRight(Number(button.dataset.rightIndex))),
      );
  }
}

function renderSequenceBoard(challenge: SequencePuzzle): string {
  const selected = new Set(sequenceOrder);
  const slots =
    sequenceOrder.length === 0
      ? `<span class="sequence-empty">Pilih kepingan di bawah untuk mengisi jalan</span>`
      : sequenceOrder
          .map(
            (pieceIndex, index) =>
              `<span class="sequence-slot"><small>${index + 1}</small>${escapeHtml(challenge.pieces[pieceIndex] ?? "")}</span>`,
          )
          .join("");
  const pieces = challenge.pieces
    .map(
      (piece, index) =>
        `<button class="sequence-piece${selected.has(index) ? " is-used" : ""}" type="button" data-piece-index="${index}" ${selected.has(index) ? "disabled" : ""} aria-label="Keping ${index + 1}: ${escapeHtml(piece)}"><span>${index + 1}</span><strong>${escapeHtml(piece)}</strong></button>`,
    )
    .join("");
  return `<div class="sequence-layout"><div class="sequence-path" aria-label="Urutan pilihanmu">${slots}</div><div class="sequence-pieces" aria-label="Kepingan puzzle">${pieces}</div></div>`;
}

function renderMatchBoard(challenge: MatchPuzzle): string {
  const matchedLeft = new Set(matchPairs.map(([leftIndex]) => leftIndex));
  const matchedRight = new Set(matchPairs.map(([, rightIndex]) => rightIndex));
  const left = challenge.left
    .map(
      (item, index) =>
        `<button class="match-piece match-piece--left${selectedMatchLeft === index ? " is-selected" : ""}${matchedLeft.has(index) ? " is-matched" : ""}" type="button" data-left-index="${index}" ${matchedLeft.has(index) ? "disabled" : ""} aria-pressed="${selectedMatchLeft === index}"><span>${index + 1}</span><strong>${escapeHtml(item)}</strong></button>`,
    )
    .join("");
  const right = challenge.right
    .map(
      (item, index) =>
        `<button class="match-piece match-piece--right${matchedRight.has(index) ? " is-matched" : ""}" type="button" data-right-index="${index}" ${matchedRight.has(index) ? "disabled" : ""}><span>${String.fromCharCode(65 + index)}</span><strong>${escapeHtml(item)}</strong></button>`,
    )
    .join("");
  return `<div class="match-layout"><div class="match-column"><h3>Keping kiri</h3>${left}</div><div class="match-connector" aria-hidden="true">↔</div><div class="match-column"><h3>Keping kanan</h3>${right}</div></div><p class="match-status" aria-live="polite">${matchPairs.length} dari ${challenge.pairs.length} pasangan terhubung</p>`;
}

function chooseSequencePiece(index: number): void {
  if (inputLocked || sequenceOrder.includes(index)) return;
  sequenceOrder.push(index);
  renderBoard();
  playTone(430, 0.07, "sine");
}

function chooseMatchLeft(index: number): void {
  if (inputLocked || matchPairs.some(([leftIndex]) => leftIndex === index)) return;
  selectedMatchLeft = index;
  showFeedback("Sekarang pilih pasangan di kolom kanan.", "neutral");
  renderBoard();
}

function chooseMatchRight(index: number): void {
  if (inputLocked || matchPairs.some(([, rightIndex]) => rightIndex === index)) return;
  if (selectedMatchLeft === null) {
    showFeedback("Pilih satu keping dari kolom kiri dulu.", "error");
    return;
  }
  matchPairs.push([selectedMatchLeft, index]);
  selectedMatchLeft = null;
  renderBoard();
  playTone(430, 0.07, "sine");
}

function resetPuzzle(): void {
  if (inputLocked) return;
  sequenceOrder = [];
  selectedMatchLeft = null;
  matchPairs = [];
  hideFeedback();
  renderBoard();
}

function checkPuzzle(): void {
  if (!session || !activeChallenge || inputLocked) return;
  const solved =
    activeChallenge.kind === "sequence"
      ? isSequenceSolved(activeChallenge)
      : isMatchSolved(activeChallenge);
  submitPuzzle(solved);
}

function isSequenceSolved(challenge: SequencePuzzle): boolean {
  return (
    sequenceOrder.length === challenge.correctOrder.length &&
    sequenceOrder.every((value, index) => value === challenge.correctOrder[index])
  );
}

function isMatchSolved(challenge: MatchPuzzle): boolean {
  return (
    challenge.pairs.length === matchPairs.length &&
    challenge.pairs.every(([leftIndex, rightIndex]) =>
      matchPairs.some(
        ([selectedLeft, selectedRight]) =>
          selectedLeft === leftIndex && selectedRight === rightIndex,
      ),
    )
  );
}

function submitPuzzle(solved: boolean): void {
  if (!session || !activeChallenge || inputLocked) return;
  const question = session.getSnapshot().currentQuestion;
  if (!question) return;
  inputLocked = true;
  disablePuzzleControls();
  const wrongAnswer =
    question.choices.find((choice) => choice !== question.correctAnswer) ?? "Susunan belum tepat";
  const attempt = session.submitAnswer(solved ? question.correctAnswer : wrongAnswer);
  if (attempt.correct) {
    streak += 1;
    progress.xp += 120;
    progress.coins += 12 + Math.min(streak - 1, 5);
    progress.bestStreak = Math.max(progress.bestStreak, streak);
    updateHud();
    updateDoor(session.getSnapshot().progress, session.getSnapshot().target, true);
    showFeedback(`✨ Tepat! Pintu terbuka. +120 XP · Streak ${streak}`, "success");
    playTone(720, 0.18, "sine");
    scheduleTransition(() => {
      renderChallenge();
    }, 950);
    return;
  }

  streak = 0;
  updateHud();
  playTone(150, 0.16, "sawtooth");
  const sameQuestion = session.getSnapshot().currentQuestion?.id === question.id;
  if (sameQuestion) {
    showFeedback(`🌱 Belum tepat. Coba lagi: ${question.explanation}`, "error");
    scheduleTransition(() => {
      inputLocked = false;
      sequenceOrder = [];
      selectedMatchLeft = null;
      matchPairs = [];
      renderBoard();
    }, 1_150);
  } else {
    showFeedback(
      `🔎 Belum tepat. Konsep ini akan muncul lagi setelah beberapa keping lain.`,
      "error",
    );
    scheduleTransition(() => {
      renderChallenge();
    }, 1_450);
  }
}

function disablePuzzleControls(): void {
  document
    .querySelectorAll<HTMLButtonElement>("#puzzle-board button, #check-puzzle, #reset-puzzle")
    .forEach((button) => (button.disabled = true));
}

function updateHud(): void {
  setText("#puzzle-xp", progress.xp.toLocaleString("id-ID"));
  setText("#puzzle-coins", progress.coins.toLocaleString("id-ID"));
  setText("#puzzle-streak", String(streak));
  setText("#puzzle-level", String(levelFromXp(progress.xp)));
  const snapshot = session?.getSnapshot();
  if (snapshot) setText("#puzzle-doors", `${snapshot.progress}/${snapshot.target}`);
}

function updateDoor(progressCount: number, target: number, opening = false): void {
  const door = document.querySelector<HTMLElement>("#room-door");
  if (!door) return;
  door.style.setProperty("--door-progress", `${Math.round((progressCount / target) * 100)}%`);
  if (opening) {
    door.classList.remove("is-opening");
    void door.offsetWidth;
    door.classList.add("is-opening");
  }
}

function finishPuzzle(): void {
  if (!session || sessionFinished) return;
  sessionFinished = true;
  clearTransition();
  session.finish();
  progress.sessions += 1;
  saveProgress();
  const report = createSessionReport(session.getResult(), currentQuestions);
  const greeting = playerNickname ? `, ${escapeHtml(playerNickname)}` : "";
  destroyDialogs();
  app.innerHTML = `<main class="puzzle-result" aria-labelledby="puzzle-result-title"><div class="puzzle-result-card"><p class="puzzle-result-eyebrow">PINTU TERAKHIR TERBUKA</p><div class="puzzle-result-icon">🏆</div><h1 id="puzzle-result-title" tabindex="-1">Kamu memecahkan semua teka-teki${greeting}!</h1><p>Setiap kepingan yang kamu susun membantu membuka jalan belajar berikutnya.</p>${renderSessionReport(report)}<section class="puzzle-rewards"><h2>Progres permainan</h2><div><p><span>TOTAL XP</span><strong>${progress.xp.toLocaleString("id-ID")}</strong></p><p><span>TOTAL KOIN</span><strong>${progress.coins.toLocaleString("id-ID")}</strong></p><p><span>STREAK TERBAIK</span><strong>${progress.bestStreak}</strong></p></div></section><div class="puzzle-result-actions"><button class="puzzle-primary-button" id="retry-puzzle" type="button">Pecahkan lagi</button><button class="puzzle-secondary-button" id="change-puzzle" type="button">Ganti fase</button><a href="${portalUrl}">Kembali ke semua game</a></div><p class="puzzle-result-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved. ${renderPlatformVersion()}</p></div></main>`;
  document
    .querySelector<HTMLButtonElement>("#retry-puzzle")
    ?.addEventListener("click", startPuzzle);
  document
    .querySelector<HTMLButtonElement>("#change-puzzle")
    ?.addEventListener("click", renderSetup);
  document.querySelector<HTMLElement>("#puzzle-result-title")?.focus({ preventScroll: true });
}

function showFeedback(message: string, kind: "success" | "error" | "neutral"): void {
  const feedback = document.querySelector<HTMLElement>("#puzzle-feedback");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `puzzle-feedback is-visible puzzle-feedback--${kind}`;
}

function hideFeedback(): void {
  const feedback = document.querySelector<HTMLElement>("#puzzle-feedback");
  if (feedback) {
    feedback.textContent = "";
    feedback.className = "puzzle-feedback";
  }
}

function pausePuzzle(): void {
  if (!session || session.getSnapshot().completed || inputLocked) return;
  session.pause();
  pauseDialogController?.open(document.querySelector<HTMLButtonElement>("#pause-button"));
}

function resumePuzzle(): void {
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

function quitPuzzle(): void {
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
  if (!document.querySelector(".puzzle-screen")) return;
  if (event.key.toLowerCase() === "p") {
    if (pauseDialogController?.isOpen()) resumePuzzle();
    else pausePuzzle();
    return;
  }
  if (
    event.key === "Escape" &&
    !pauseDialogController?.isOpen() &&
    !helpDialogController?.isOpen()
  ) {
    pausePuzzle();
    return;
  }
  if (inputLocked || session?.getSnapshot().paused || helpDialogController?.isOpen()) return;
  if (activeChallenge?.kind === "sequence") {
    const index = Number(event.key) - 1;
    if (index >= 0 && index < activeChallenge.pieces.length) {
      event.preventDefault();
      document.querySelector<HTMLButtonElement>(`[data-piece-index="${index}"]`)?.click();
    }
  } else if (activeChallenge?.kind === "match") {
    const leftIndex = Number(event.key) - 1;
    const rightIndex = ["q", "w", "e", "r"].indexOf(event.key.toLowerCase());
    if (leftIndex >= 0 && leftIndex < activeChallenge.left.length) {
      event.preventDefault();
      document.querySelector<HTMLButtonElement>(`[data-left-index="${leftIndex}"]`)?.click();
    } else if (rightIndex >= 0) {
      event.preventDefault();
      document.querySelector<HTMLButtonElement>(`[data-right-index="${rightIndex}"]`)?.click();
    }
  }
});

document.addEventListener("visibilitychange", () => {
  if (
    document.hidden &&
    document.querySelector(".puzzle-screen") &&
    session &&
    !session.getSnapshot().paused
  )
    pausePuzzle();
});

renderSetup();

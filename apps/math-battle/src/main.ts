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

type BattlePhase = Exclude<Phase, "Fondasi">;

interface BattleProgress {
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
const battlePhases: readonly BattlePhase[] = phases.filter(
  (phase): phase is BattlePhase => phase !== "Fondasi",
);
const phaseDescriptions: Record<BattlePhase, string> = {
  A: "Kelas 1–2",
  B: "Kelas 3–4",
  C: "Kelas 5–6",
  D: "Kelas 7–9",
};

let selectedPhase: BattlePhase = "A";
let selectedTopic: string | null = null;
let playerNickname = loadPlayerProgress().preferences.nickname;
let soundEnabled = loadPlayerProgress().preferences.audioEnabled;
const progress: BattleProgress = { ...loadGameProgress("math-battle") };
let session: GameSession | null = null;
let currentQuestions: readonly Question[] = [];
let activeQuestionId = "";
let activeChoices: readonly string[] = [];
let inputLocked = false;
let streak = 0;
let playerHealth = 100;
let enemyHealth = 100;
let playerEnergy = 0;
let enemyAttacks = 0;
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
  saveGameProgress("math-battle", { ...progress, lastPlayedAt: new Date().toISOString() });
};
const topicsForPhase = (phase: BattlePhase): readonly string[] => [
  ...new Set(
    mathQuestions
      .filter((question) => question.phase === phase && question.status === "published")
      .map((question) => question.topic),
  ),
];

function renderSetup(): void {
  clearTransition();
  destroyDialogs();
  session = null;
  const topics = topicsForPhase(selectedPhase);
  if (selectedTopic && !topics.includes(selectedTopic)) selectedTopic = null;
  const availableQuestionCount = selectQuestions(mathQuestions, {
    phase: selectedPhase,
    ...(selectedTopic ? { topic: selectedTopic } : {}),
  }).length;
  app.innerHTML = `
    <main class="battle-setup">
      <header class="battle-header"><a class="battle-brand" href="${portalUrl}" aria-label="Kembali ke Gezy Games"><span aria-hidden="true">★</span><strong>Gezy</strong> Games</a><a class="battle-back" href="${portalUrl}">← Semua game</a></header>
      <div class="battle-setup-grid">
        <section class="battle-intro" aria-labelledby="battle-title">
          <p class="battle-eyebrow">DUEL · STRATEGI · MATEMATIKA</p>
          <h1 id="battle-title"><span>Math</span> Battle</h1>
          <p>Hadapi lawan dalam duel bergiliran. Jawaban tepat menjadi serangan, jawaban salah membuka pembahasan untuk giliran berikutnya.</p>
          <div class="battle-preview" aria-hidden="true"><span class="preview-moon">✦</span><span class="preview-cloud cloud-one"></span><span class="preview-cloud cloud-two"></span><span class="preview-hero">🛡️</span><span class="preview-vs">VS</span><span class="preview-enemy">🐲</span><span class="preview-spark spark-one">✦</span><span class="preview-spark spark-two">✦</span></div>
          <ul class="battle-features"><li>✓ Giliran terlihat jelas</li><li>✓ Serang, bertahan, pulihkan</li><li>✓ Mode santai tanpa game over</li></ul>
        </section>
        <section class="battle-setup-card" aria-label="Pengaturan permainan">
          <div class="battle-stats"><div><span>LEVEL</span><strong>${levelFromXp(progress.xp)}</strong></div><div><span>XP</span><strong>${progress.xp.toLocaleString("id-ID")}</strong></div><div><span>STREAK</span><strong>${progress.bestStreak}</strong></div></div>
          <label class="battle-name-field"><span>Nama petarung <small>(opsional)</small></span><input id="battle-nickname" type="text" maxlength="30" autocomplete="nickname" value="${escapeHtml(playerNickname)}" placeholder="Contoh: Bima" /></label>
          <fieldset><legend>Pilih fase belajar</legend><div class="battle-phase-options">${battlePhases
            .map(
              (phase) =>
                `<button class="battle-phase-option${phase === selectedPhase ? " is-selected" : ""}" type="button" data-phase="${phase}" aria-pressed="${phase === selectedPhase}"><strong>${phase}</strong><span>Fase ${phase}</span><small>${phaseDescriptions[phase]}</small></button>`,
            )
            .join("")}</div></fieldset>
          <label class="battle-topic-field"><span>Pilih materi</span><select id="battle-topic"><option value="">Semua materi (${topics.length} topik)</option>${topics
            .map(
              (topic) =>
                `<option value="${escapeHtml(topic)}"${topic === selectedTopic ? " selected" : ""}>${escapeHtml(topic)}</option>`,
            )
            .join("")}</select></label>
          <button class="battle-primary-button" id="start-battle" type="button">Mulai duel <span aria-hidden="true">→</span></button>
          <p class="battle-note">${Math.min(4, availableQuestionCount)} ronde · sekitar 3 menit · tombol 1–3</p>
        </section>
      </div>
      <footer class="battle-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved. ${renderPlatformVersion()}</footer>
    </main>
  `;
  document.querySelectorAll<HTMLButtonElement>("[data-phase]").forEach((button) =>
    button.addEventListener("click", () => {
      playerNickname =
        document.querySelector<HTMLInputElement>("#battle-nickname")?.value.trim() ??
        playerNickname;
      selectedPhase = button.dataset.phase as BattlePhase;
      selectedTopic = null;
      savePlayerPreferences({ nickname: playerNickname, lastPhase: selectedPhase, lastTopic: "" });
      renderSetup();
    }),
  );
  document
    .querySelector<HTMLSelectElement>("#battle-topic")
    ?.addEventListener("change", (event) => {
      selectedTopic = (event.currentTarget as HTMLSelectElement).value || null;
      renderSetup();
    });
  document
    .querySelector<HTMLButtonElement>("#start-battle")
    ?.addEventListener("click", startBattle);
}

function startBattle(): void {
  clearTransition();
  destroyDialogs();
  playerNickname =
    document.querySelector<HTMLInputElement>("#battle-nickname")?.value.trim().slice(0, 30) ??
    playerNickname;
  selectedTopic = document.querySelector<HTMLSelectElement>("#battle-topic")?.value || null;
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
    questionCount: Math.min(4, currentQuestions.length),
    remedialGap: 1,
    pointsPerCorrectAnswer: 100,
    immediateRetries: 1,
  });
  activeQuestionId = "";
  activeChoices = [];
  inputLocked = false;
  streak = 0;
  playerHealth = 100;
  enemyHealth = 100;
  playerEnergy = 0;
  enemyAttacks = 0;
  sessionFinished = false;
  app.innerHTML = `
    <main class="battle-screen">
      ${renderGameHud({
        brandHref: portalUrl,
        brandLabel: "Math Battle",
        soundEnabled,
        stats: [
          { id: "battle-xp", icon: "⭐", label: "XP", value: progress.xp.toLocaleString("id-ID") },
          {
            id: "battle-coins",
            icon: "💰",
            label: "Koin",
            value: progress.coins.toLocaleString("id-ID"),
          },
          { id: "battle-round", icon: "⚔️", label: "Ronde", value: "0/4" },
          { id: "battle-streak", icon: "🔥", label: "Streak", value: "0" },
          {
            id: "battle-level",
            icon: "🏆",
            label: "Level",
            value: String(levelFromXp(progress.xp)),
          },
        ],
      })}
      <section class="battle-arena" aria-label="Arena duel Math Battle">
        <div class="battle-turn" id="battle-turn" role="status" aria-live="polite">GILIRANMU · PILIH SERANGAN</div>
        <div class="battle-duel">
          <section class="fighter-card fighter-card--player" aria-label="Petarung pemain"><div class="fighter-avatar">🛡️</div><div class="fighter-info"><span>PEJUANG</span><strong id="player-name">${escapeHtml(playerNickname || "Kamu")}</strong><div class="health-label"><span>HP</span><b id="player-health-label">100%</b></div><div class="health-track"><i id="player-health-fill"></i></div><div class="energy-track" aria-label="Energi serangan"><i id="player-energy-fill"></i></div><small>Energi serangan</small></div></section>
          <div class="duel-vs" aria-hidden="true"><span>VS</span><i>⚡</i></div>
          <section class="fighter-card fighter-card--enemy" aria-label="Lawan naga"><div class="fighter-avatar">🐲</div><div class="fighter-info"><span>LAWAN AWAL</span><strong>Drako</strong><div class="health-label"><span>HP</span><b id="enemy-health-label">100%</b></div><div class="health-track health-track--enemy"><i id="enemy-health-fill"></i></div><small id="enemy-status">Menunggu seranganmu</small></div></section>
        </div>
        <section class="battle-question-card" aria-labelledby="battle-question-title"><div class="battle-question-meta"><span id="battle-topic-label"></span><span id="battle-progress-label"></span></div><h1 id="battle-question-title" tabindex="-1">Pilih jawaban untuk menyerang</h1><p id="battle-question" aria-live="polite"></p><div id="battle-choices" class="battle-choices" aria-label="Pilihan serangan"></div><div class="battle-feedback" id="battle-feedback" role="status" aria-live="assertive"></div></section>
        <div class="battle-log" id="battle-log" aria-live="polite"><span>📜 Catatan duel</span><p>Drako menunggu langkah pertamamu.</p></div>
      </section>
      ${renderSessionDialogs({
        gameName: "Math Battle",
        helpItems: [
          {
            icon: "⚔️",
            title: "Serang dengan jawaban",
            detail: "Jawaban benar mengurangi HP lawan dan menambah energi serangan.",
          },
          {
            icon: "🛡️",
            title: "Pertahankan duel",
            detail: "Jawaban salah memberi pembahasan dan serangan lawan yang ringan.",
          },
          {
            icon: "⌨️",
            title: "Gunakan keyboard",
            detail: "Tombol 1–3 memilih jawaban; P atau Escape membuka jeda.",
          },
        ],
      })}
    </main>
  `;
  const pauseOverlay = document.querySelector<HTMLElement>("#pause-overlay");
  const helpOverlay = document.querySelector<HTMLElement>("#help-overlay");
  if (!pauseOverlay || !helpOverlay) throw new Error("Dialog shell permainan tidak ditemukan.");
  pauseDialogController = createDialogController(pauseOverlay, { onEscape: resumeBattle });
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
    ?.addEventListener("click", pauseBattle);
  document
    .querySelector<HTMLButtonElement>("#resume-button")
    ?.addEventListener("click", resumeBattle);
  document.querySelector<HTMLButtonElement>("#quit-button")?.addEventListener("click", quitBattle);
  document
    .querySelector<HTMLButtonElement>("#close-help-button")
    ?.addEventListener("click", closeHelp);
  renderQuestion();
}

function renderQuestion(): void {
  if (!session) return;
  const snapshot = session.getSnapshot();
  if (snapshot.completed || !snapshot.currentQuestion) {
    finishBattle();
    return;
  }
  const question = snapshot.currentQuestion;
  if (activeQuestionId !== question.id) {
    activeQuestionId = question.id;
    activeChoices = shuffleQuestionChoices(question);
  }
  inputLocked = false;
  setText("#battle-topic-label", `FASE ${selectedPhase} · ${question.topic}`);
  setText(
    "#battle-progress-label",
    `Ronde ${Math.min(snapshot.progress + 1, snapshot.target)} dari ${snapshot.target}`,
  );
  setText("#battle-question", question.prompt);
  setText("#battle-turn", "GILIRANMU · PILIH SERANGAN");
  setText("#enemy-status", "Menunggu seranganmu");
  updateBattleScene();
  renderChoices();
  hideFeedback();
  document.querySelector<HTMLElement>("#battle-question-title")?.focus({ preventScroll: true });
}

function renderChoices(): void {
  const choices = document.querySelector<HTMLElement>("#battle-choices");
  if (!choices) return;
  choices.innerHTML = activeChoices
    .map(
      (choice, index) =>
        `<button class="battle-choice" type="button" data-choice-index="${index}" aria-label="Serangan ${index + 1}: ${escapeHtml(choice)}"><span>${index + 1}</span><strong>${escapeHtml(choice)}</strong></button>`,
    )
    .join("");
  choices
    .querySelectorAll<HTMLButtonElement>("[data-choice-index]")
    .forEach((button) =>
      button.addEventListener("click", () => chooseAnswer(Number(button.dataset.choiceIndex))),
    );
}

function chooseAnswer(index: number): void {
  if (inputLocked || !session) return;
  const answer = activeChoices[index];
  if (answer === undefined) return;
  const question = session.getSnapshot().currentQuestion;
  if (!question) return;
  inputLocked = true;
  document
    .querySelectorAll<HTMLButtonElement>(".battle-choice")
    .forEach((button) => (button.disabled = true));
  const attempt = session.submitAnswer(answer);
  if (attempt.correct) {
    streak += 1;
    const damage = 25;
    enemyHealth = Math.max(0, enemyHealth - damage);
    playerEnergy = Math.min(100, playerEnergy + 25);
    progress.xp += 120;
    progress.coins += 10 + Math.min(streak - 1, 5);
    progress.bestStreak = Math.max(progress.bestStreak, streak);
    saveProgress();
    setText("#battle-turn", "SERANGAN BERHASIL · LAWAN TERKENA");
    setText("#enemy-status", `−${damage} HP · Drako terdorong mundur`);
    setBattleLog(`⚔️ Jawaban tepat! Seranganmu mengurangi ${damage} HP Drako.`);
    showFeedback(`✨ Tepat! −${damage} HP lawan · +120 XP · Streak ${streak}`, "success");
    updateBattleScene();
    playTone(720, 0.18, "sine");
    scheduleTransition(renderQuestion, 1_050);
    return;
  }
  streak = 0;
  enemyAttacks += 1;
  playerHealth = Math.max(30, playerHealth - 12);
  setText("#battle-turn", "GILIRAN LAWAN · BERTAHAN");
  setText("#enemy-status", "Drako menyerang ringan");
  setBattleLog(`🛡️ Drako membalas dengan serangan ringan. HP-mu berkurang 12%.`);
  updateBattleScene();
  playTone(150, 0.16, "sawtooth");
  const sameQuestion = session.getSnapshot().currentQuestion?.id === question.id;
  showFeedback(
    sameQuestion
      ? `🌱 Belum tepat. ${question.explanation}`
      : "🔎 Belum tepat. Pembahasan tersimpan di laporan duel.",
    "error",
  );
  scheduleTransition(
    () => {
      if (sameQuestion) {
        inputLocked = false;
        setText("#battle-turn", "GILIRANMU · COBA SERANG LAGI");
        renderChoices();
      } else renderQuestion();
    },
    sameQuestion ? 1_250 : 1_550,
  );
}

function updateBattleScene(): void {
  setText("#battle-xp", progress.xp.toLocaleString("id-ID"));
  setText("#battle-coins", progress.coins.toLocaleString("id-ID"));
  setText("#battle-streak", String(streak));
  setText("#battle-level", String(levelFromXp(progress.xp)));
  const snapshot = session?.getSnapshot();
  if (snapshot) setText("#battle-round", `${snapshot.progress}/${snapshot.target}`);
  const playerFill = document.querySelector<HTMLElement>("#player-health-fill");
  const enemyFill = document.querySelector<HTMLElement>("#enemy-health-fill");
  const energyFill = document.querySelector<HTMLElement>("#player-energy-fill");
  if (playerFill) playerFill.style.width = `${playerHealth}%`;
  if (enemyFill) enemyFill.style.width = `${enemyHealth}%`;
  if (energyFill) energyFill.style.width = `${playerEnergy}%`;
  setText("#player-health-label", `${playerHealth}%`);
  setText("#enemy-health-label", `${enemyHealth}%`);
}

function setBattleLog(message: string): void {
  const log = document.querySelector<HTMLElement>("#battle-log");
  if (!log) return;
  log.innerHTML = `<span>📜 Catatan duel</span><p>${escapeHtml(message)}</p>`;
}

function finishBattle(): void {
  if (!session || sessionFinished) return;
  sessionFinished = true;
  clearTransition();
  session.finish();
  const victory = enemyHealth <= 0;
  progress.sessions += 1;
  if (victory) {
    progress.xp += 180;
    progress.coins += 45;
  }
  saveProgress();
  const report = createSessionReport(session.getResult(), currentQuestions);
  const title = victory ? "Drako berhasil dikalahkan!" : "Duel selesai, pejuang!";
  const reward = victory
    ? "🏆 Achievement terbuka: Penakluk Pertama · +180 XP · +45 koin"
    : "🌱 Latihan selesai. Coba lagi untuk mengalahkan Drako dengan serangan yang lebih tepat.";
  destroyDialogs();
  app.innerHTML = `<main class="battle-result"><div class="battle-result-card"><p class="battle-result-eyebrow">${victory ? "KEMENANGAN DUEL" : "LAPORAN DUEL"}</p><div class="battle-result-icon">${victory ? "🏆" : "🛡️"}</div><h1 id="battle-result-title" tabindex="-1">${title}${playerNickname ? `, ${escapeHtml(playerNickname)}` : ""}</h1><p>${reward}</p>${renderSessionReport(report)}<section class="battle-summary"><div><span>HP LAWAN</span><strong>${enemyHealth}%</strong></div><div><span>SERANGAN LAWAN</span><strong>${enemyAttacks}</strong></div><div><span>STREAK TERBAIK</span><strong>${progress.bestStreak}</strong></div></section><div class="battle-result-actions"><button class="battle-primary-button" id="retry-battle" type="button">Duel lagi</button><button class="battle-secondary-button" id="change-battle" type="button">Ganti fase</button><a href="${portalUrl}">Kembali ke semua game</a></div><p class="battle-result-footer">© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved. ${renderPlatformVersion()}</p></div></main>`;
  document
    .querySelector<HTMLButtonElement>("#retry-battle")
    ?.addEventListener("click", startBattle);
  document
    .querySelector<HTMLButtonElement>("#change-battle")
    ?.addEventListener("click", renderSetup);
  document.querySelector<HTMLElement>("#battle-result-title")?.focus({ preventScroll: true });
}

function showFeedback(message: string, kind: "success" | "error"): void {
  const feedback = document.querySelector<HTMLElement>("#battle-feedback");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `battle-feedback is-visible battle-feedback--${kind}`;
}

function hideFeedback(): void {
  const feedback = document.querySelector<HTMLElement>("#battle-feedback");
  if (feedback) {
    feedback.textContent = "";
    feedback.className = "battle-feedback";
  }
}

function pauseBattle(): void {
  if (!session || session.getSnapshot().completed || inputLocked) return;
  session.pause();
  pauseDialogController?.open(document.querySelector<HTMLButtonElement>("#pause-button"));
}

function resumeBattle(): void {
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

function quitBattle(): void {
  if (
    !session ||
    window.confirm("Kembali ke persiapan? Duel ini tidak dicatat sebagai sesi selesai.")
  ) {
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
  if (!document.querySelector(".battle-screen")) return;
  if (event.key.toLowerCase() === "p") {
    if (pauseDialogController?.isOpen()) resumeBattle();
    else pauseBattle();
    return;
  }
  if (
    event.key === "Escape" &&
    !pauseDialogController?.isOpen() &&
    !helpDialogController?.isOpen()
  ) {
    pauseBattle();
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
    document.querySelector(".battle-screen") &&
    session &&
    !session.getSnapshot().paused
  )
    pauseBattle();
});

renderSetup();

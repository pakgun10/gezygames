import "@gezy-games/design-system/base.css";
import { games, subjects, type GameCatalogItem, type SubjectFilter } from "@gezy-games/catalog";
import { renderPlatformVersion } from "@gezy-games/game-shell";
import { clearPlayerProgress, loadGameProgress, loadPlayerProgress } from "@gezy-games/progress";
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Elemen aplikasi tidak ditemukan.");
}

const playerProgress = loadPlayerProgress();
const hasSavedProgress = Object.keys(playerProgress.games).length > 0;

const gameCard = (game: GameCatalogItem): string => {
  const phaseLabels = game.phases.map((phase) => `<span>Fase ${phase}</span>`).join("");
  const isDeveloping = game.status === "in-development";
  const isPlayable =
    game.slug === "math-archer" ||
    game.slug === "math-adventure" ||
    game.slug === "science-lab" ||
    game.slug === "math-castle" ||
    game.slug === "math-space-mission" ||
    game.slug === "quiz-runner" ||
    game.slug === "puzzle-quest" ||
    game.slug === "treasure-hunt";
  const statusLabel = isDeveloping ? "Sedang dibuat" : "Segera hadir";
  const devPort =
    game.slug === "math-adventure"
      ? "5175"
      : game.slug === "science-lab"
        ? "5176"
        : game.slug === "math-castle"
          ? "5177"
          : game.slug === "math-space-mission"
            ? "5178"
            : game.slug === "quiz-runner"
              ? "5179"
              : game.slug === "puzzle-quest"
                ? "5180"
                : game.slug === "treasure-hunt"
                  ? "5181"
                  : "5174";
  const playableHref = import.meta.env.DEV
    ? `http://localhost:${devPort}/${game.slug}/`
    : `/${game.slug}/`;
  const playableLabel =
    game.slug === "math-adventure"
      ? "Mainkan vertical slice"
      : game.slug === "science-lab"
        ? "Mainkan prototipe"
        : game.slug === "math-castle"
          ? "Mainkan vertical slice"
          : game.slug === "math-space-mission"
            ? "Mainkan vertical slice"
            : game.slug === "quiz-runner"
              ? "Mainkan vertical slice"
              : game.slug === "puzzle-quest"
                ? "Mainkan vertical slice"
                : game.slug === "treasure-hunt"
                  ? "Mainkan vertical slice"
                  : "Mainkan versi awal";
  const action = isPlayable
    ? `<a class="card-action card-action--play" href="${playableHref}" aria-label="Mainkan ${game.name}">${playableLabel} <span aria-hidden="true">→</span></a>`
    : `<button class="card-action" type="button" disabled aria-label="${game.name}: ${statusLabel}">${statusLabel}</button>`;
  const gameProgress = loadGameProgress(game.slug);
  const gameLevel = Math.floor(gameProgress.xp / 1_000) + 1;
  const savedProgress =
    isPlayable && gameProgress.sessions > 0
      ? `<p class="game-card__progress"><span>★ Level ${gameLevel}</span><span>${gameProgress.xp.toLocaleString("id-ID")} XP</span><span>${gameProgress.sessions} sesi</span></p>`
      : "";

  return `
    <article class="game-card" data-subject="${game.subject}" data-status="${game.status}">
      <div class="game-art game-art--${game.theme}" aria-hidden="true">
        <span class="game-art__sun"></span>
        <span class="game-art__land land-back"></span>
        <span class="game-art__land land-front"></span>
        <span class="game-art__icon">${game.icon}</span>
        ${isDeveloping ? '<span class="game-art__flag">PERTAMA</span>' : ""}
      </div>
      <div class="game-card__body">
        <div class="game-card__meta">
          <span class="subject-pill">${game.subject}</span>
          <span class="status-pill ${isDeveloping ? "status-pill--active" : ""}">${statusLabel}</span>
        </div>
        <p class="game-card__international">${game.internationalName}</p>
        <h3>${game.name}</h3>
        <p class="game-card__mechanic">${game.mechanic}</p>
        <p class="game-card__description">${game.description}</p>
        ${savedProgress}
        <div class="game-card__footer">
          <div class="phase-list" aria-label="Tersedia untuk ${game.phases.map((phase) => `Fase ${phase}`).join(", ")}">
            ${phaseLabels}
          </div>
          ${action}
        </div>
      </div>
    </article>
  `;
};

app.innerHTML = `
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="#top" aria-label="Gezy Games, kembali ke atas">
        <span class="brand-mark" aria-hidden="true">
          <span class="brand-mark__star">★</span>
        </span>
        <span>
          <strong>Gezy</strong>
          <small>Games</small>
        </span>
      </a>
      <nav class="main-nav" aria-label="Navigasi utama">
        <a href="#game-catalog">Jelajahi Game</a>
        <a href="#about">Cara Belajar</a>
      </nav>
      <span class="header-badge">PAUD–SMP · Fondasi–D</span>
    </div>
  </header>

  <main id="top">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero__glow" aria-hidden="true"></div>
      <div class="hero__inner">
        <div class="hero__copy">
          <p class="eyebrow"><span>✦</span> PETUALANGAN BELAJAR DIMULAI</p>
          <h1 id="hero-title">Belajar jadi petualangan yang <em>seru.</em></h1>
          <p class="hero__lead">
            Jelajahi dunia, bangun benteng, lakukan eksperimen, dan kuasai pelajaran lewat permainan.
          </p>
          <div class="hero__actions">
            <a class="button button--primary" href="#game-catalog">Jelajahi 12 Game <span aria-hidden="true">↓</span></a>
            <a class="button button--ghost" href="#about">Bagaimana cara belajarnya?</a>
          </div>
          <ul class="hero__facts" aria-label="Keunggulan Gezy Games">
            <li><span>✓</span> Sesuai fase</li>
            <li><span>✓</span> Ramah sentuhan</li>
            <li><span>✓</span> Ada pembahasan</li>
          </ul>
        </div>

        <div class="world" aria-label="Ilustrasi dunia Gezy Games" role="img">
          <span class="world__cloud world__cloud--one"></span>
          <span class="world__cloud world__cloud--two"></span>
          <span class="world__sun">✦</span>
          <div class="world__archery">
            <span class="hero-target"><i></i><b></b></span>
            <span class="hero-arrow">➳</span>
            <span class="hero-archer">🏹</span>
          </div>
          <div class="world__path"></div>
          <span class="world__tree tree--one">♠</span>
          <span class="world__tree tree--two">♠</span>
          <span class="world__tree tree--three">♠</span>
          <span class="world__spark spark--one">✦</span>
          <span class="world__spark spark--two">✦</span>
          <div class="world__label">
            <span>🏹</span>
            <p><small>GAME PERTAMA</small><strong>Pemanah Matematika</strong></p>
          </div>
        </div>
      </div>
      <div class="hero__ground" aria-hidden="true"></div>
    </section>

    <section class="catalog-section" id="game-catalog" aria-labelledby="catalog-title">
      <div class="section-inner">
        <div class="section-heading">
          <div>
            <p class="eyebrow eyebrow--dark">PILIH PETUALANGANMU</p>
            <h2 id="catalog-title">Satu tujuan, banyak dunia</h2>
            <p>Setiap game membawa cara bermain yang berbeda, dengan materi yang sesuai kemampuanmu.</p>
          </div>
          <span class="catalog-count"><strong id="visible-count">${games.length}</strong> dunia belajar</span>
        </div>

        <div class="filter-bar" role="group" aria-label="Filter berdasarkan mata pelajaran">
          ${subjects
            .map(
              (subject, index) => `
                <button class="filter-button${index === 0 ? " is-active" : ""}" type="button" data-filter="${subject}" aria-pressed="${index === 0}">
                  ${subject}
                </button>
              `,
            )
            .join("")}
        </div>

        <div class="game-grid" aria-live="polite">
          ${games.map(gameCard).join("")}
        </div>
        <p class="empty-state" hidden>Tidak ada game untuk filter ini.</p>
      </div>
    </section>

    <section class="learning-section" id="about" aria-labelledby="learning-title">
      <div class="learning-section__inner">
        <div class="learning-intro">
          <p class="eyebrow">BELAJAR TANPA TERASA SENDIRIAN</p>
          <h2 id="learning-title">Jawabanmu mengubah dunia permainan.</h2>
          <p>
            Setiap langkah memberi respons yang jelas. Kalau masih keliru, materi akan datang kembali setelah kamu mencoba soal lain.
          </p>
        </div>
        <ol class="learning-steps">
          <li>
            <span class="step-number">1</span>
            <div><strong>Pilih fase dan topik</strong><p>Mulai dari materi yang sedang kamu pelajari.</p></div>
          </li>
          <li>
            <span class="step-number">2</span>
            <div><strong>Mainkan misinya</strong><p>Jawabanmu menggerakkan cerita dan aksi.</p></div>
          </li>
          <li>
            <span class="step-number">3</span>
            <div><strong>Lihat perkembangan</strong><p>Pelajari kembali konsep yang belum dikuasai.</p></div>
          </li>
        </ol>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div>
      <a class="brand brand--footer" href="#top"><strong>Gezy</strong> Games</a>
      <p>Dibuat untuk menumbuhkan rasa ingin tahu anak Indonesia.</p>
    </div>
    <div class="footer-legal">
      <p>© 2026 GezyTech Platform, Games Multi Fase ala Pak Gun. All rights reserved.</p>
      <p>${renderPlatformVersion()}</p>
      ${hasSavedProgress ? '<button class="reset-progress" type="button">Hapus progres lokal</button>' : ""}
    </div>
  </footer>
`;

const filterButtons = [...document.querySelectorAll<HTMLButtonElement>(".filter-button")];
const cards = [...document.querySelectorAll<HTMLElement>(".game-card")];
const count = document.querySelector<HTMLElement>("#visible-count");
const emptyState = document.querySelector<HTMLElement>(".empty-state");

const setFilter = (filter: SubjectFilter): void => {
  let visible = 0;

  filterButtons.forEach((button) => {
    const active = button.dataset.filter === filter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  cards.forEach((card) => {
    const show = filter === "Semua" || card.dataset.subject === filter;
    card.hidden = !show;
    if (show) visible += 1;
  });

  if (count) count.textContent = String(visible);
  if (emptyState) emptyState.hidden = visible > 0;
};

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter as SubjectFilter | undefined;
    if (filter && subjects.includes(filter)) setFilter(filter);
  });
});

document.querySelector<HTMLButtonElement>(".reset-progress")?.addEventListener("click", () => {
  const confirmed = window.confirm(
    "Hapus seluruh XP, koin, level, dan riwayat permainan di perangkat ini?",
  );
  if (!confirmed) return;
  clearPlayerProgress();
  window.location.reload();
});

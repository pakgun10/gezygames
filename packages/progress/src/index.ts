export const progressStorageKey = "gezy-games:progress:v1";
export const legacyMathArcherStorageKey = "gezy-games:math-archer:v1";

export interface GameProgress {
  readonly xp: number;
  readonly coins: number;
  readonly bestStreak: number;
  readonly sessions: number;
  readonly lastPlayedAt?: string;
}

export interface PlayerPreferences {
  readonly nickname: string;
  readonly audioEnabled: boolean;
  readonly lastPhase?: string;
  readonly lastTopic?: string;
}

export interface PlayerProgress {
  readonly version: 1;
  readonly games: Readonly<Record<string, GameProgress>>;
  readonly preferences: PlayerPreferences;
}

export interface ProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const emptyGameProgress = (): GameProgress => ({
  xp: 0,
  coins: 0,
  bestStreak: 0,
  sessions: 0,
});

export const emptyPlayerProgress = (): PlayerProgress => ({
  version: 1,
  games: {},
  preferences: {
    nickname: "",
    audioEnabled: true,
  },
});

const safeNonNegativeInteger = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;

const parseGameProgress = (value: unknown): GameProgress => {
  if (!value || typeof value !== "object") return emptyGameProgress();
  const candidate = value as Partial<GameProgress>;
  return {
    xp: safeNonNegativeInteger(candidate.xp),
    coins: safeNonNegativeInteger(candidate.coins),
    bestStreak: safeNonNegativeInteger(candidate.bestStreak),
    sessions: safeNonNegativeInteger(candidate.sessions),
    ...(typeof candidate.lastPlayedAt === "string" ? { lastPlayedAt: candidate.lastPlayedAt } : {}),
  };
};

export const loadPlayerProgress = (storage: ProgressStorage = localStorage): PlayerProgress => {
  try {
    const raw = storage.getItem(progressStorageKey);
    if (!raw) return emptyPlayerProgress();
    const parsed = JSON.parse(raw) as { version?: unknown; games?: unknown; preferences?: unknown };
    if (parsed.version !== 1 || !parsed.games || typeof parsed.games !== "object") {
      return emptyPlayerProgress();
    }

    const games = Object.fromEntries(
      Object.entries(parsed.games).map(([slug, gameProgress]) => [
        slug,
        parseGameProgress(gameProgress),
      ]),
    );
    const preferencesCandidate =
      parsed.preferences && typeof parsed.preferences === "object"
        ? (parsed.preferences as Partial<PlayerPreferences>)
        : {};
    const preferences: PlayerPreferences = {
      nickname:
        typeof preferencesCandidate.nickname === "string"
          ? preferencesCandidate.nickname.trim().slice(0, 30)
          : "",
      audioEnabled:
        typeof preferencesCandidate.audioEnabled === "boolean"
          ? preferencesCandidate.audioEnabled
          : true,
      ...(typeof preferencesCandidate.lastPhase === "string"
        ? { lastPhase: preferencesCandidate.lastPhase }
        : {}),
      ...(typeof preferencesCandidate.lastTopic === "string"
        ? { lastTopic: preferencesCandidate.lastTopic }
        : {}),
    };
    return { version: 1, games, preferences };
  } catch {
    return emptyPlayerProgress();
  }
};

export const loadGameProgress = (
  slug: string,
  storage: ProgressStorage = localStorage,
): GameProgress => loadPlayerProgress(storage).games[slug] ?? emptyGameProgress();

export const saveGameProgress = (
  slug: string,
  gameProgress: GameProgress,
  storage: ProgressStorage = localStorage,
): boolean => {
  try {
    const current = loadPlayerProgress(storage);
    const next: PlayerProgress = {
      version: 1,
      games: {
        ...current.games,
        [slug]: parseGameProgress(gameProgress),
      },
      preferences: current.preferences,
    };
    storage.setItem(progressStorageKey, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
};

export const savePlayerPreferences = (
  patch: Partial<PlayerPreferences>,
  storage: ProgressStorage = localStorage,
): boolean => {
  try {
    const current = loadPlayerProgress(storage);
    const nickname =
      typeof patch.nickname === "string"
        ? patch.nickname.trim().slice(0, 30)
        : current.preferences.nickname;
    const next: PlayerProgress = {
      ...current,
      preferences: {
        ...current.preferences,
        ...patch,
        nickname,
      },
    };
    storage.setItem(progressStorageKey, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
};

export const migrateLegacyMathArcherProgress = (
  storage: ProgressStorage = localStorage,
): GameProgress => {
  const existing = loadPlayerProgress(storage).games["math-archer"];
  if (existing) return existing;

  try {
    const legacyRaw = storage.getItem(legacyMathArcherStorageKey);
    if (!legacyRaw) return emptyGameProgress();
    const migrated = parseGameProgress(JSON.parse(legacyRaw));
    saveGameProgress("math-archer", migrated, storage);
    storage.removeItem(legacyMathArcherStorageKey);
    return migrated;
  } catch {
    return emptyGameProgress();
  }
};

export const clearPlayerProgress = (storage: ProgressStorage = localStorage): boolean => {
  try {
    storage.removeItem(progressStorageKey);
    storage.removeItem(legacyMathArcherStorageKey);
    return true;
  } catch {
    return false;
  }
};

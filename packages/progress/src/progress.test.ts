import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearPlayerProgress,
  legacyMathArcherStorageKey,
  loadGameProgress,
  loadPlayerProgress,
  migrateLegacyMathArcherProgress,
  progressStorageKey,
  saveGameProgress,
  savePlayerPreferences,
  type ProgressStorage,
} from "./index";

const createStorage = (): ProgressStorage => {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

describe("progress storage", () => {
  it("menyimpan progres beberapa game dengan skema versi satu", () => {
    const storage = createStorage();
    assert.equal(
      saveGameProgress("math-archer", { xp: 500, coins: 54, bestStreak: 5, sessions: 1 }, storage),
      true,
    );
    assert.equal(
      saveGameProgress(
        "math-adventure",
        { xp: 100, coins: 10, bestStreak: 1, sessions: 1 },
        storage,
      ),
      true,
    );

    const progress = loadPlayerProgress(storage);
    assert.equal(progress.version, 1);
    assert.equal(progress.games["math-archer"]?.xp, 500);
    assert.equal(progress.games["math-adventure"]?.coins, 10);
    assert.deepEqual(progress.preferences, { nickname: "", audioEnabled: true });
  });

  it("memulihkan data rusak menjadi progres kosong", () => {
    const storage = createStorage();
    storage.setItem(progressStorageKey, "bukan-json");
    assert.deepEqual(loadPlayerProgress(storage), {
      version: 1,
      games: {},
      preferences: { nickname: "", audioEnabled: true },
    });
  });

  it("memigrasikan progres Math Archer lama dan dapat menghapus semua data", () => {
    const storage = createStorage();
    storage.setItem(
      legacyMathArcherStorageKey,
      JSON.stringify({ xp: 300, coins: 20, bestStreak: 3, sessions: 2 }),
    );

    assert.equal(migrateLegacyMathArcherProgress(storage).xp, 300);
    assert.equal(loadGameProgress("math-archer", storage).sessions, 2);
    assert.equal(clearPlayerProgress(storage), true);
    assert.deepEqual(loadPlayerProgress(storage), {
      version: 1,
      games: {},
      preferences: { nickname: "", audioEnabled: true },
    });
  });

  it("menyimpan nama, audio, fase, dan topik terakhir", () => {
    const storage = createStorage();
    assert.equal(
      savePlayerPreferences(
        {
          nickname: "  Raka  ",
          audioEnabled: false,
          lastPhase: "D",
          lastTopic: "SPLDV",
        },
        storage,
      ),
      true,
    );

    assert.deepEqual(loadPlayerProgress(storage).preferences, {
      nickname: "Raka",
      audioEnabled: false,
      lastPhase: "D",
      lastTopic: "SPLDV",
    });
  });
});

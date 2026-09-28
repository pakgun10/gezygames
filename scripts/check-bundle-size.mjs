/* global console, process */

import { gzipSync } from "node:zlib";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const budgets = [
  { label: "Portal JavaScript", directory: "dist/assets", extension: ".js", raw: 25, gzip: 8 },
  { label: "Portal CSS", directory: "dist/assets", extension: ".css", raw: 30, gzip: 8 },
  {
    label: "Math Archer JavaScript",
    directory: "dist/math-archer/assets",
    extension: ".js",
    raw: 70,
    gzip: 18,
  },
  {
    label: "Math Archer CSS",
    directory: "dist/math-archer/assets",
    extension: ".css",
    raw: 35,
    gzip: 10,
  },
  {
    label: "Math Adventure JavaScript",
    directory: "dist/math-adventure/assets",
    extension: ".js",
    raw: 85,
    gzip: 22,
  },
  {
    label: "Math Adventure CSS",
    directory: "dist/math-adventure/assets",
    extension: ".css",
    raw: 45,
    gzip: 12,
  },
  {
    label: "Science Lab JavaScript",
    directory: "dist/science-lab/assets",
    extension: ".js",
    raw: 75,
    gzip: 20,
  },
  {
    label: "Science Lab CSS",
    directory: "dist/science-lab/assets",
    extension: ".css",
    raw: 45,
    gzip: 12,
  },
  {
    label: "Math Castle JavaScript",
    directory: "dist/math-castle/assets",
    extension: ".js",
    raw: 85,
    gzip: 22,
  },
  {
    label: "Math Castle CSS",
    directory: "dist/math-castle/assets",
    extension: ".css",
    raw: 45,
    gzip: 12,
  },
  {
    label: "Math Space Mission JavaScript",
    directory: "dist/math-space-mission/assets",
    extension: ".js",
    raw: 85,
    gzip: 22,
  },
  {
    label: "Math Space Mission CSS",
    directory: "dist/math-space-mission/assets",
    extension: ".css",
    raw: 45,
    gzip: 12,
  },
  {
    label: "Quiz Runner JavaScript",
    directory: "dist/quiz-runner/assets",
    extension: ".js",
    raw: 85,
    gzip: 22,
  },
  {
    label: "Quiz Runner CSS",
    directory: "dist/quiz-runner/assets",
    extension: ".css",
    raw: 45,
    gzip: 12,
  },
  {
    label: "Puzzle Quest JavaScript",
    directory: "dist/puzzle-quest/assets",
    extension: ".js",
    raw: 90,
    gzip: 24,
  },
  {
    label: "Puzzle Quest CSS",
    directory: "dist/puzzle-quest/assets",
    extension: ".css",
    raw: 50,
    gzip: 14,
  },
];

const formatSize = (bytes) => `${(bytes / 1024).toFixed(2)} kB`;
const failures = [];

for (const budget of budgets) {
  const files = (await readdir(budget.directory))
    .filter((file) => file.endsWith(budget.extension))
    .sort();
  if (files.length === 0) {
    failures.push(`${budget.label}: tidak ada file ${budget.extension} di ${budget.directory}`);
    continue;
  }

  const measurements = await Promise.all(
    files.map(async (file) => {
      const content = await readFile(join(budget.directory, file));
      return {
        file,
        raw: content.byteLength,
        gzip: gzipSync(content, { level: 9 }).byteLength,
      };
    }),
  );
  const largest = measurements.sort((left, right) => right.raw - left.raw)[0];
  console.log(
    `${budget.label}: ${largest.file} — raw ${formatSize(largest.raw)}, gzip ${formatSize(largest.gzip)} (budget raw ${budget.raw} kB / gzip ${budget.gzip} kB)`,
  );
  if (largest.raw > budget.raw * 1024 || largest.gzip > budget.gzip * 1024) {
    failures.push(`${budget.label} melewati budget.`);
  }
}

if (failures.length > 0) {
  console.error("Pemeriksaan ukuran bundle gagal:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("Semua bundle berada dalam budget awal.");
}

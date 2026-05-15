import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { DEFAULT_BOARD_ROWS, renderBoard } from "../src/components/Board.js";
import { answerWords } from "../src/data/words.js";
import { getRemainingWords, isWordConsistent } from "../src/game/consistency.js";
import { getFeedback } from "../src/game/feedback.js";
import {
  DEFAULT_STATS,
  loadSettings,
  loadStats,
  saveStats,
  updateStatsAfterGame
} from "../src/game/stats.js";
import {
  applyGuess,
  createInitialGameState,
  undoGuess
} from "../src/game/state.js";

const sampleAllowedGuesses = [
  "apple",
  "alley",
  "apply",
  "amply",
  "pally",
  "sally",
  "rally",
  "dally",
  "lapse",
  "aptly",
  "madly"
];

function createStorageMock() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
}

global.window = {
  localStorage: createStorageMock()
};

test("word lists use the Wordle-sized dictionary", () => {
  const dictionaryWords = fs
    .readFileSync(new URL("../dictionary-5-letter.txt", import.meta.url), "utf8")
    .trim()
    .split(/\r?\n/);

  assert.equal(answerWords.length, 2315);
  assert.equal(dictionaryWords.length, 12972);
  assert.equal(DEFAULT_BOARD_ROWS, 6);
});

test("legacy survival mode settings are upgraded to classic", () => {
  window.localStorage.setItem(
    "dont-wordle-settings",
    JSON.stringify({
      mode: "survival",
      survivalTarget: 6
    })
  );

  const settings = loadSettings();

  assert.equal(settings.mode, "classic");
  assert.equal(settings.survivalTarget, 6);
  assert.equal(settings.maxUndos, 5);
});

test("duplicate-letter feedback matches Wordle behavior for APPLE vs ALLEY", () => {
  assert.deepEqual(getFeedback("alley", "apple"), [
    "green",
    "yellow",
    "gray",
    "yellow",
    "gray"
  ]);
});

test("duplicate-letter feedback handles SALLY vs PALLY", () => {
  assert.deepEqual(getFeedback("pally", "sally"), [
    "gray",
    "green",
    "green",
    "green",
    "green"
  ]);
});

test("consistency rejects words that break known clues", () => {
  const guessHistory = [
    {
      word: "alley",
      feedback: getFeedback("alley", "apple"),
      remainingCount: 2
    }
  ];

  assert.equal(isWordConsistent("apple", guessHistory), true);
  assert.equal(isWordConsistent("apply", guessHistory), false);
  assert.equal(isWordConsistent("amply", guessHistory), false);
});

test("remaining-word calculation replays all clues", () => {
  const guessHistory = [
    {
      word: "alley",
      feedback: getFeedback("alley", "apple"),
      remainingCount: 0
    }
  ];

  assert.deepEqual(getRemainingWords(sampleAllowedGuesses, guessHistory), ["apple"]);
});

test("invalid guess rejection catches clue violations", () => {
  let gameState = createInitialGameState({
    answer: "apple",
    mode: "classic",
    survivalTarget: 10,
    allowedGuesses: sampleAllowedGuesses
  });

  gameState = applyGuess(gameState, "alley").gameState;
  const invalid = applyGuess(gameState, "amply");
  assert.equal(
    invalid.gameState.message,
    "This guess does not fit the clues you already know."
  );
});

test("guessing the answer ends the game as a loss", () => {
  const gameState = createInitialGameState({
    answer: "apple",
    mode: "classic",
    survivalTarget: 10,
    allowedGuesses: sampleAllowedGuesses
  });

  const result = applyGuess(gameState, "apple").gameState;
  assert.equal(result.status, "lost");
  assert.equal(result.message, "Oh no! You accidentally Wordled!");
});

test("classic mode wins immediately on the target guess", () => {
  const gameState = createInitialGameState({
    answer: "apple",
    mode: "classic",
    survivalTarget: 1,
    allowedGuesses: sampleAllowedGuesses
  });

  const result = applyGuess(gameState, "alley").gameState;

  assert.equal(result.status, "won");
  assert.equal(result.concluded, true);
  assert.equal(result.message, "You survived 1 guesses!");
});

test("undo restores the previous guess state and remaining count", () => {
  let gameState = createInitialGameState({
    answer: "apple",
    mode: "classic",
    survivalTarget: 10,
    allowedGuesses: sampleAllowedGuesses
  });

  gameState = applyGuess(gameState, "alley").gameState;
  assert.equal(gameState.guesses[0].remainingCount, 1);

  const undone = undoGuess(gameState).gameState;
  assert.equal(undone.guesses.length, 0);
  assert.equal(undone.currentInput, "");
  assert.equal(undone.remainingWords.length, sampleAllowedGuesses.length);
  assert.equal(undone.undosRemaining, 4);
});

test("undo clears an in-progress guess without spending an undo", () => {
  const gameState = createInitialGameState({
    answer: "apple",
    mode: "classic",
    survivalTarget: 10,
    allowedGuesses: sampleAllowedGuesses
  });

  const cleared = undoGuess({
    ...gameState,
    currentInput: "al"
  }).gameState;

  assert.equal(cleared.currentInput, "");
  assert.equal(cleared.undosRemaining, 5);
  assert.equal(cleared.undoStack.length, 0);
  assert.equal(cleared.message, "Cleared the current guess.");
});

test("stats can be restored exactly after an undo reopens a finished game", () => {
  saveStats(DEFAULT_STATS);

  const snapshot = loadStats();
  const completedStats = updateStatsAfterGame(snapshot, "won", 3);

  assert.equal(completedStats.gamesPlayed, 1);
  assert.equal(completedStats.gamesWon, 1);
  assert.equal(completedStats.currentSurvivalStreak, 1);

  saveStats(snapshot);
  const restoredStats = loadStats();

  assert.deepEqual(restoredStats, snapshot);
});

test("board renderer fills from the top and uses the requested row count", () => {
  const gameState = createInitialGameState({
    answer: "apple",
    mode: "classic",
    survivalTarget: 6,
    allowedGuesses: sampleAllowedGuesses
  });

  const rendered = renderBoard(
    {
      ...gameState,
      currentInput: "r"
    },
    6
  );

  assert.equal((rendered.match(/class="board-row"/g) || []).length, 6);
  assert.equal((rendered.match(/class="tile tile-/g) || []).length, 30);
  assert.match(rendered, /<div class="board-row">\s*<div class="tile tile-pending">r<\/div>/);
});

test("board renderer supports dynamic row counts from settings", () => {
  const gameState = createInitialGameState({
    answer: "apple",
    mode: "classic",
    survivalTarget: 8,
    allowedGuesses: sampleAllowedGuesses
  });

  const rendered = renderBoard(gameState, 8);

  assert.equal((rendered.match(/class="board-row"/g) || []).length, 8);
  assert.equal((rendered.match(/class="tile tile-/g) || []).length, 40);
});

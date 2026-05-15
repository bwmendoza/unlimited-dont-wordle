import { renderBoard } from "./components/Board.js";
import { renderKeyboard } from "./components/Keyboard.js";
import { renderRemainingWords } from "./components/RemainingWords.js";
import { renderSettingsModal } from "./components/SettingsModal.js";
import { answerWords } from "./data/words.js";
import {
  loadSettings,
  saveSettings,
  loadStats,
  resetStats,
  updateStatsAfterGame
} from "./game/stats.js";
import {
  applyGuess,
  buildShareText,
  createInitialGameState,
  getKeyboardStatuses,
  pickRandomAnswer,
  undoGuess
} from "./game/state.js";

const app = document.querySelector("#app");
const DICTIONARY_URL = "./dictionary-5-letter.txt";

let settings = loadSettings();
let stats = loadStats();
let showRemainingWords = settings.showRemainingWords;
let customAnswerDraft = "";
let settingsOpen = false;
let lastCompletedStatus = null;
let pendingCompletedStatsSnapshot = null;
let loadedAllowedGuesses = answerWords;

let gameState = null;

function startNewGame(customAnswer = "") {
  lastCompletedStatus = null;
  pendingCompletedStatsSnapshot = null;
  const answer = customAnswer || pickRandomAnswer(answerWords);
  return createInitialGameState({
    answer,
    mode: settings.mode,
    survivalTarget: settings.survivalTarget,
    countTrappedAsWin: settings.countTrappedAsWin,
    allowedGuesses: loadedAllowedGuesses,
    maxUndos: settings.maxUndos
  });
}

async function loadAllowedGuesses() {
  try {
    const response = await fetch(DICTIONARY_URL, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Dictionary request failed with ${response.status}`);
    }

    const text = await response.text();
    const words = text
      .split(/\r?\n/)
      .map((word) => word.trim().toLowerCase())
      .filter((word) => /^[a-z]{5}$/.test(word));

    return Array.from(new Set([...answerWords, ...words])).sort();
  } catch (error) {
    console.warn("Falling back to built-in allowed guesses.", error);
    return answerWords;
  }
}

function getModeLabel(mode) {
  return {
    classic: "Classic",
    exhaustion: "Exhaustion"
  }[mode] || "Classic";
}

function getTargetStatus(gameState) {
  if (gameState.mode === "classic") {
    return `Win at ${gameState.survivalTarget}`;
  }

  return `Target ${gameState.survivalTarget} inactive`;
}

function getVisibleRemainingWords() {
  if (!gameState) {
    return [];
  }

  if (!gameState.currentInput) {
    return gameState.remainingWords;
  }

  return gameState.remainingWords.filter((word) => word.startsWith(gameState.currentInput));
}

function getRandomizableWords() {
  if (!gameState) {
    return [];
  }

  return gameState.remainingWords;
}

function completeGameIfNeeded() {
  if (!gameState.concluded) {
    if (pendingCompletedStatsSnapshot) {
      stats = pendingCompletedStatsSnapshot;
      saveStats(stats);
      pendingCompletedStatsSnapshot = null;
      lastCompletedStatus = null;
    }
    return;
  }

  if (lastCompletedStatus === gameState.status) {
    return;
  }

  lastCompletedStatus = gameState.status;
  const outcome = gameState.status === "won" ? "won" : "lost";
  pendingCompletedStatsSnapshot = { ...stats };
  stats = updateStatsAfterGame(stats, outcome, gameState.guesses.length);
}

function applyTheme() {
  document.documentElement.dataset.theme = settings.darkMode ? "dark" : "light";
}

function syncRemainingWordsUI() {
  const remainingPanelMount = document.querySelector("[data-remaining-words-mount]");
  if (!remainingPanelMount) {
    return;
  }

  remainingPanelMount.innerHTML = renderRemainingWords(
    gameState.remainingWords,
    showRemainingWords,
    gameState.currentInput
  );
}

function syncRandomWordButtonUI() {
  const randomWordButton = document.querySelector("#random-word-button");
  if (!randomWordButton) {
    return;
  }

  randomWordButton.disabled = getRandomizableWords().length === 0;
}

function syncCurrentGuessUI() {
  const boardRows = document.querySelectorAll(".board-row");
  const activeRow = boardRows[gameState.guesses.length];
  if (!activeRow) {
    return;
  }

  const letters = gameState.currentInput.padEnd(5).slice(0, 5).split("");
  activeRow.querySelectorAll(".tile").forEach((tile, index) => {
    tile.className = "tile tile-pending";
    tile.textContent = letters[index] || "";
  });

  syncRemainingWordsUI();
  syncRandomWordButtonUI();
}

function readSettingsFromForm() {
  const nextMode = document.querySelector("#mode-select")?.value ?? settings.mode;
  const survivalTargetValue = document.querySelector("#survival-target-input")?.value ?? "";
  const maxUndosValue = document.querySelector("#max-undos-input")?.value ?? "";
  const survivalTarget = survivalTargetValue === "" ? 6 : Number(survivalTargetValue) || 6;
  const maxUndos = maxUndosValue === "" ? 5 : Number(maxUndosValue) || 5;

  return {
    ...settings,
    mode: nextMode,
    survivalTarget: Math.max(1, Math.min(99, survivalTarget)),
    maxUndos: Math.max(0, Math.min(99, maxUndos)),
    showRemainingWords: document.querySelector("#show-remaining-setting")?.checked ?? settings.showRemainingWords,
    showRandomWordButton:
      document.querySelector("#show-random-word-setting")?.checked ?? settings.showRandomWordButton,
    debugMode: document.querySelector("#debug-mode-setting")?.checked ?? settings.debugMode,
    darkMode: document.querySelector("#dark-mode-setting")?.checked ?? settings.darkMode,
    countTrappedAsWin:
      document.querySelector("#count-trapped-setting")?.checked ?? settings.countTrappedAsWin
  };
}

function applySettingsFromForm() {
  settings = readSettingsFromForm();

  showRemainingWords = settings.showRemainingWords;
  saveSettings(settings);
  settingsOpen = false;
  gameState = startNewGame();
  render();
}

function closeSettingsWithoutSaving() {
  settingsOpen = false;
  render();
}

function render() {
  if (!gameState) {
    app.innerHTML = `
      <div class="shell">
        <div class="message-box">
          <p>Loading dictionary...</p>
        </div>
      </div>
    `;
    return;
  }

  completeGameIfNeeded();
  applyTheme();

  const keyboardStatuses = getKeyboardStatuses(gameState.guesses);
  const visibleRemainingWords = getVisibleRemainingWords();
  const randomizableWords = getRandomizableWords();

  app.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Inverted Wordle</p>
          <h1>Unlimited Don’t Wordle</h1>
        </div>
        <div class="topbar-actions">
          <button id="new-game-button" type="button">New random game</button>
          <button id="settings-button" type="button" class="secondary">Settings</button>
        </div>
      </header>

      <main class="layout">
        <section class="game-panel">
          <div class="mobile-summary-strip">
            <div class="mobile-metric">
              <span>Valid words remaining</span>
              <strong>${gameState.remainingWords.length}</strong>
            </div>
            <div class="mobile-metric">
              <span>Undos remaining</span>
              <strong>${gameState.undosRemaining}</strong>
            </div>
          </div>

          <div class="status-strip">
            <div class="status-card">
              <span>Mode</span>
              <strong>${getModeLabel(gameState.mode)}</strong>
            </div>
            <div class="status-card">
              <span>Valid words remaining</span>
              <strong>${gameState.remainingWords.length}</strong>
            </div>
            <div class="status-card">
              <span>Undos left</span>
              <strong>${gameState.undosRemaining}</strong>
            </div>
            <div class="status-card">
              <span>Target guesses</span>
              <strong>${getTargetStatus(gameState)}</strong>
            </div>
            ${
              settings.debugMode
                ? `<div class="status-card">
                    <span>Debug answer</span>
                    <strong>${gameState.answer.toUpperCase()}</strong>
                  </div>`
                : ""
            }
          </div>

          <div class="message-box ${gameState.status}">
            <p>${gameState.message}</p>
            ${gameState.outcomeMessage ? `<p class="subtle">${gameState.outcomeMessage}</p>` : ""}
          </div>

          <div class="board-card">
            <div class="board-header">
              <span>Board</span>
              <span>${settings.survivalTarget}-row Wordle view</span>
            </div>
            <div class="board">${renderBoard(gameState, settings.survivalTarget)}</div>
          </div>

          <form id="guess-form" class="guess-form">
            <button type="submit" ${gameState.status !== "playing" ? "disabled" : ""}>Submit guess</button>
            ${
              gameState.status === "playing"
                ? `
                  ${
                    settings.showRandomWordButton
                      ? `<button id="random-word-button" type="button" class="secondary" ${
                          randomizableWords.length === 0 ? "disabled" : ""
                        }>Random word</button>`
                      : ""
                  }
                  <button id="undo-button" type="button" class="secondary" ${
                    (!gameState.currentInput &&
                      (gameState.undoStack.length === 0 || gameState.undosRemaining <= 0))
                      ? "disabled"
                      : ""
                  }>Undo</button>
                  <button id="remaining-toggle-button" type="button" class="secondary">
                    ${showRemainingWords ? "Hide remaining words" : "Show remaining words"}
                  </button>
                `
                : `
                  <button id="share-button" type="button" class="secondary">Share</button>
                `
            }
          </form>

          <div class="keyboard-card">
            ${renderKeyboard(keyboardStatuses)}
          </div>

          <div data-remaining-words-mount>
            ${renderRemainingWords(gameState.remainingWords, showRemainingWords, gameState.currentInput)}
          </div>

          <div class="mobile-accordion-stack">
            <details class="mobile-details-card">
              <summary>Game details</summary>
              <div class="mobile-details-body mobile-status-grid">
                <div class="status-card">
                  <span>Mode</span>
                  <strong>${getModeLabel(gameState.mode)}</strong>
                </div>
                <div class="status-card">
                  <span>Target guesses</span>
                  <strong>${getTargetStatus(gameState)}</strong>
                </div>
                ${
                  settings.debugMode
                    ? `<div class="status-card">
                        <span>Debug answer</span>
                        <strong>${gameState.answer.toUpperCase()}</strong>
                      </div>`
                    : ""
                }
              </div>
            </details>

            <details class="mobile-details-card">
              <summary>Stats</summary>
              <div class="mobile-details-body">
                <div class="stats-grid">
                  <div><span>Games played</span><strong>${stats.gamesPlayed}</strong></div>
                  <div><span>Wins survived</span><strong>${stats.gamesWon}</strong></div>
                  <div><span>Losses</span><strong>${stats.gamesLost}</strong></div>
                  <div><span>Average guesses</span><strong>${stats.averageGuesses}</strong></div>
                  <div><span>Best streak</span><strong>${stats.longestSurvivalStreak}</strong></div>
                  <div><span>Current streak</span><strong>${stats.currentSurvivalStreak}</strong></div>
                </div>
              </div>
            </details>

            <details class="mobile-details-card">
              <summary>How to survive</summary>
              <div class="mobile-details-body mobile-rules-copy">
                <p>Every guess must match every clue you have already revealed.</p>
                <p>Classic mode: win as soon as you survive the target number of valid non-answer guesses.</p>
                <p>Exhaustion mode: win by narrowing the puzzle until no safe non-answer guesses remain, usually when only the real answer is left.</p>
                <p>Green means keep that letter locked in place. Yellow means use it elsewhere. Gray means avoid it unless duplicate logic proved extra copies exist.</p>
                <p>You lose instantly if your guess matches the secret answer.</p>
              </div>
            </details>
          </div>
        </section>

        <aside class="sidebar">
          <section class="stats-card">
            <h2>Stats</h2>
            <div class="stats-grid">
              <div><span>Games played</span><strong>${stats.gamesPlayed}</strong></div>
              <div><span>Wins survived</span><strong>${stats.gamesWon}</strong></div>
              <div><span>Losses</span><strong>${stats.gamesLost}</strong></div>
              <div><span>Average guesses</span><strong>${stats.averageGuesses}</strong></div>
              <div><span>Best streak</span><strong>${stats.longestSurvivalStreak}</strong></div>
              <div><span>Current streak</span><strong>${stats.currentSurvivalStreak}</strong></div>
            </div>
          </section>

          <section class="rules-card">
            <h2>How to survive</h2>
            <p>Every guess must match every clue you have already revealed.</p>
            <p>Classic mode: win as soon as you survive the target number of valid non-answer guesses.</p>
            <p>Exhaustion mode: win by narrowing the puzzle until no safe non-answer guesses remain, usually when only the real answer is left.</p>
            <p>Green means keep that letter locked in place. Yellow means use it elsewhere. Gray means avoid it unless duplicate logic proved extra copies exist.</p>
            <p>You lose instantly if your guess matches the secret answer.</p>
          </section>
        </aside>
      </main>
      ${settingsOpen ? renderSettingsModal(settings, customAnswerDraft) : ""}
    </div>
  `;

  bindEvents();
}

function bindEvents() {
  document.querySelector("#guess-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (gameState.status !== "playing") {
      return;
    }

    const guess = gameState.currentInput.toLowerCase();
    const result = applyGuess(gameState, guess);
    gameState = result.gameState;
    render();
  });

  document.querySelector("#new-game-button")?.addEventListener("click", () => {
    gameState = startNewGame();
    render();
  });

  document.querySelector("#undo-button")?.addEventListener("click", () => {
    const result = undoGuess(gameState);
    gameState = result.gameState;
    render();
  });

  document.querySelector("#share-button")?.addEventListener("click", async () => {
    const text = buildShareText(gameState);
    try {
      await navigator.clipboard.writeText(text);
      gameState = { ...gameState, message: "Share text copied to clipboard." };
    } catch {
      gameState = { ...gameState, message: "Clipboard unavailable. Share text is in the console." };
      console.log(text);
    }
    render();
  });

  document.querySelector("#remaining-toggle-button")?.addEventListener("click", () => {
    showRemainingWords = !showRemainingWords;
    render();
  });

  document.querySelector("#random-word-button")?.addEventListener("click", () => {
    const randomizableWords = getRandomizableWords();
    if (randomizableWords.length === 0) {
      gameState = { ...gameState, message: "No remaining words are available for random fill." };
      render();
      return;
    }

    const randomWord =
      randomizableWords[Math.floor(Math.random() * randomizableWords.length)];

    gameState = {
      ...gameState,
      currentInput: randomWord
    };
    syncCurrentGuessUI();
  });

  document.querySelector("#settings-button")?.addEventListener("click", () => {
    settingsOpen = true;
    render();
  });

  document.querySelectorAll("[data-close-settings='true']").forEach((element) => {
    element.addEventListener("click", () => {
      closeSettingsWithoutSaving();
    });
  });

  document.querySelector("#save-settings-button")?.addEventListener("click", () => {
    applySettingsFromForm();
  });

  document.querySelector("#start-custom-game-button")?.addEventListener("click", () => {
    const answer = document.querySelector("#custom-answer-input").value.toLowerCase().replace(/[^a-z]/g, "");
    customAnswerDraft = answer;
    if (answer.length < 5) {
      gameState = { ...gameState, message: "Custom answers must be exactly five letters." };
      render();
      return;
    }
    if (!loadedAllowedGuesses.includes(answer)) {
      gameState = { ...gameState, message: "Custom answer must be in the word list." };
      render();
      return;
    }
    settings = readSettingsFromForm();
    showRemainingWords = settings.showRemainingWords;
    saveSettings(settings);
    settingsOpen = false;
    gameState = startNewGame(answer);
    render();
  });

  document.querySelector("#reset-stats-button")?.addEventListener("click", () => {
    stats = resetStats();
    render();
  });

  document.querySelectorAll(".key").forEach((button) => {
    button.addEventListener("click", () => {
      handleKey(button.dataset.key);
    });
  });
}

function handleKey(key) {
  if (settingsOpen) {
    return;
  }

  if (gameState.status !== "playing") {
    return;
  }

  if (key === "enter") {
    const result = applyGuess(gameState, gameState.currentInput.toLowerCase());
    gameState = result.gameState;
    render();
    return;
  }

  if (key === "backspace") {
    gameState = {
      ...gameState,
      currentInput: gameState.currentInput.slice(0, -1)
    };
    syncCurrentGuessUI();
    return;
  }

  if (gameState.status !== "playing" || gameState.currentInput.length >= 5) {
    return;
  }

  gameState = {
    ...gameState,
    currentInput: `${gameState.currentInput}${key}`.slice(0, 5)
  };
  syncCurrentGuessUI();
}

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

document.addEventListener("keydown", (event) => {
  if (settingsOpen) {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      applySettingsFromForm();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeSettingsWithoutSaving();
    }

    return;
  }

  if (isEditableTarget(event.target)) {
    return;
  }

  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  if (event.key === "Enter") {
    handleKey("enter");
    return;
  }

  if (event.key === "Backspace") {
    handleKey("backspace");
    return;
  }

  if (/^[a-zA-Z]$/.test(event.key)) {
    handleKey(event.key.toLowerCase());
  }
});

async function initialize() {
  render();
  loadedAllowedGuesses = await loadAllowedGuesses();
  gameState = startNewGame();
  render();
}

initialize();

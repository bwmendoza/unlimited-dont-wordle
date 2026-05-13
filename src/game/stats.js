const SETTINGS_KEY = "dont-wordle-settings";
const STATS_KEY = "dont-wordle-stats";

export const DEFAULT_SETTINGS = {
  mode: "classic",
  survivalTarget: 6,
  maxUndos: 5,
  showRemainingWords: false,
  showRandomWordButton: true,
  debugMode: false,
  darkMode: true,
  countTrappedAsWin: true
};

export const DEFAULT_STATS = {
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  totalCompletedGuesses: 0,
  averageGuesses: 0,
  longestSurvivalStreak: 0,
  currentSurvivalStreak: 0
};

function parseStoredValue(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export function loadSettings() {
  const settings = parseStoredValue(SETTINGS_KEY, DEFAULT_SETTINGS);

  if (settings.mode === "survival") {
    return {
      ...settings,
      mode: "classic"
    };
  }

  return settings;
}

export function saveSettings(settings) {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadStats() {
  return parseStoredValue(STATS_KEY, DEFAULT_STATS);
}

export function saveStats(stats) {
  window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function resetStats() {
  saveStats(DEFAULT_STATS);
  return { ...DEFAULT_STATS };
}

export function updateStatsAfterGame(stats, outcome, guessCount) {
  const nextStats = {
    ...stats,
    gamesPlayed: stats.gamesPlayed + 1,
    totalCompletedGuesses: stats.totalCompletedGuesses + guessCount
  };

  if (outcome === "won") {
    nextStats.gamesWon += 1;
    nextStats.currentSurvivalStreak += 1;
    nextStats.longestSurvivalStreak = Math.max(
      nextStats.longestSurvivalStreak,
      nextStats.currentSurvivalStreak
    );
  } else {
    nextStats.gamesLost += 1;
    nextStats.currentSurvivalStreak = 0;
  }

  nextStats.averageGuesses =
    nextStats.gamesPlayed > 0
      ? Number((nextStats.totalCompletedGuesses / nextStats.gamesPlayed).toFixed(2))
      : 0;

  saveStats(nextStats);
  return nextStats;
}

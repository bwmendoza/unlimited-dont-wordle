import { getFeedback, feedbackToEmoji } from "./feedback.js";
import { getRemainingWords, isWordConsistent } from "./consistency.js";

export const DEFAULT_MAX_UNDOS = 5;

export function pickRandomAnswer(answerWords) {
  return answerWords[Math.floor(Math.random() * answerWords.length)];
}

export function createInitialGameState({
  answer,
  mode,
  survivalTarget,
  countTrappedAsWin,
  allowedGuesses,
  maxUndos = DEFAULT_MAX_UNDOS
}) {
  return {
    answer,
    guesses: [],
    currentInput: "",
    status: "playing",
    message: "Enter a valid five-letter word and try not to Wordle.",
    undosRemaining: maxUndos,
    maxUndos,
    undoStack: [],
    mode,
    survivalTarget,
    countTrappedAsWin,
    allowedGuesses,
    remainingWords: allowedGuesses.slice(),
    outcomeMessage: "",
    trapped: false,
    concluded: false
  };
}

function cloneGuess(guess) {
  return {
    word: guess.word,
    feedback: [...guess.feedback],
    remainingCount: guess.remainingCount
  };
}

function snapshotGame(gameState) {
  return {
    guesses: gameState.guesses.map(cloneGuess),
    currentInput: "",
    status: gameState.status,
    message: gameState.message,
    remainingWords: [...gameState.remainingWords],
    outcomeMessage: gameState.outcomeMessage,
    trapped: gameState.trapped,
    concluded: gameState.concluded
  };
}

export function validateGuess(guess, gameState) {
  if (guess.length < 5) {
    return "Not enough letters.";
  }

  if (!/^[a-z]{5}$/.test(guess)) {
    return "Guesses must be exactly five letters.";
  }

  if (!gameState.allowedGuesses.includes(guess)) {
    return "Not in word list.";
  }

  if (!isWordConsistent(guess, gameState.guesses)) {
    return "This guess does not fit the clues you already know.";
  }

  return "";
}

function getModeOutcome(gameState, remainingWords) {
  const nonAnswerRemaining = remainingWords.filter((word) => word !== gameState.answer);

  if (gameState.mode === "classic" && gameState.guesses.length >= gameState.survivalTarget) {
    return {
      status: "won",
      message: `You survived ${gameState.survivalTarget} guesses!`,
      trapped: false
    };
  }

  if (gameState.mode === "exhaustion" && nonAnswerRemaining.length === 0) {
    const onlyAnswerRemains = remainingWords.length === 1 && remainingWords[0] === gameState.answer;
    if (onlyAnswerRemains && !gameState.countTrappedAsWin) {
      return {
        status: "playing",
        message: "Only the answer remains. This setting treats that as a trap, not a win.",
        trapped: true
      };
    }
    return {
      status: "won",
      message: onlyAnswerRemains
        ? "You survived until only the answer remained."
        : "You exhausted every safe option.",
      trapped: onlyAnswerRemains
    };
  }

  if (nonAnswerRemaining.length === 0) {
    return {
      status: "playing",
      message: "Only the answer remains. Undo if you want another path.",
      trapped: true
    };
  }

  return {
    status: "playing",
    message: "Nice, you avoided the word.",
    trapped: false
  };
}

export function applyGuess(gameState, guess) {
  const error = validateGuess(guess, gameState);
  if (error) {
    return { gameState: { ...gameState, message: error }, error };
  }

  const nextUndoStack = [...gameState.undoStack, snapshotGame(gameState)];
  const feedback = getFeedback(guess, gameState.answer);
  const nextGuesses = [...gameState.guesses];
  const provisionalGuess = {
    word: guess,
    feedback,
    remainingCount: 0
  };

  nextGuesses.push(provisionalGuess);
  const remainingWords = getRemainingWords(gameState.allowedGuesses, nextGuesses);
  provisionalGuess.remainingCount = remainingWords.length;

  if (guess === gameState.answer) {
    return {
      error: "",
      gameState: {
        ...gameState,
        guesses: nextGuesses,
        currentInput: "",
        status: "lost",
        message: "Oh no! You accidentally Wordled!",
        remainingWords,
        outcomeMessage: `The answer was ${gameState.answer.toUpperCase()}.`,
        trapped: false,
        concluded: true,
        undoStack: nextUndoStack
      }
    };
  }

  const modeOutcome = getModeOutcome(
    {
      ...gameState,
      guesses: nextGuesses
    },
    remainingWords
  );

  return {
    error: "",
    gameState: {
      ...gameState,
      guesses: nextGuesses,
      currentInput: "",
      status: modeOutcome.status,
      message: modeOutcome.message,
      remainingWords,
      outcomeMessage:
        modeOutcome.status === "won" ? `The word was: ${gameState.answer.toUpperCase()}` : "",
      trapped: modeOutcome.trapped,
      concluded: modeOutcome.status !== "playing",
      undoStack: nextUndoStack
    }
  };
}

export function undoGuess(gameState) {
  if (gameState.currentInput) {
    return {
      error: "",
      gameState: {
        ...gameState,
        currentInput: "",
        message: "Cleared the current guess."
      }
    };
  }

  if (gameState.undoStack.length === 0) {
    return { gameState: { ...gameState, message: "There is nothing to undo." }, error: "empty" };
  }

  if (gameState.undosRemaining <= 0) {
    return {
      gameState: { ...gameState, message: "You are out of undos." },
      error: "limit"
    };
  }

  const snapshot = gameState.undoStack[gameState.undoStack.length - 1];

  return {
    error: "",
    gameState: {
      ...gameState,
      ...snapshot,
      undosRemaining: gameState.undosRemaining - 1,
      undoStack: gameState.undoStack.slice(0, -1),
      message: "Undid the previous guess."
    }
  };
}

export function getKeyboardStatuses(guesses) {
  const priority = {
    gray: 1,
    yellow: 2,
    green: 3
  };

  return guesses.reduce((statuses, guess) => {
    guess.word.split("").forEach((letter, index) => {
      const nextState = guess.feedback[index];
      const currentState = statuses[letter];
      if (!currentState || priority[nextState] > priority[currentState]) {
        statuses[letter] = nextState;
      }
    });
    return statuses;
  }, {});
}

export function buildShareText(gameState) {
  const modeLabel = {
    classic: "Classic",
    exhaustion: "Exhaustion"
  }[gameState.mode] || "Classic";

  const rows = gameState.guesses.map(
    (guess) => `${feedbackToEmoji(guess.feedback)} ${guess.remainingCount}`
  );

  const closingLine =
    gameState.status === "lost"
      ? "Oh no, I accidentally Wordled!"
      : gameState.status === "won"
        ? gameState.outcomeMessage || "I survived!"
        : "Still surviving!";

  return [
    "Unlimited Don't Wordle",
    `Mode: ${modeLabel}`,
    `Guesses: ${gameState.guesses.length}`,
    `Undos used: ${gameState.maxUndos - gameState.undosRemaining}`,
    ...rows,
    closingLine
  ].join("\n");
}

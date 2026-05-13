import { getFeedback } from "./feedback.js";

/**
 * @typedef {import("./feedback.js").TileState} TileState
 */

/**
 * @typedef {Object} GuessResult
 * @property {string} word
 * @property {TileState[]} feedback
 * @property {number} remainingCount
 */

/**
 * The safest consistency check is to replay every historical guess against a
 * candidate as though the candidate were the true answer. If any generated
 * feedback differs from the recorded feedback, the candidate breaks the clues.
 *
 * @param {string} candidate
 * @param {GuessResult[]} guessHistory
 * @returns {boolean}
 */
export function isWordConsistent(candidate, guessHistory) {
  return guessHistory.every((guess) => {
    const simulatedFeedback = getFeedback(guess.word, candidate);
    return simulatedFeedback.every((tile, index) => tile === guess.feedback[index]);
  });
}

/**
 * @param {string[]} allowedGuesses
 * @param {GuessResult[]} guessHistory
 * @returns {string[]}
 */
export function getRemainingWords(allowedGuesses, guessHistory) {
  return allowedGuesses.filter((word) => isWordConsistent(word, guessHistory));
}

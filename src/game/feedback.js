/**
 * @typedef {"green" | "yellow" | "gray"} TileState
 */

/**
 * Wordle-style duplicate-aware feedback.
 * First consume exact matches, then only award yellows from the remaining
 * unconsumed answer letters.
 *
 * @param {string} guess
 * @param {string} answer
 * @returns {TileState[]}
 */
export function getFeedback(guess, answer) {
  const feedback = Array(5).fill("gray");
  const remainingAnswer = answer.split("");
  const guessLetters = guess.split("");

  for (let index = 0; index < 5; index += 1) {
    if (guessLetters[index] === remainingAnswer[index]) {
      feedback[index] = "green";
      remainingAnswer[index] = null;
      guessLetters[index] = null;
    }
  }

  for (let index = 0; index < 5; index += 1) {
    const letter = guessLetters[index];
    if (!letter) {
      continue;
    }

    const matchIndex = remainingAnswer.indexOf(letter);
    if (matchIndex !== -1) {
      feedback[index] = "yellow";
      remainingAnswer[matchIndex] = null;
    }
  }

  return feedback;
}

/**
 * @param {TileState[]} feedback
 * @returns {string}
 */
export function feedbackToEmoji(feedback) {
  const symbols = {
    green: "🟩",
    yellow: "🟨",
    gray: "⬜"
  };

  return feedback.map((tile) => symbols[tile]).join("");
}

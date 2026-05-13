# Unlimited Don't Wordle

Unlimited Don't Wordle is a fully local single-player word puzzle inspired by Wordle, except the goal is inverted: you must keep making legal five-letter guesses without ever accidentally guessing the hidden answer.

Every guess must stay consistent with every clue you have already revealed. Hard mode is always on.

## Features

- Unlimited random games
- Optional custom-answer mode for testing
- Correct duplicate-letter Wordle feedback
- Wordle-sized built-in dictionary with 10,657 valid guesses and 2,315 answer words
- Wordle-style fixed grid that fills from the top down
- Dynamic board height based on the classic-mode target setting
- Enforced clue consistency for every future guess
- Remaining-word counter plus optional remaining-word list
- Undo system with 5 undos per game
- Undo now restores reopened finished games without leaving stats inflated
- On-screen keyboard and physical keyboard support
- Share text with per-row remaining counts
- Local stats and settings stored in `localStorage`
- Dark mode
- Responsive mobile-friendly layout
- Two game modes: Classic and Exhaustion

## Run Locally

This project has no external dependencies and does not rely on `npm`.

1. Open a terminal in the project folder:

```bash
cd /Users/brandonmendoza/Desktop/unlimited-dont-wordle
```

2. Start a local static server:

```bash
python3 -m http.server 4173
```

3. Open the app in your browser:

[http://localhost:4173](http://localhost:4173)

## Run Tests

The test suite uses Node's built-in test runner:

```bash
cd /Users/brandonmendoza/Desktop/unlimited-dont-wordle
node --test
```

## Rules

1. A secret five-letter answer is chosen from the answer list.
2. You enter valid five-letter words from the allowed guess list.
3. Feedback works like Wordle:
   - Green: right letter, right spot
   - Yellow: right letter, wrong spot
   - Gray: letter is absent unless duplicate-letter rules prove otherwise
4. Every new guess must match all prior clues.
5. If you guess the answer exactly, you lose immediately.
6. Undo lets you rewind a guess, its feedback, the remaining-word pool, and trap state.

## Game Modes

### Classic

You win after making `N` valid non-answer guesses. The default target is `6`, and you can change it in settings. The board size follows this setting, so raising or lowering the target changes how many rows are shown.

### Exhaustion

You win when no safe non-answer guesses remain. By default, “only the answer remains” counts as a win, but you can turn that off in settings if you want that situation to count as a trap instead.

## Word Lists

The app ships with:

- `src/data/wordle-answers.js`: the built-in answer list
- `dictionary-5-letter.txt`: the root-level five-letter dictionary loaded once when the app starts and used as the guess pool

The app keeps these lists locally for fast offline play rather than depending on a live dictionary API during gameplay. If the dictionary file fails to load for some reason, the app falls back to the answer list so the game still boots.

### Update The Word Lists

1. Update [dictionary-5-letter.txt](/Users/brandonmendoza/Desktop/unlimited-dont-wordle/dictionary-5-letter.txt) for allowed guesses.
2. Update [src/data/wordle-answers.js](/Users/brandonmendoza/Desktop/unlimited-dont-wordle/src/data/wordle-answers.js) if you want to change the answer pool.
3. Keep all entries lowercase and exactly five letters.

## Project Structure

```text
src/
  components/
  data/
  game/
  main.js
  styles.css
tests/
```

## Logic Notes

- Duplicate-letter feedback is implemented with the standard two-pass Wordle algorithm in [src/game/feedback.js](/Users/brandonmendoza/Desktop/unlimited-dont-wordle/src/game/feedback.js).
- Clue enforcement uses replayed feedback in [src/game/consistency.js](/Users/brandonmendoza/Desktop/unlimited-dont-wordle/src/game/consistency.js): a candidate word is legal only if every past guess would have produced the exact same feedback against that candidate.
- Remaining words are computed from the full allowed guess list after every guess.
- The app fetches [dictionary-5-letter.txt](/Users/brandonmendoza/Desktop/unlimited-dont-wordle/dictionary-5-letter.txt) once at startup, stores that list in memory for the session, and uses it for guess validation.
- The board renderer in [src/components/Board.js](/Users/brandonmendoza/Desktop/unlimited-dont-wordle/src/components/Board.js) fills guesses from the top row downward and uses the current classic-mode target as the visible row count.

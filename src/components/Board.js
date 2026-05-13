export const DEFAULT_BOARD_ROWS = 6;

function buildBoardRows(gameState) {
  const rows = gameState.guesses.map((guess) => ({
    word: guess.word,
    feedback: guess.feedback
  }));

  if (gameState.status === "playing") {
    rows.push({
      word: gameState.currentInput,
      feedback: Array(5).fill("pending")
    });
  }

  return rows;
}

function buildVisibleRows(gameState, rowCount) {
  const rows = buildBoardRows(gameState);
  const visibleRows = rows.slice(0, rowCount);

  while (visibleRows.length < rowCount) {
    visibleRows.push({
      word: "",
      feedback: Array(5).fill("pending")
    });
  }

  return {
    hasHiddenRows: rows.length > rowCount,
    startIndex: 0,
    visibleRows
  };
}

export function renderBoard(gameState, rowCount = DEFAULT_BOARD_ROWS) {
  const safeRowCount = Math.max(1, rowCount);
  const { hasHiddenRows, startIndex, visibleRows } = buildVisibleRows(gameState, safeRowCount);

  return `
    ${hasHiddenRows ? `<p class="board-window-label">Showing guesses ${startIndex + 1}-${startIndex + visibleRows.length} of ${gameState.guesses.length}</p>` : ""}
    <div class="board-grid">
      ${visibleRows
        .map((row) => {
          const letters = row.word.padEnd(5).slice(0, 5).split("");

          return `
            <div class="board-row">
              ${letters
                .map((letter, index) => {
                  const state = row.feedback[index] || "pending";
                  return `<div class="tile tile-${state}">${letter || ""}</div>`;
                })
                .join("")}
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

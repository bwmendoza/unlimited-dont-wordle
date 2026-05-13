function getFilteredWords(words, prefix) {
  if (!prefix) {
    return words;
  }

  return words.filter((word) => word.startsWith(prefix));
}

export function renderRemainingWords(words, isVisible, prefix = "") {
  if (!isVisible) {
    return "";
  }

  const filteredWords = getFilteredWords(words, prefix);

  return `
    <div class="remaining-panel">
      ${
        prefix
          ? `<p class="hint">Showing remaining words that start with ${prefix.toUpperCase()}.</p>`
          : ""
      }
      <div class="remaining-chip-list">
        ${
          filteredWords.length > 0
            ? filteredWords.map((word) => `<span class="word-chip">${word.toUpperCase()}</span>`).join("")
            : '<span class="word-chip muted">No matching words remain.</span>'
        }
      </div>
    </div>
  `;
}

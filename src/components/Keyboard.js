const KEY_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["enter", "z", "x", "c", "v", "b", "n", "m", "backspace"]
];

export function renderKeyboard(statuses) {
  return KEY_ROWS.map(
    (row) => `
      <div class="keyboard-row">
        ${row
          .map((key) => {
            const label = key === "backspace" ? "⌫" : key === "enter" ? "Enter" : key.toUpperCase();
            const wideClass = key.length > 1 ? " key-wide" : "";
            const stateClass = statuses[key] ? ` key-${statuses[key]}` : "";
            return `<button class="key${wideClass}${stateClass}" data-key="${key}" type="button">${label}</button>`;
          })
          .join("")}
      </div>
    `
  ).join("");
}

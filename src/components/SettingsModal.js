export function renderSettingsModal(settings, customAnswer) {
  return `
    <div class="modal-backdrop" data-close-settings="true"></div>
    <section class="modal" aria-modal="true" role="dialog" aria-labelledby="settings-title">
      <div class="modal-header">
        <h2 id="settings-title">Settings</h2>
        <button class="icon-button" type="button" data-close-settings="true" aria-label="Close settings">×</button>
      </div>
      <div class="settings-grid">
        <label>
          <span>Mode</span>
          <select id="mode-select">
            <option value="classic" ${settings.mode === "classic" ? "selected" : ""}>Classic</option>
            <option value="exhaustion" ${settings.mode === "exhaustion" ? "selected" : ""}>Exhaustion</option>
          </select>
        </label>
        <label>
          <span>Target guesses (Classic mode only)</span>
          <input
            id="survival-target-input"
            type="number"
            min="1"
            max="99"
            placeholder="6"
            value="${settings.survivalTarget === 6 ? "" : settings.survivalTarget}"
          />
        </label>
        <label>
          <span>Undos per game</span>
          <input
            id="max-undos-input"
            type="number"
            min="0"
            max="99"
            placeholder="5"
            value="${settings.maxUndos === 5 ? "" : settings.maxUndos}"
          />
        </label>
        <label class="checkbox-row">
          <input id="show-remaining-setting" type="checkbox" ${settings.showRemainingWords ? "checked" : ""} />
          <span>Show remaining words by default</span>
        </label>
        <label class="checkbox-row">
          <input id="show-random-word-setting" type="checkbox" ${settings.showRandomWordButton ? "checked" : ""} />
          <span>Show random word button</span>
        </label>
        <label class="checkbox-row">
          <input id="debug-mode-setting" type="checkbox" ${settings.debugMode ? "checked" : ""} />
          <span>Debug mode</span>
        </label>
        <label class="checkbox-row">
          <input id="dark-mode-setting" type="checkbox" ${settings.darkMode ? "checked" : ""} />
          <span>Dark mode</span>
        </label>
        <label class="checkbox-row">
          <input id="count-trapped-setting" type="checkbox" ${settings.countTrappedAsWin ? "checked" : ""} />
          <span>Count “only answer remains” as exhaustion win</span>
        </label>
        <label>
          <span>Custom answer</span>
          <input id="custom-answer-input" type="text" maxlength="5" placeholder="APPLE" value="${customAnswer}" />
        </label>
      </div>
      <div class="modal-actions">
        <button id="save-settings-button" type="button">Save settings ↵</button>
        <button id="start-custom-game-button" type="button" class="secondary">Start custom game</button>
        <button id="reset-stats-button" type="button" class="danger">Reset stats</button>
      </div>
    </section>
  `;
}

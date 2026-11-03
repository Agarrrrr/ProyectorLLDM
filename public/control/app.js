import './settings.js';
import { acceptSettings } from './settings-state.js';
import { synchronizeWorkspace } from './shared-workspace.js';
import './themes.js';
import './carteleria.js';
import './navigation.js';
import './lyrics-editor.js';
import './shortcuts.js';
import { loadHistory, loadThemeHistory, updateInputPlaceholders } from './bible.js';
import { hymnSearchInput, searchHymns } from './hymn.js';
import { searchChoir } from './choir.js';
import { loadPresentations } from './presentations.js';
import { globalState, updateNetworkIpDisplay, updateUiState } from './live-state.js';
import { connectProjection } from './connection.js';
import { updateConnection } from './monitor.js';
import { initializeMonitors } from './monitor.js';
import { showToast } from './shell.js';

// INICIALIZACIÓN (HIMNARIO COMO PESTAÑA INICIAL DEFAULT)
function initialize() {
  initializeMonitors();
  loadHistory();
  loadThemeHistory();
  updateInputPlaceholders();
  searchHymns("");
  searchChoir("");
  loadPresentations();
  updateNetworkIpDisplay();
  let catalogRevision;
  connectProjection({ onState: state => {
    if (catalogRevision !== undefined && catalogRevision !== state.catalogRevision) window.dispatchEvent(new Event('song-catalog-changed'));
    catalogRevision = state.catalogRevision; acceptSettings(state.settings, state.settingsRevision); synchronizeWorkspace(state); updateUiState(state); }, onConnection: updateConnection });
}

initialize();
window.addEventListener('unhandledrejection', event => {
  showToast(event.reason?.message || 'No se pudo completar la acción.');
});

window.addEventListener('content-tab-changed', event => {
  if (event.detail === 'tab-presentacion') loadPresentations();
  if (globalState) updateUiState(globalState);
});

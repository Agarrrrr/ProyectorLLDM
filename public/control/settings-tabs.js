const tabs = [...document.querySelectorAll('[data-settings-section]')];
const panels = [...document.querySelectorAll('[data-settings-panel]')];
const body = document.getElementById('settingsBody');
let current = 'church';

export function activateSettingsTab(section, focus = false) {
  if (!tabs.some(tab => tab.dataset.settingsSection === section)) section = 'church';
  current = section;
  for (const tab of tabs) {
    const selected = tab.dataset.settingsSection === section;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focus) tab.focus();
  }
  for (const panel of panels) panel.hidden = panel.dataset.settingsPanel !== section;
  body.scrollTop = 0;
  try { localStorage.setItem('lldm.settings.section', section); } catch {}
}

for (const tab of tabs) {
  tab.addEventListener('click', () => activateSettingsTab(tab.dataset.settingsSection));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const index = tabs.indexOf(tab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    activateSettingsTab(tabs[next].dataset.settingsSection, true);
  });
}

export function openSettingsTabs() {
  try { current = localStorage.getItem('lldm.settings.section') || 'church'; } catch {}
  activateSettingsTab(current);
}

function createActionHandler({ projectionState, wss, broadcastState, broadcastOverlay, hideOverlay }) {
  function handleWsAction(data = {}) {
    if (!data || typeof data.action !== 'string') return false;
    switch (data.action) {
      case 'NEXT_SLIDE':
        if (projectionState.currentSlideIndex < projectionState.slides.length - 1) {
          projectionState.currentSlideIndex++;
          projectionState.phase = 'active';
          broadcastState();
        } else if (projectionState.isLooping) {
          projectionState.currentSlideIndex = 0;
          projectionState.phase = 'active';
          broadcastState();
        }
        break;

      case 'PREV_SLIDE':
        if (projectionState.currentSlideIndex > 0) {
          projectionState.currentSlideIndex--;
          projectionState.phase = 'active';
          broadcastState();
        } else if (projectionState.isLooping) {
          projectionState.currentSlideIndex = projectionState.slides.length - 1;
          projectionState.phase = 'active';
          broadcastState();
        }
        break;

      case 'NEXT_SECTION': {
        const current = projectionState.slides[projectionState.currentSlideIndex];
        const curSection = current ? (current.sectionGroup || current.baseSectionLabel || current.sectionLabel || current.verse || '') : '';
        let nextIdx = -1;
        for (let i = projectionState.currentSlideIndex + 1; i < projectionState.slides.length; i++) {
          const s = projectionState.slides[i];
          const sSec = s.sectionGroup || s.baseSectionLabel || s.sectionLabel || s.verse || '';
          if (sSec !== curSection) {
            nextIdx = i;
            break;
          }
        }
        if (nextIdx !== -1) {
          projectionState.currentSlideIndex = nextIdx;
          projectionState.phase = 'active';
          broadcastState();
        }
        break;
      }

      case 'PREV_SECTION': {
        const current = projectionState.slides[projectionState.currentSlideIndex];
        const curSection = current ? (current.sectionGroup || current.baseSectionLabel || current.sectionLabel || current.verse || '') : '';
        let prevIdx = -1;
        for (let i = projectionState.currentSlideIndex - 1; i >= 0; i--) {
          const s = projectionState.slides[i];
          const sSec = s.sectionGroup || s.baseSectionLabel || s.sectionLabel || s.verse || '';
          if (sSec !== curSection) {
            prevIdx = i;
            while (prevIdx > 0 && (projectionState.slides[prevIdx - 1].sectionGroup || projectionState.slides[prevIdx - 1].baseSectionLabel || projectionState.slides[prevIdx - 1].sectionLabel || projectionState.slides[prevIdx - 1].verse) === sSec) {
              prevIdx--;
            }
            break;
          }
        }
        if (prevIdx !== -1) {
          projectionState.currentSlideIndex = prevIdx;
          projectionState.phase = 'active';
          broadcastState();
        }
        break;
      }

      case 'GO_TO_SLIDE':
      case 'GOTO_SLIDE':
        if (Number.isInteger(data.index) && data.index >= 0 && data.index < projectionState.slides.length) {
          projectionState.currentSlideIndex = data.index;
          projectionState.phase = 'active';
          broadcastState();
        }
        break;

      case 'GO_TO_CHORUS': {
        if (projectionState.slides.length === 0) break;
        let chorusIdx = -1;
        for (let i = projectionState.currentSlideIndex + 1; i < projectionState.slides.length; i++) {
          if (projectionState.slides[i].sectionType === 'chorus') {
            chorusIdx = i;
            break;
          }
        }
        if (chorusIdx === -1) {
          for (let i = 0; i < projectionState.slides.length; i++) {
            if (projectionState.slides[i].sectionType === 'chorus') {
              chorusIdx = i;
              break;
            }
          }
        }
        if (chorusIdx !== -1) {
          projectionState.currentSlideIndex = chorusIdx;
          projectionState.phase = 'active';
          broadcastState();
        }
        break;
      }

      case 'SET_IDLE':
        projectionState.phase = 'idle';
        projectionState.isLooping = false;
        if (projectionState.workspace?.selections) {
          projectionState.workspace.selections = { hymn: null, choir: null, presentation: null };
        }
        broadcastState();
        break;

      case 'CLEAR_PROJECTION':
        projectionState.phase = 'idle';
        projectionState.contentType = null;
        projectionState.activeItem = null;
        projectionState.slides = [];
        projectionState.currentSlideIndex = 0;
        projectionState.isLooping = false;
        if (projectionState.workspace) {
          projectionState.workspace.selections = { hymn: null, choir: null, presentation: null };
          if (projectionState.workspace.drafts) {
            projectionState.workspace.drafts.hymnSearchInput = '';
            projectionState.workspace.drafts.choirSearchInput = '';
            projectionState.workspace.drafts.presentationSearchInput = '';
          }
        }
        projectionState.displayPayload = {
          type: 'idle',
          phase: 'idle'
        };
        broadcastState();
        break;

      case 'SET_ACTIVE':
        if (projectionState.slides.length > 0) {
          projectionState.phase = 'active';
          broadcastState();
        }
        break;

      case 'BROADCAST_OVERLAY':
        broadcastOverlay(data.payload);
        break;

      case 'HIDE_OVERLAY':
        hideOverlay();
        break;

      default:
        return false;
    }
    return true;
  }

  return handleWsAction;
}

module.exports = { createActionHandler };

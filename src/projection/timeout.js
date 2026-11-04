function createProjectionTimeout({ state, onExpire }) {
  let timer, key;

  function cancel() {
    clearTimeout(timer);
    timer = undefined;
    key = undefined;
  }

  function observe(restart = false) {
    const type = state.contentType;
    if (state.phase !== 'active' || (type !== 'bible' && type !== 'theme')) {
      cancel();
      return;
    }
    const nextKey = JSON.stringify([type, state.activeItem]);
    if (!restart && key === nextKey) return;
    cancel();
    key = nextKey;
    const seconds = state.settings.graphics[type === 'bible' ? 'bibleDurationSeconds' : 'themeDurationSeconds'];
    if (!seconds) return;
    timer = setTimeout(() => {
      cancel();
      onExpire();
    }, seconds * 1000);
    timer.unref();
  }

  return { observe, cancel };
}

module.exports = { createProjectionTimeout };

// Remembers which trips were already sent, using the browser's localStorage.

const Store = (() => {
  // The index keeps two trips with the same id apart.
  const keyOf = (trip, index) => `${trip.date}|${trip.tripId}|${index}`;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.storageKey) || "{}");
    } catch (err) {
      return {};
    }
  }

  function save(sent) {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(sent));
    } catch (err) {
      // Storage can be blocked (private mode). The app still works, it just forgets.
    }
  }

  // Auto sender switch and queue mode.
  const PREFS_KEY = `${CONFIG.storageKey}-prefs`;

  function loadPrefs() {
    const defaults = { autoSender: CONFIG.autoSender.enabledByDefault, queueMode: CONFIG.autoSender.queueMode };
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") };
    } catch (err) {
      return defaults;
    }
  }

  function savePrefs(prefs) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (err) {
      // ignore, see save()
    }
  }

  return { keyOf, load, save, loadPrefs, savePrefs };
})();
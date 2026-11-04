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

  return { keyOf, load, save };
})();

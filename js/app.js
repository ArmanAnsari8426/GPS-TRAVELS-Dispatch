// Entry point: holds the state, reads the files and wires up the events.

const state = {
  trips: [],
  contacts: {},
  sent: {},
  tab: "send",
  settings: { ...CONFIG.defaults }
};

const $ = (id) => document.getElementById(id);

function readSettings() {
  const number = (id, fallback) => {
    const value = Number($(id).value);
    return $(id).value !== "" && Number.isFinite(value) ? value : fallback;
  };
  const d = CONFIG.defaults;

  return {
    signOff: $("signOff").value.trim() || d.signOff,
    speed: Math.max(number("speed", d.speed), 1),
    perStop: Math.max(number("perStop", d.perStop), 0),
    buffer: Math.max(number("buffer", d.buffer), 0)
  };
}

function refresh() {
  state.settings = readSettings();
  UI.render(state);
}

/* ----- Reading files ----- */

function readSheet(file, onRows) {
  const reader = new FileReader();

  reader.onload = (event) => {
    try {
      const book = XLSX.read(new Uint8Array(event.target.result), { type: "array" });
      const sheet = book.Sheets[book.SheetNames[0]];
      onRows(XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" }));
    } catch (err) {
      alert(`Could not read the file: ${err.message}`);
    }
  };

  reader.readAsArrayBuffer(file);
}

function loadTrips(file) {
  readSheet(file, (rows) => {
    state.trips = Parser.parseTrips(rows);
    state.sent = Store.load();
    UI.markFileLoaded("dropTrips", `Loaded: ${file.name}`);
    refresh();
  });
}

function loadContacts(file) {
  readSheet(file, (rows) => {
    state.contacts = Parser.parseContacts(rows);
    UI.markFileLoaded("dropContacts", `Loaded: ${file.name} (${Object.keys(state.contacts).length} entries)`);
    refresh();
  });
}

/* ----- Sent status ----- */

function markSent(indexes) {
  indexes.forEach((i) => { state.sent[Store.keyOf(state.trips[i], i)] = true; });
  Store.save(state.sent);
  setTimeout(refresh, 400); // let the WhatsApp tab open first
}

/* ----- Events ----- */

$("tabSend").addEventListener("click", () => { state.tab = "send"; refresh(); });
$("tabAnalysis").addEventListener("click", () => { state.tab = "analysis"; refresh(); });

$("btnReport").addEventListener("click", () => Exports.downloadReport(state));
$("btnMessages").addEventListener("click", () => Exports.downloadMessages(state));
$("btnReset").addEventListener("click", () => {
  state.sent = {};
  Store.save(state.sent);
  refresh();
});

["search", "unsentOnly", "signOff", "speed", "perStop", "buffer"].forEach((id) => {
  $(id).addEventListener("input", refresh);
  $(id).addEventListener("change", refresh);
});

// The cards are re-rendered often, so their buttons are handled in one place.
$("driverList").addEventListener("click", (event) => {
  const sendLink = event.target.closest("[data-send]");
  if (sendLink) markSent(sendLink.dataset.send.split(",").map(Number));

  const copyButton = event.target.closest("[data-copy]");
  if (copyButton && navigator.clipboard) {
    const index = Number(copyButton.dataset.copy);
    navigator.clipboard.writeText(Messages.build(state.trips, [index], state.settings.signOff)).catch(() => {});
  }
});

[
  ["fileTrips", "dropTrips", loadTrips],
  ["fileContacts", "dropContacts", loadContacts]
].forEach(([inputId, zoneId, load]) => {
  const input = $(inputId);
  const zone = $(zoneId);

  input.addEventListener("change", () => { if (input.files[0]) load(input.files[0]); });
  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("over"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("over"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("over");
    if (e.dataTransfer.files[0]) load(e.dataTransfer.files[0]);
  });
});

// Fill the settings fields with the defaults and draw the empty page.
$("signOff").value = CONFIG.defaults.signOff;
$("speed").value = CONFIG.defaults.speed;
$("perStop").value = CONFIG.defaults.perStop;
$("buffer").value = CONFIG.defaults.buffer;
refresh();

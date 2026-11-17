// Entry point: holds the state, reads the files and wires up the events.

const prefs = Store.loadPrefs();

const state = {
  trips: [],
  contacts: {},
  sent: {},
  tab: "send",
  settings: { ...CONFIG.defaults },
  autoSender: prefs.autoSender,
  queueMode: prefs.queueMode
};

const savePrefs = () => Store.savePrefs({ autoSender: state.autoSender, queueMode: state.queueMode });

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

// The auto sender writes a report; trips it sent are marked as sent here.
function importReport(file) {
  if (!state.trips.length) { alert("Load the trip sheet first, then import the report."); return; }

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const report = JSON.parse(event.target.result);
      const known = new Set(state.trips.map((trip, i) => Store.keyOf(trip, i)));
      let marked = 0;

      (report.results || []).filter((r) => r.status === "sent").forEach((r) => {
        r.keys.filter((key) => known.has(key)).forEach((key) => { state.sent[key] = true; marked++; });
      });

      Store.save(state.sent);
      refresh();
      alert(`${marked} trips marked as sent.`);
    } catch (err) {
      alert(`Could not read the report: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

/* ----- Events ----- */

$("tabSend").addEventListener("click", () => { state.tab = "send"; refresh(); });
$("tabAnalysis").addEventListener("click", () => { state.tab = "analysis"; refresh(); });

$("btnReport").addEventListener("click", () => Exports.downloadReport(state));
$("btnMessages").addEventListener("click", () => Exports.downloadMessages(state));
$("btnAuto").addEventListener("click", () => {
  if (!state.autoSender) {
    const message = "The auto sender sends messages through WhatsApp Web by itself. "
      + "This is not an official WhatsApp feature and can get a number restricted.\n\n"
      + "Start with small batches and use it for drivers who already know your number.\n\nTurn it on?";
    if (!confirm(message)) return;
  }
  state.autoSender = !state.autoSender;
  savePrefs();
  refresh();
});
$("queueMode").addEventListener("change", (event) => {
  state.queueMode = event.target.value;
  savePrefs();
});
$("btnQueue").addEventListener("click", () => Exports.downloadQueue(state));
$("btnImport").addEventListener("click", () => $("fileReport").click());
$("fileReport").addEventListener("change", (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (file) importReport(file);
});
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
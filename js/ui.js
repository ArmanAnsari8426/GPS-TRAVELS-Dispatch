// Everything that draws on the page.

const UI = (() => {
  const { escapeHtml, boldToHtml, formatClock, unique } = Utils;
  const $ = (id) => document.getElementById(id);

  const isSent = (state, index) => Boolean(state.sent[Store.keyOf(state.trips[index], index)]);

  function statusTag(info) {
    const styles = { "Safe": "ok", "Tight": "warn", "Late risk": "bad" };
    return `<span class="tag ${styles[info.status]}">${info.status}</span>`;
  }

  function table(headings, rows) {
    const head = headings.map((h) => `<th>${h}</th>`).join("");
    const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("");
    return `<div class="scroll-x"><table><tr>${head}</tr>${body}</table></div>`;
  }

  const statBoxes = (items) =>
    items.map(([value, label]) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`).join("");

  /* ----- Send tab ----- */

  function tripRow(state, index, group) {
    const { trips, settings } = state;
    const trip = trips[index];
    const info = Analysis.analyseTrip(trip, settings);
    const hasPhone = group.phone.length === 10;
    const message = Messages.build(trips, [index], settings.signOff);

    const details = [`${trip.kind} ${trip.time}`, `First pickup ${formatClock(info.firstPickup)}`];
    if (trip.km != null) details.push(`${trip.km} km`);
    details.push(`${trip.employees.length} employees`);

    const estimate = info.ok
      ? `<div>${statusTag(info)}<span class="tag">Reaches ~${formatClock(info.arrival)}</span><span class="tag">Travel ~${Math.round(info.travel)} min</span></div>`
      : "";

    return `
      <div class="trip">
        <div class="spread">
          <div>
            <b>${escapeHtml(trip.label)}</b> ${isSent(state, index) ? '<span class="tag ok">Sent</span>' : ""}
            <div class="muted">${escapeHtml(details.join(" · "))}</div>
            ${estimate}
          </div>
          <a class="btn wa${hasPhone ? "" : " disabled"}" target="_blank" rel="noopener"
             data-send="${index}" href="${Messages.whatsappUrl(message, group.phone)}">
            ${group.indexes.length > 1 ? "Send this trip" : "Send on WhatsApp"}
          </a>
        </div>
        <details>
          <summary>Preview message</summary>
          <div class="bubble">${boldToHtml(message)}</div>
          <div class="bubble-actions"><button data-copy="${index}">Copy</button></div>
        </details>
      </div>`;
  }

  function driverCard(state, group) {
    const { trips, contacts, settings } = state;
    const first = trips[group.indexes[0]];
    const allSent = group.indexes.every((i) => isSent(state, i));
    const hasPhone = group.phone.length === 10;
    const inMyList = Boolean(Analysis.contactPhone(first, contacts));
    const vehicles = unique(group.indexes.map((i) => trips[i].vehicle));
    const phoneDiffers = inMyList && first.sheetPhone && first.sheetPhone !== group.phone;

    const tags = [
      group.indexes.length > 1 ? `<span class="tag warn">${group.indexes.length} trips</span>` : "",
      inMyList ? '<span class="tag ok">Matched in your list</span>' : "",
      phoneDiffers ? `<span class="tag warn">Number in sheet: ${escapeHtml(first.sheetPhone)}</span>` : ""
    ].join("");

    const sendAll = group.indexes.length > 1
      ? `<div class="spread trip-all">
           <span class="muted">All trips in one message</span>
           <a class="btn wa${hasPhone ? "" : " disabled"}" target="_blank" rel="noopener"
              data-send="${group.indexes.join(",")}"
              href="${Messages.whatsappUrl(Messages.build(trips, group.indexes, settings.signOff), group.phone)}">
             Send all ${group.indexes.length} trips together
           </a>
         </div>`
      : "";

    return `
      <div class="box${allSent ? " done" : ""}">
        <div class="driver-head">
          <div class="avatar">${escapeHtml((first.driver.charAt(0) || "D").toUpperCase())}</div>
          <div class="info">
            <div class="driver-name">${escapeHtml(first.driver)}</div>
            <div class="muted">${hasPhone ? escapeHtml(group.phone) : "Phone number missing"} · ${escapeHtml(vehicles.join(", "))}</div>
          </div>
          ${allSent ? '<span class="tag ok">Sent</span>' : ""}
        </div>
        <div>${tags}</div>
        ${group.indexes.map((i) => tripRow(state, i, group)).join("")}
        ${sendAll}
      </div>`;
  }

  function renderSendTab(state) {
    const query = $("search").value.toLowerCase();
    const unsentOnly = $("unsentOnly").checked;

    const cards = Analysis.groupByDriver(state.trips, state.contacts)
      .filter((group) => {
        const text = group.indexes.map((i) => state.trips[i].driver + state.trips[i].vehicle + state.trips[i].label).join(" ").toLowerCase();
        const allSent = group.indexes.every((i) => isSent(state, i));
        return text.includes(query) && !(unsentOnly && allSent);
      })
      .map((group) => driverCard(state, group))
      .join("");

    $("driverList").innerHTML = cards || '<div class="box muted">Nothing to show.</div>';
  }

  /* ----- Analysis tab ----- */

  function renderAnalysisTab(state) {
    const { trips, settings } = state;
    const ranked = Analysis.rankTrips(trips, settings);
    const risky = ranked.filter((r) => r.info.status !== "Safe");
    const late = ranked.filter((r) => r.info.status === "Late risk");
    const withKm = trips.filter((t) => t.km != null);
    const totalKm = withKm.reduce((sum, t) => sum + t.km, 0);
    const avgKm = withKm.length ? (totalKm / withKm.length).toFixed(1) : 0;

    const summary = `
      <div class="box">
        <h3>At a glance</h3>
        <div class="stats">${statBoxes([
          [ranked.length, "Trips checked"],
          [ranked.length - risky.length, "Safe"],
          [risky.length - late.length, "Tight"],
          [late.length, "Late risk"]
        ])}</div>
        <p class="muted">Average trip ${avgKm} km, ${totalKm.toFixed(0)} km in total. These are estimates because the trip sheet has no actual drop time:
          ${settings.speed} km/h from the first pickup, plus ${settings.perStop} min for every extra pickup. Change the speed in Settings to see how the numbers move.</p>
        <p>${risky.length
          ? `<b>Suggestion:</b> ${risky.length} trip(s) have little or no margin. Ask those drivers to start the first pickup at the suggested time in the table below.`
          : "<b>All trips look safe.</b>"}</p>
      </div>`;

    const offices = Analysis.summariseOffices(trips);
    const officeRows = Object.keys(offices).sort().map((code) => {
      const o = offices[code];
      return [escapeHtml(code), o.employees, o.trips, o.rideCount ? `${Math.round(o.rideSum / o.rideCount)} min` : "-", o.rideCount ? `${o.rideMax} min` : "-"];
    });
    const officeBox = `
      <div class="box">
        <h3>By office (employee code)</h3>
        ${table(["Office code", "Employees", "Trips", "Avg pickup to login", "Longest"], officeRows)}
        <p class="muted">The employee code is treated as the office.</p>
      </div>`;

    const tripRows = ranked.map(({ trip, info }) => [
      escapeHtml(trip.driver), escapeHtml(trip.vehicle), formatClock(info.firstPickup), escapeHtml(trip.time), trip.km,
      `${Math.round(info.travel)} min`, formatClock(info.arrival), `${Math.round(info.margin)} min`, statusTag(info),
      info.suggestedStart == null ? "-" : formatClock(info.suggestedStart)
    ]);
    const tripBox = `
      <div class="box">
        <h3>Who drops when (tightest first)</h3>
        ${table(["Driver", "Vehicle", "First pickup", "Login", "Km", "Travel", "Reaches", "Margin", "Status", "Suggested start"], tripRows)}
      </div>`;

    $("viewAnalysis").innerHTML = summary + officeBox + tripBox;
  }

  /* ----- Page ----- */

  function renderStats(state) {
    const employees = state.trips.reduce((sum, t) => sum + t.employees.length, 0);
    const sentCount = state.trips.filter((t, i) => isSent(state, i)).length;
    const drivers = Analysis.groupByDriver(state.trips, state.contacts).length;

    $("stats").innerHTML = statBoxes([
      [state.trips.length, "Trips"],
      [drivers, "Drivers"],
      [employees, "Employees"],
      [`${sentCount}/${state.trips.length}`, "Sent"]
    ]);
  }

  function render(state) {
    const hasTrips = state.trips.length > 0;

    renderStats(state);
    $("tabs").hidden = !hasTrips;
    $("tools").hidden = !hasTrips;
    $("exportBox").hidden = !hasTrips;
    $("viewSend").hidden = state.tab !== "send";
    $("viewAnalysis").hidden = state.tab !== "analysis";
    $("tabSend").classList.toggle("active", state.tab === "send");
    $("tabAnalysis").classList.toggle("active", state.tab === "analysis");

    if (hasTrips) {
      renderSendTab(state);
      renderAnalysisTab(state);
    }
  }

  function markFileLoaded(dropId, text) {
    const zone = $(dropId);
    zone.classList.add("loaded");
    zone.querySelector("b").textContent = text;
  }

  return { render, markFileLoaded };
})();

// Turns the rows of a spreadsheet into trips and a contact lookup.

const Parser = (() => {
  const { clean, normalise, formatClock, toMinutes, toDateText, toPhone } = Utils;

  // Looks for a label row near the top ("drop location", "Trip id", ...) and moves the
  // columns accordingly. Without a label row the positions from config.js are used.
  function detectColumns(rows) {
    const trip = { ...CONFIG.tripColumns };
    const employee = { ...CONFIG.employeeColumns };
    const found = {};

    rows.slice(0, 8).forEach((row) => {
      row.forEach((cell, col) => {
        const text = normalise(cell);
        if (!text || text.length > 30) return;
        const keywords = CONFIG.labelKeywords;
        const has = (list) => list.some((word) => text.includes(word));

        if (has(keywords.tripId)) found.tripId = col;
        else if (has(keywords.code)) found.code = col;
        else if (has(keywords.phone)) found.phone = col;
        else if (has(keywords.area)) found.area = col;
      });
    });

    if (found.tripId != null) trip.tripId = found.tripId;
    if (found.code != null) { trip.code = found.code; employee.code = found.code; }
    if (found.phone != null) employee.phone = found.phone;
    if (found.area != null) { employee.area = found.area; trip.phone = found.area; } // driver mobile sits in the same column as the area

    return { trip, employee };
  }

  // A trip id looks like T407166. If its column is empty we look through the whole row.
  function findTripId(row, columns) {
    const direct = clean(row[columns.tripId]);
    if (direct) return direct;
    const cell = row.find((value) => /^[A-Za-z]{1,3}\d{5,}$/.test(clean(value)));
    return cell ? clean(cell) : "";
  }

  // Distance in km: the configured column, otherwise the first small number to the right of the phone column.
  function findKm(row, columns) {
    if (typeof row[columns.km] === "number") return row[columns.km];
    for (let i = columns.phone + 1; i < row.length; i++) {
      if (typeof row[i] === "number" && row[i] > 0 && row[i] < 1000) return row[i];
    }
    return null;
  }

  function parseTrips(rows) {
    const { trip: T, employee: E } = detectColumns(rows);
    const trips = [];
    let current = null;

    rows.forEach((row) => {
      const kindText = clean(row[T.kind]);

      if (/^(login|logout)/i.test(kindText)) {
        let loginMin = toMinutes(row[T.time]);
        if (loginMin == null) loginMin = toMinutes(kindText);

        current = {
          label: clean(row[T.label]),
          kind: /^logout/i.test(kindText) ? "Logout" : "Login",
          loginMin,
          time: loginMin == null ? "" : formatClock(loginMin),
          date: toDateText(row[T.time]),
          vehicle: clean(row[T.vehicle]),
          driver: clean(row[T.driver]),
          sheetPhone: toPhone(row[T.phone]),
          dropCode: clean(row[T.code]),
          km: findKm(row, T),
          tripId: findTripId(row, T),
          employees: []
        };
        trips.push(current);
        return;
      }

      const isEmployee = current && typeof row[E.no] === "number" && row[E.no] < 500 && clean(row[E.name]);
      if (!isEmployee) return;

      const pickupMin = toMinutes(row[E.pickup]);
      current.employees.push({
        no: row[E.no],
        name: clean(row[E.name]),
        gender: clean(row[E.gender]),
        address: clean(row[E.address]),
        code: clean(row[E.code]),
        area: clean(row[E.area]),
        phone: toPhone(row[E.phone]),
        pickupMin,
        pickup: pickupMin == null ? "" : formatClock(pickupMin)
      });
    });

    return trips;
  }

  // Your own driver list: any row with a mobile number. Every other text cell
  // (name, vehicle number) becomes a key that points to that number.
  function parseContacts(rows) {
    const contacts = {};

    rows.forEach((row) => {
      let phone = "";
      const keys = [];

      row.forEach((cell) => {
        const text = String(cell);
        const digits = text.replace(/\D/g, "");
        const looksLikePhone = digits.length >= 10 && digits.length <= 13 && /^[\d\s+\-.e]+$/i.test(text);

        if (!phone && looksLikePhone) phone = digits.slice(-10);
        else if (typeof cell === "string" && normalise(cell).length >= 3) keys.push(normalise(cell));
      });

      if (phone) keys.forEach((key) => { contacts[key] = phone; });
    });

    return contacts;
  }

  return { parseTrips, parseContacts };
})();
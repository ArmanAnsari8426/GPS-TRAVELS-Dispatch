// Turns the rows of a spreadsheet into trips and a contact lookup.

const Parser = (() => {
  const { clean, normalise, formatClock, toMinutes, toDateText, toPhone } = Utils;
  const T = CONFIG.tripColumns;
  const E = CONFIG.employeeColumns;

  function parseTrips(rows) {
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
          km: typeof row[T.km] === "number" ? row[T.km] : null,
          tripId: clean(row[T.tripId]),
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

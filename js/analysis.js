// Driver lookup, grouping and the timing estimates.

const Analysis = (() => {
  const { normalise } = Utils;

  const contactPhone = (trip, contacts) => contacts[normalise(trip.vehicle)] || contacts[normalise(trip.driver)] || "";

  // Your own list wins over the number printed in the trip sheet.
  const phoneFor = (trip, contacts) => contactPhone(trip, contacts) || trip.sheetPhone;

  // All trips of one driver end up in a single group. The mobile number is the key;
  // if a trip has none, the driver name is used instead.
  function groupByDriver(trips, contacts) {
    const groups = new Map();

    trips.forEach((trip, index) => {
      const phone = phoneFor(trip, contacts);
      const key = phone || `name:${normalise(trip.driver)}`;
      if (!groups.has(key)) groups.set(key, { phone, indexes: [] });
      groups.get(key).indexes.push(index);
    });

    return [...groups.values()];
  }

  // Estimate only: the sheet has no real drop time, so we work it out from the
  // distance, an average speed and a few minutes for each extra pickup.
  function analyseTrip(trip, settings) {
    const pickups = trip.employees.map((e) => e.pickupMin).filter((m) => m != null);
    const firstPickup = pickups.length ? Math.min(...pickups) : null;

    const canEstimate = trip.kind === "Login" && firstPickup != null && trip.loginMin != null && trip.km != null;
    if (!canEstimate) return { ok: false, firstPickup };

    const extraStops = Math.max(0, trip.employees.length - 1);
    const travel = (trip.km / settings.speed) * 60 + extraStops * settings.perStop;
    const arrival = firstPickup + travel;
    const margin = trip.loginMin - arrival;

    let status = "Safe";
    if (margin < 0) status = "Late risk";
    else if (margin < settings.buffer) status = "Tight";

    return {
      ok: true,
      firstPickup,
      travel,
      arrival,
      margin,
      status,
      suggestedStart: status === "Safe" ? null : trip.loginMin - travel - settings.buffer
    };
  }

  // Trips that can be estimated, tightest margin first.
  function rankTrips(trips, settings) {
    return trips
      .map((trip, index) => ({ trip, index, info: analyseTrip(trip, settings) }))
      .filter((item) => item.info.ok)
      .sort((a, b) => a.info.margin - b.info.margin);
  }

  // Per office code: employees, trips, and how long employees ride between
  // their pickup and the login time.
  function summariseOffices(trips) {
    const offices = {};

    trips.forEach((trip) => {
      const countedInTrip = new Set();

      trip.employees.forEach((emp) => {
        const code = emp.code || "-";
        const office = offices[code] || (offices[code] = { employees: 0, trips: 0, rideSum: 0, rideCount: 0, rideMax: 0 });

        office.employees++;
        if (!countedInTrip.has(code)) {
          countedInTrip.add(code);
          office.trips++;
        }

        if (trip.kind === "Login" && trip.loginMin != null && emp.pickupMin != null) {
          const ride = trip.loginMin - emp.pickupMin;
          office.rideSum += ride;
          office.rideCount++;
          office.rideMax = Math.max(office.rideMax, ride);
        }
      });
    });

    return offices;
  }

  return { contactPhone, phoneFor, groupByDriver, analyseTrip, rankTrips, summariseOffices };
})();

// Settings and the column layout of the vendor trip sheet.
// If the vendor ever changes the sheet format, only this file needs editing.

const CONFIG = {
  storageKey: "gps-dispatch-sent",

  defaults: {
    signOff: "GPS TRAVELS Transport Team",
    speed: 25,      // km/h
    perStop: 3,     // extra minutes for every pickup after the first
    buffer: 10      // minimum safe margin before the login time, in minutes
  },

  // Column positions (0-based). A trip header row is followed by its employee rows.
  tripColumns: { time: 0, label: 1, kind: 2, vehicle: 3, driver: 4, phone: 6, km: 8, tripId: 10 },
  employeeColumns: { no: 0, pickup: 1, name: 2, gender: 3, address: 4, code: 5, area: 6, phone: 7 }
};

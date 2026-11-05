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

  // Fallback column positions (0-based), used when the sheet has no label row.
  // A trip header row is followed by its employee rows.
  tripColumns: { time: 0, label: 1, kind: 2, vehicle: 3, driver: 4, code: 5, phone: 6, km: 8, tripId: 10 },
  employeeColumns: { no: 0, pickup: 1, name: 2, gender: 3, address: 4, code: 5, area: 6, phone: 7 },

  // If the sheet has a label row (for example "Trip id", "drop location"), the
  // columns are found from those labels instead. Keywords are lower case, letters only.
  labelKeywords: {
    tripId: ["tripid"],
    code: ["droplocation", "dropoffice", "office"],
    phone: ["employesno", "employeeno", "employeemobile", "mobile", "phone"],
    area: ["loctaion", "location"]
  },

  // What goes into the WhatsApp message besides the basics.
  message: {
    showTripDrop: true,      // "Drop Location: C10" under the trip details
    showEmployeeDrop: true   // "Drop: C119" under every employee
  }
};
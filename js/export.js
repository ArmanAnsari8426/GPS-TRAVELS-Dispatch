// Saving files: the Excel report and the text file with all messages.

const Exports = (() => {
  const { formatClock } = Utils;

  function saveFile(name, data) {
    const blob = typeof data === "string"
      ? new Blob(["\ufeff" + data], { type: "text/plain;charset=utf-8" })
      : new Blob([data], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  const reportDate = (state) => (state.trips[0] && state.trips[0].date) || "report";

  function downloadReport(state) {
    const { trips, contacts, sent, settings } = state;

    const driverRows = [["Driver", "Mobile", "Vehicle", "Trip ID", "Trip", "Login", "Drop location", "Employees", "Status"]];
    const employeeRows = [["Trip ID", "Driver", "Vehicle", "Login", "Employee", "Gender", "Pickup", "Drop location", "Area", "Phone", "Address"]];

    trips.forEach((trip, index) => {
      const status = sent[Store.keyOf(trip, index)] ? "Sent" : "Not sent";
      driverRows.push([trip.driver, Analysis.phoneFor(trip, contacts), trip.vehicle, trip.tripId, trip.label, `${trip.kind} ${trip.time}`, trip.dropCode, trip.employees.length, status]);
      trip.employees.forEach((e) => {
        employeeRows.push([trip.tripId, trip.driver, trip.vehicle, trip.time, e.name, e.gender, e.pickup, e.code, e.area, e.phone, e.address]);
      });
    });

    const timingRows = [["Driver", "Vehicle", "First pickup", "Login", "Km", "Travel (min)", "Arrival", "Margin (min)", "Status", "Suggested start"]];
    Analysis.rankTrips(trips, settings).forEach(({ trip, info }) => {
      timingRows.push([
        trip.driver, trip.vehicle, formatClock(info.firstPickup), trip.time, trip.km, Math.round(info.travel),
        formatClock(info.arrival), Math.round(info.margin), info.status, info.suggestedStart == null ? "" : formatClock(info.suggestedStart)
      ]);
    });

    const officeRows = [["Drop location", "Employees", "Trips", "Avg ride (min)"]];
    const offices = Analysis.summariseOffices(trips);
    Object.keys(offices).sort().forEach((code) => {
      const o = offices[code];
      officeRows.push([code, o.employees, o.trips, o.rideCount ? Math.round(o.rideSum / o.rideCount) : ""]);
    });

    const book = XLSX.utils.book_new();
    [["Drivers", driverRows], ["Employees", employeeRows], ["Time analysis", timingRows], ["Offices", officeRows]]
      .forEach(([name, rows]) => XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), name));

    saveFile(`GPS_Travels_Report_${reportDate(state)}.xlsx`, XLSX.write(book, { type: "array", bookType: "xlsx" }));
  }

  function downloadMessages(state) {
    const { trips, contacts, settings } = state;

    const text = Analysis.groupByDriver(trips, contacts).map((group) => {
      const driver = trips[group.indexes[0]].driver;
      return `TO: ${driver} (${group.phone || "no number"})\n\n${Messages.build(trips, group.indexes, settings.signOff)}`;
    }).join("\n\n#####################\n\n");

    saveFile(`Messages_${reportDate(state)}.txt`, text);
  }

  return { downloadReport, downloadMessages };
})();
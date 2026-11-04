// The WhatsApp message sent to the driver.

const Messages = (() => {
  function tripText(trip) {
    const lines = [
      `*${trip.label}*${trip.date ? " | " + trip.date : ""}`,
      `${trip.kind} Time: *${trip.time}*`,
      `Vehicle: ${trip.vehicle}`,
      `Driver: ${trip.driver}`
    ];
    if (trip.tripId) lines.push(`Trip ID: ${trip.tripId}`);
    lines.push("", `*Pickup List (${trip.employees.length})*`);

    trip.employees.forEach((emp) => {
      lines.push("", `${emp.no}. *${emp.name}*${emp.gender ? ` (${emp.gender})` : ""}`);
      lines.push(`   Pickup: ${emp.pickup}${emp.area ? " | " + emp.area : ""}`);
      if (emp.phone) lines.push(`   Ph: ${emp.phone}`);
      if (emp.address) lines.push(`   Address: ${emp.address}`);
    });

    return lines.join("\n");
  }

  // One or more trips of the same driver, followed by the sign-off.
  function build(trips, indexes, signOff) {
    const body = indexes.map((i) => tripText(trips[i])).join("\n\n──────────────\n\n");
    return `${body}\n\n*${signOff}*`;
  }

  function whatsappUrl(text, phone) {
    return `https://wa.me/${phone ? "91" + phone : ""}?text=${encodeURIComponent(text)}`;
  }

  return { build, whatsappUrl };
})();

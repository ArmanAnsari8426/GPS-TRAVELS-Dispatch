// Small formatting helpers shared by the other files.

const Utils = (() => {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n) => String(n).padStart(2, "0");

  const clean = (value) => String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  const normalise = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const unique = (list) => [...new Set(list)];

  const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };
  const escapeHtml = (value) => String(value).replace(/[&<>]/g, (c) => ESCAPES[c]);

  // WhatsApp-style *bold* to <b>bold</b>, for the message preview.
  const boldToHtml = (text) => escapeHtml(text).replace(/\*([^*\n]+)\*/g, "<b>$1</b>");

  // 990 -> "4:30 PM"
  function formatClock(totalMinutes) {
    if (totalMinutes == null) return "-";
    const hours24 = ((Math.floor(totalMinutes / 60) % 24) + 24) % 24;
    const minutes = Math.round(totalMinutes % 60);
    const hours12 = hours24 % 12 || 12;
    return `${hours12}:${pad(minutes)} ${hours24 >= 12 ? "PM" : "AM"}`;
  }

  // Excel stores times as a fraction of a day; some files have plain "16:30" text instead.
  function toMinutes(value) {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value === "number") return Math.round((value - Math.floor(value)) * 1440) % 1440;
    const match = String(value).match(/(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }

  // Excel serial date or "2026-10-20" -> "20-Oct-2026"
  function toDateText(value) {
    if (typeof value === "number" && value > 20000) {
      const d = new Date(Math.round((value - 25569) * 86400000));
      return `${pad(d.getUTCDate())}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
    }
    const match = String(value || "").match(/(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}-${MONTHS[Number(match[2]) - 1]}-${match[1]}` : "";
  }

  // Keeps the last 10 digits, so "+91 98765-43210" and 9876543210 both work.
  function toPhone(value) {
    if (value === undefined || value === null || value === "") return "";
    const text = typeof value === "number" ? String(Math.round(value)) : String(value);
    return text.replace(/\D/g, "").slice(-10);
  }

  return { clean, normalise, unique, escapeHtml, boldToHtml, formatClock, toMinutes, toDateText, toPhone };
})();

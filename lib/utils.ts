export function formatDate(dateStr: string, style: "long" | "short" = "long"): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-CA", {
    weekday: style === "long" ? "long" : "short",
    month: style === "long" ? "long" : "short",
    day: "numeric",
  });
}

export function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h > 12 ? h - 12 : h || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

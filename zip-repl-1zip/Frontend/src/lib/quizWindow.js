// 2026-08-24: quiz time-window helpers.
// Quizzes may define full datetimes (start_at / end_at, "yyyy-mm-dd hh:mm:ss")
// for multi-day/week/month windows, or the legacy exam_date + start_time/end_time.
// Legacy end_time is treated as end-of-day (23:59) if absent.

export function quizStart(q) {
  if (q.start_at) return new Date(String(q.start_at).replace(" ", "T"));
  return new Date(`${q.exam_date || "1970-01-01"}T${q.start_time || "00:00"}`);
}

export function quizEnd(q) {
  if (q.end_at) return new Date(String(q.end_at).replace(" ", "T"));
  return new Date(`${q.exam_date || "1970-01-01"}T${q.end_time || "23:59"}`);
}

export function quizStatus(q, now = new Date()) {
  if (now < quizStart(q)) return "upcoming";
  if (now > quizEnd(q)) return "closed";
  return "active";
}

// "yyyy-mm-dd hh:mm" → value for <input type="datetime-local">
export function toLocalInput(dt) {
  return String(dt || "").slice(0, 16).replace(" ", "T");
}

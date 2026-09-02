// Centralized date/time formatting so the display format is identical
// everywhere in the app, regardless of the visitor's browser/OS locale
// settings (which is what caused dd/mm/yyyy vs mm/dd/yyyy inconsistency).

function pad(n) {
  return String(n).padStart(2, '0');
}

// dd/mm/yyyy — used for date-only displays (deadlines, due dates, periods)
export function formatDate(dateInput) {
  const d = new Date(dateInput);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// dd/mm/yyyy, hh:mm AM/PM — used for full timestamp displays (transaction list, tracking since)
export function formatDateTime(dateInput) {
  const d = new Date(dateInput);
  const datePart = formatDate(d);
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours;
  return `${datePart}, ${pad(hours)}:${minutes} ${ampm}`;
}
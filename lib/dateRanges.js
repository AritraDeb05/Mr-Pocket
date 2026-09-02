const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatFull(date) {
  return `${DAY_NAMES[date.getDay()]}, ${MONTH_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatShort(date) {
  return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`;
}

function formatShortWithYear(date) {
  return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatMonthYear(date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function getPeriodRange(periodType, referenceDate) {
  const ref = new Date(referenceDate);
  let start, end, label;

  if (periodType === 'daily') {
    start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0);
    end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59, 999);
    label = formatFull(start);
  } else if (periodType === 'weekly') {
    const day = ref.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + diffToMonday, 0, 0, 0);
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
    label = `${formatShort(start)} – ${formatShortWithYear(end)}`;
  } else if (periodType === 'monthly') {
    start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0);
    end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
    label = formatMonthYear(start);
  } else if (periodType === 'yearly') {
    start = new Date(ref.getFullYear(), 0, 1, 0, 0, 0);
    end = new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999);
    label = `${ref.getFullYear()}`;
  }

  return { start, end, label };
}

export function shiftPeriod(periodType, referenceDate, direction) {
  const ref = new Date(referenceDate);
  if (periodType === 'daily') ref.setDate(ref.getDate() + direction);
  else if (periodType === 'weekly') ref.setDate(ref.getDate() + direction * 7);
  else if (periodType === 'monthly') ref.setMonth(ref.getMonth() + direction);
  else if (periodType === 'yearly') ref.setFullYear(ref.getFullYear() + direction);
  return ref;
}

export function isCurrentPeriod(periodType, referenceDate) {
  const { start, end } = getPeriodRange(periodType, referenceDate);
  const now = new Date();
  return now >= start && now <= end;
}

export function buildTrendBuckets(periodType, start, end, transactions) {
  const buckets = [];

  if (periodType === 'daily') {
    for (let h = 0; h < 24; h += 3) {
      buckets.push({ label: `${h}:00`, hourStart: h, hourEnd: h + 3, inflow: 0, outflow: 0 });
    }
    transactions.forEach((t) => {
      const d = new Date(t.occurred_at);
      const h = d.getHours();
      const bucket = buckets.find((b) => h >= b.hourStart && h < b.hourEnd);
      if (bucket) bucket[t.type] += Number(t.amount);
    });
  } else if (periodType === 'weekly') {
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      buckets.push({ label: DAY_SHORT[d.getDay()], dateKey: d.toDateString(), inflow: 0, outflow: 0 });
    }
    transactions.forEach((t) => {
      const d = new Date(t.occurred_at);
      const bucket = buckets.find((b) => b.dateKey === d.toDateString());
      if (bucket) bucket[t.type] += Number(t.amount);
    });
  } else if (periodType === 'monthly') {
    const daysInMonth = end.getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      buckets.push({ label: `${i}`, day: i, inflow: 0, outflow: 0 });
    }
    transactions.forEach((t) => {
      const d = new Date(t.occurred_at);
      const bucket = buckets.find((b) => b.day === d.getDate());
      if (bucket) bucket[t.type] += Number(t.amount);
    });
  } else if (periodType === 'yearly') {
    MONTH_SHORT.forEach((m) => buckets.push({ label: m, inflow: 0, outflow: 0 }));
    transactions.forEach((t) => {
      const d = new Date(t.occurred_at);
      buckets[d.getMonth()].inflow += t.type === 'inflow' ? Number(t.amount) : 0;
      buckets[d.getMonth()].outflow += t.type === 'outflow' ? Number(t.amount) : 0;
    });
  }

  return buckets;
}
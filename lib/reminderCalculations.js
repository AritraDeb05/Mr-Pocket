export function getReminderStatus(reminder) {
  if (reminder.paid_at) {
    return { key: 'paid', label: 'Paid' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(reminder.due_date);
  due.setHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((due - today) / msPerDay);

  if (diffDays > 0) {
    return { key: 'upcoming', label: `Due In ${diffDays} Day${diffDays === 1 ? '' : 's'}` };
  }

  if (diffDays === 0) {
    return { key: 'due-today', label: 'Due Today' };
  }

  const daysOverdue = Math.abs(diffDays);
  return { key: 'late', label: `Late — ${daysOverdue} Day${daysOverdue === 1 ? '' : 's'} Overdue` };
}

// Given a reminder that's being marked paid, computes the due date of its
// next occurrence if it's recurring. Returns null for one-time reminders.
export function getNextOccurrenceDate(reminder) {
  if (reminder.recurrence === 'none') return null;

  const next = new Date(reminder.due_date);

  if (reminder.recurrence === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (reminder.recurrence === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  } else if (reminder.recurrence === 'yearly') {
    next.setFullYear(next.getFullYear() + 1);
  }

  return next.toISOString().slice(0, 10);
}

export function sortReminders(reminders) {
  // Unpaid first (soonest due date first), then paid ones at the bottom (most recently paid first).
  const unpaid = reminders.filter((r) => !r.paid_at).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const paid = reminders.filter((r) => r.paid_at).sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));
  return [...unpaid, ...paid];
}
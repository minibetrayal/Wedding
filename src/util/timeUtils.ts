function tz(timezone?: string): { timeZone: string } {
  return { timeZone: timezone || process.env.EVENT_TIMEZONE! }
};

export function formatDate(dateString: string, timezone?: string): string {
  return new Date(dateString).toLocaleDateString('en-AU', {
    dateStyle: 'full',
    ...tz(timezone)
  });
}

export function formatTime(dateString: string, timeString: string, timezone?: string): string {
  return new Date(`${dateString}T${timeString}`).toLocaleTimeString('en-AU', {
    timeStyle: 'short',
    ...tz(timezone)
  });
}

export function getDateParts(dateString: string, timezone?: string): any {
  const [day, month, year] = new Date(dateString)
    .toLocaleDateString('en-AU', { ...tz(timezone), day: 'numeric', month: 'numeric', year: 'numeric' })
    .split('/');
  return {day, month, year};
}

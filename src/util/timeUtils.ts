export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-AU', {
    dateStyle: 'full',
    timeZone: process.env.EVENT_TIMEZONE!
  });
}

export function formatTime(dateString: string, timeString: string): string {
  return new Date(`${dateString}T${timeString}`).toLocaleTimeString('en-AU', {
    timeStyle: 'short',
    timeZone: process.env.EVENT_TIMEZONE!
  });
}

export function getDateParts(dateString: string): { day: string; month: string; year: string } {
  const [day, month, year] = new Date(dateString)
    .toLocaleDateString('en-AU', { timeZone: process.env.EVENT_TIMEZONE!, day: 'numeric', month: 'numeric', year: 'numeric' })
    .split('/');
  return {day, month, year};
}

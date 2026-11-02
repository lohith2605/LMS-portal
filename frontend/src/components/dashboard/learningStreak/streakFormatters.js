/**
 * Format active study seconds into human-readable duration
 * @param {number} seconds
 * @param {boolean} [verbose=false]
 * @returns {string}
 */
export const formatStudyDuration = (seconds, verbose = false) => {
  const sec = Number(seconds) || 0;
  if (sec <= 0) {
    return verbose ? '0 minutes' : '0m';
  }

  if (sec < 60) {
    return verbose ? '< 1 minute' : '< 1m';
  }

  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);

  if (hours === 0) {
    return verbose ? `${minutes} minute${minutes !== 1 ? 's' : ''}` : `${minutes}m`;
  }

  if (minutes === 0) {
    return verbose ? `${hours} hour${hours !== 1 ? 's' : ''}` : `${hours}h`;
  }

  return verbose
    ? `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} min${minutes !== 1 ? 's' : ''}`
    : `${hours}h ${minutes}m`;
};

/**
 * Format a YYYY-MM-DD date key into a friendly readable date string
 * without timezone offset shifts.
 * @param {string} dateKey - 'YYYY-MM-DD'
 * @param {'short'|'full'|'dayOnly'} [format='short']
 * @returns {string}
 */
export const formatDateKeyToReadable = (dateKey, format = 'short') => {
  if (!dateKey || typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return 'Invalid Date';
  }

  const [year, month, day] = dateKey.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  if (format === 'dayOnly') {
    return utcDate.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' });
  }

  if (format === 'full') {
    return utcDate.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return utcDate.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  });
};


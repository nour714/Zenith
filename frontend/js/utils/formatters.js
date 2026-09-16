/**
 * Formatting helpers for durations and timestamps.
 */

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatDurationHuman(seconds, lang = 'ar') {
  if (!seconds || seconds <= 0) return lang === 'ar' ? '0 دقيقة' : '0 mins';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hrs > 0) {
    return lang === 'ar' ? `${hrs} ساعة و ${mins} دقيقة` : `${hrs}h ${mins}m`;
  }
  return lang === 'ar' ? `${mins} دقيقة` : `${mins} mins`;
}

export function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

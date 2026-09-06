// game/helpers/format.ts

/**
 * Abbreviates a number with K/M/B suffixes using one decimal place.
 * Examples: 33 -> "33", 1000 -> "1K", 33500 -> "33.5K", 1500000 -> "1.5M", 244000000000 -> "244B"
 */
export function formatNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1000) return Math.trunc(n).toString();
  if (abs < 1_000_000) {
    const value = n / 1000;
    return (value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)) + 'K';
  }
  if (abs < 1_000_000_000) {
    const value = n / 1_000_000;
    return (value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)) + 'M';
  }
  const value = n / 1_000_000_000;
  return (value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)) + 'B';
}

/**
 * Converts seconds to a human-readable time string.
 * Examples: 30 -> "30s", 90 -> "1m 30s", 3661 -> "1h 1m"
 */
export function formatTime(totalSeconds: number): string {
  const seconds = Math.floor(totalSeconds);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

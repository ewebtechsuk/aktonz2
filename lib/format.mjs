export function formatRentFrequency(freq) {
  if (!freq) return '';
  const map = {
    W: 'pw',
    M: 'pcm',
    Q: 'pq',
    Y: 'pa',
  };
  return map[freq] || freq;
}

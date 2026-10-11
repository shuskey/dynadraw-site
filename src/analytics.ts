// Fixed event names only: never send drawing contents, saved data, or email addresses.
export type AnalyticsEvent = 'Started creating' | 'Saved drawing' | 'Used example' | 'Added object' | 'Used continuous motion' | 'Used Draw' | '3D canvas failed';
const sent = new Set<AnalyticsEvent>();
export function track(event: AnalyticsEvent) {
  if (window.location.hostname !== 'dynadraw-studio.chummy-bard-6128.chatgpt.site' || sent.has(event)) return;
  try {
    const plausible = (window as Window & { plausible?: (name: string) => void }).plausible;
    if (!plausible) return;
    plausible(event);
    sent.add(event);
  } catch { /* Analytics must never interrupt drawing. */ }
}

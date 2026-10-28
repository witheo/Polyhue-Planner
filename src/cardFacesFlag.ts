// Spike (#17): opt-in via `?faces=1`, read once at module load. Off by default.
export const CARD_FACES_ENABLED =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('faces') === '1';

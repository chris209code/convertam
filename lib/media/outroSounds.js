// Built-in outro sound effects — short, self-hosted (public/sfx/), synthesized
// clips rather than a third-party stock-audio dependency. A user picks one
// (or none) as a signature sound that plays right at the end of their
// export, similar to how many short-form videos end on a little audio
// flourish rather than just cutting the music off.
export const OUTRO_SOUND_EFFECTS = [
  { id: 'chime', label: '🎵 Chime', url: '/sfx/chime.mp3' },
  { id: 'ding', label: '🔔 Ding', url: '/sfx/ding.mp3' },
  { id: 'pop', label: '🫧 Pop', url: '/sfx/pop.mp3' },
  { id: 'riser', label: '🚀 Riser', url: '/sfx/riser.mp3' },
];

export function outroSoundById(id) {
  return OUTRO_SOUND_EFFECTS.find((s) => s.id === id) || null;
}

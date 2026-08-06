// International Morse Code — letters, digits and common punctuation.
// Convention: within a letter, dots/dashes have no separator; letters in a
// word are separated by a single space; words are separated by " / ".
export const MORSE_MAP = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.',
  H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.',
  O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-',
  V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
  '"': '.-..-.', '$': '...-..-', '@': '.--.-.',
};

export const REVERSE_MORSE_MAP = Object.fromEntries(
  Object.entries(MORSE_MAP).map(([char, code]) => [code, char])
);

// Alphabet + digits only — the practice/learn pool (punctuation is niche
// enough that quizzing on it would frustrate rather than teach).
export const LEARNABLE_CHARS = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ...'0123456789',
];

export function textToMorse(text) {
  return text
    .toUpperCase()
    .split(/(\s+)/) // keep whitespace runs so multiple spaces still map to word gaps
    .filter((chunk) => chunk !== '')
    .map((chunk) => {
      if (/^\s+$/.test(chunk)) return '/';
      return chunk
        .split('')
        .map((char) => MORSE_MAP[char])
        .filter(Boolean)
        .join(' ');
    })
    .filter(Boolean)
    .join(' ');
}

export function morseToText(morse) {
  return morse
    .trim()
    .split(/\s*\/\s*/)
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((code) => REVERSE_MORSE_MAP[code] || '')
        .join('')
    )
    .join(' ');
}

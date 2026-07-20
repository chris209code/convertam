// Password Studio — pure calculation engine.
// Everything here runs synchronously in the browser using crypto.getRandomValues().
// No network calls, no storage, nothing persisted — inputs/outputs are plain
// values the calling components hold in React state only.

// ---------------------------------------------------------------------------
// Secure randomness
// ---------------------------------------------------------------------------
export function secureRandomInt(maxExclusive) {
  if (maxExclusive <= 0) return 0;
  const range = maxExclusive;
  const maxUint32 = 0xffffffff;
  const limit = maxUint32 - (maxUint32 % range);
  const buf = new Uint32Array(1);
  let x;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x > limit);
  return x % range;
}

export function secureRandomItem(arr) {
  return arr[secureRandomInt(arr.length)];
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Character sets
// ---------------------------------------------------------------------------
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}<>?/.,~';
const SIMILAR = 'il1LoO0'; // characters that look alike
const AMBIGUOUS = '{}[]()/\\\'"`~,;:.<>';

function applyExclusions(str, { excludeSimilar, excludeAmbiguous }) {
  let out = str;
  if (excludeSimilar) out = out.split('').filter((c) => !SIMILAR.includes(c)).join('');
  if (excludeAmbiguous) out = out.split('').filter((c) => !AMBIGUOUS.includes(c)).join('');
  return out;
}

// ---------------------------------------------------------------------------
// Mode 1 — Random Password
// ---------------------------------------------------------------------------
export function generateRandomPasswords({
  length = 16,
  useUpper = true,
  useLower = true,
  useNumbers = true,
  useSymbols = true,
  excludeSimilar = false,
  excludeAmbiguous = false,
  count = 1,
}) {
  const pools = [];
  if (useUpper) pools.push(applyExclusions(UPPER, { excludeSimilar, excludeAmbiguous }));
  if (useLower) pools.push(applyExclusions(LOWER, { excludeSimilar, excludeAmbiguous }));
  if (useNumbers) pools.push(applyExclusions(NUMBERS, { excludeSimilar, excludeAmbiguous }));
  if (useSymbols) pools.push(applyExclusions(SYMBOLS, { excludeSimilar, excludeAmbiguous }));

  const usablePools = pools.filter((p) => p.length > 0);
  if (usablePools.length === 0) return { success: false, message: 'Select at least one character type to generate a password.', results: [] };

  const fullPool = usablePools.join('');
  const results = [];
  const n = Math.max(1, Math.min(20, count));

  for (let i = 0; i < n; i++) {
    let chars;
    if (length < usablePools.length) {
      // Not enough room to guarantee one of each type — just draw from the combined pool.
      chars = Array.from({ length }, () => secureRandomItem(fullPool.split('')));
    } else {
      // Guarantee at least one character from every selected type, then fill the rest randomly.
      chars = usablePools.map((pool) => secureRandomItem(pool.split('')));
      while (chars.length < length) chars.push(secureRandomItem(fullPool.split('')));
      chars = shuffle(chars);
    }
    results.push(chars.join(''));
  }

  return { success: true, results };
}

// ---------------------------------------------------------------------------
// Mode 3 — Passphrase (word list embedded, no network)
// ---------------------------------------------------------------------------
export const PASSPHRASE_WORDS = [
  'correct','horse','battery','staple','orbit','garden','velvet','cactus','marble','sunset',
  'harbor','falcon','maple','copper','ember','ridge','quartz','willow','canyon','lantern',
  'meadow','glacier','thistle','beacon','cedar','breeze','comet','dune','fable','granite',
  'hollow','ivory','jasper','kindle','lagoon','mosaic','nectar','opal','pebble','quill',
  'ranger','summit','tundra','umber','violet','wander','yonder','zephyr','anchor','bramble',
  'clover','drift','echo','forge','glimmer','harvest','island','jungle','kettle','lumber',
  'mantle','nimbus','orchard','pinnacle','quiver','raven','sable','timber','urban','valley',
  'whisper','xenon','yield','zenith','amber','birch','coral','delta','ferry','grove',
  'haven','ink','jade','knot','lark','moss','north','oak','plume','quest',
  'river','stone','trail','union','vapor','wharf','ash','brook','crest','dawn',
  'echoes','frost','gale','hazel','iris','juniper','karma','loop','misty','nova',
  'onyx','pine','quiet','rustic','shale','trove','vista','wisp','yarrow','zebra',
  'alpine','boulder','current','denim','ebony','flint','grain','horizon','ion','jetty',
  'knoll','ledge','mint','nettle','odyssey','pilot','quarry','ripple','spruce','tide',
  'unity','verge','wagon','yeti','zeal','acorn','blaze','cinder','dapple','elm',
  'fjord','gable','hearth','indigo','jolt','keystone','lush','morrow','nook','oasis',
  'panther','quokka','robin','sparrow','talon','uplift','vulture','wolf','yak','zebu',
  'almond','basil','chili','dill','fennel','ginger','herb','kale','lime','mango',
  'nutmeg','olive','papaya','quince','rye','sage','thyme','vanilla','walnut','brass',
  'gold','iron','lead','nickel','platinum','silver','steel','tin','zinc','arch',
  'bridge','castle','dock','fence','gate','hut','inn','lodge','manor','pier',
  'quay','ranch','shed','tower','vault','yard','blossom','bud','fern','leaf',
  'lotus','orchid','petal','root','stem','thorn','vine','bloom','branch','canopy',
  'forest','hedge','pollen','cave','cliff','crag','desert','fjell','glade','gorge',
  'hill','lake','marsh','peak','plain','plateau','pond','reef','shore','slope',
  'swamp','cascade','creek','estuary','fountain','geyser','rapids','spring','stream','torrent',
  'wave','abbey','arena','attic','balcony','barn','cabin','chapel','cottage','cove',
  'den','dome','garret','gazebo','hangar','hive','kiosk','mill','pavilion','porch',
  'shack','silo','stable','studio','turret','villa','acre','bay','bend','bluff',
  'burrow','chasm','crater','dell','gulch','mesa','moor','pass','ravine','sanctuary',
  'terrace','trench','wetland',
];

export function generatePassphrases({
  wordCount = 4,
  separator = '-',
  capitalization = 'none', // none | first | all | random
  includeNumber = false,
  includeSymbol = false,
  symbolsPool = '!@#$%',
  count = 1,
}) {
  const n = Math.max(1, Math.min(20, count));
  const sep = separator === 'space' ? ' ' : separator === 'random' ? null : separator;
  const results = [];

  for (let i = 0; i < n; i++) {
    let words = Array.from({ length: Math.max(2, wordCount) }, () => secureRandomItem(PASSPHRASE_WORDS));
    words = words.map((w, idx) => {
      if (capitalization === 'all') return w[0].toUpperCase() + w.slice(1);
      if (capitalization === 'first' && idx === 0) return w[0].toUpperCase() + w.slice(1);
      if (capitalization === 'random' && secureRandomInt(2) === 0) return w[0].toUpperCase() + w.slice(1);
      return w;
    });

    const joiners = ['-', '_', '.', ' '];
    let value = words.reduce((acc, w, idx) => {
      if (idx === 0) return w;
      const j = sep === null ? secureRandomItem(joiners) : sep;
      return acc + j + w;
    }, '');

    if (includeNumber) {
      const num = String(secureRandomInt(90) + 10);
      value += (sep === null ? secureRandomItem(joiners) : sep) + num;
    }
    if (includeSymbol && symbolsPool.length > 0) {
      value += secureRandomItem(symbolsPool.split(''));
    }

    results.push({ value, wordCount: words.length });
  }

  return { success: true, results };
}

// ---------------------------------------------------------------------------
// Mode 2 — Smart Word Builder (intelligent length engine)
// ---------------------------------------------------------------------------
function applyCapitalization(words, mode, targetWordIndex) {
  return words.map((w, i) => {
    if (mode === 'none') return w.toLowerCase();
    if (mode === 'beginning') return i === 0 ? capFirst(w) : w.toLowerCase();
    if (mode === 'end') return i === words.length - 1 ? capFirst(w) : w.toLowerCase();
    if (mode === 'middle') return i === Math.floor((words.length - 1) / 2) ? capFirst(w) : w.toLowerCase();
    if (mode === 'random') return secureRandomInt(2) === 0 ? capFirst(w) : w.toLowerCase();
    if (mode === 'choose') return i === targetWordIndex ? capFirst(w) : w.toLowerCase();
    if (mode === 'all') return capFirst(w);
    return w;
  });
}
function capFirst(w) {
  return w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w;
}

function insertAt(parts, placement, token) {
  // parts: array of word-strings (already capitalized). Returns a single joined string.
  if (!token) return parts.join('');
  if (parts.length === 0) return token;
  switch (placement) {
    case 'beginning':
      return token + parts.join('');
    case 'end':
      return parts.join('') + token;
    case 'between': {
      if (parts.length === 1) return parts[0] + token;
      const mid = Math.floor(parts.length / 2);
      return parts.slice(0, mid).join('') + token + parts.slice(mid).join('');
    }
    case 'middle': {
      const joined = parts.join('');
      const mid = Math.floor(joined.length / 2);
      return joined.slice(0, mid) + token + joined.slice(mid);
    }
    case 'random': {
      const positions = ['beginning', 'end', 'between'];
      return insertAt(parts, secureRandomItem(positions), token);
    }
    default:
      return parts.join('') + token;
  }
}

// Enumerate non-empty subsets of word indices, preserving original order.
// Bounded so it never explodes for a large word list.
function enumerateSubsets(n) {
  const cap = Math.min(n, 12);
  const subsets = [];
  const total = 1 << cap;
  for (let mask = 1; mask < total; mask++) {
    const indices = [];
    for (let i = 0; i < cap; i++) if (mask & (1 << i)) indices.push(i);
    subsets.push(indices);
  }
  // If there are more than 12 words, always include the "all words" combo too.
  if (n > 12) subsets.push(Array.from({ length: n }, (_, i) => i));
  return subsets;
}

function bestFitToken(pool, remaining) {
  // pool: array of strings (numbers or symbols). Pick the one whose length is
  // closest to (but not exceeding, when possible) `remaining`.
  if (!pool || pool.length === 0) return null;
  const fitting = pool.filter((t) => t.length <= remaining);
  const candidates = fitting.length > 0 ? fitting : pool;
  return candidates.reduce((best, t) => {
    if (!best) return t;
    const bestDiff = Math.abs(remaining - best.length);
    const tDiff = Math.abs(remaining - t.length);
    return tDiff < bestDiff ? t : best;
  }, null);
}

function randomDigits(len) {
  let out = '';
  for (let i = 0; i < len; i++) out += secureRandomItem(NUMBERS.split(''));
  return out;
}

export function buildSmartPasswords({
  words = [],
  numbers = [],
  symbols = [],
  targetLength = 16,
  capitalizationMode = 'beginning', // none | beginning | middle | end | random | choose | all
  capitalizeWordIndex = 0,
  numberPlacement = 'end', // beginning | middle | between | end | random | none
  symbolPlacement = 'end', // beginning | middle | between | end | random | none
  count = 4,
}) {
  const cleanWords = words.map((w) => (w || '').trim()).filter(Boolean);
  if (cleanWords.length === 0) {
    return { success: false, message: 'Add at least one word to build a Smart Word Builder password.', results: [], suggestions: [] };
  }

  const subsets = enumerateSubsets(cleanWords.length)
    .map((idxs) => idxs.map((i) => cleanWords[i]))
    // Prefer combos closer to using the full word set (more memorable), so sort later by score not just length.
    .filter((combo) => combo.length > 0);

  const wantsNumber = numberPlacement !== 'none';
  const wantsSymbol = symbolPlacement !== 'none' && symbols.length > 0;

  const candidates = [];
  for (const combo of subsets) {
    const wordsLen = combo.reduce((s, w) => s + w.length, 0);
    let remaining = targetLength - wordsLen;

    // Reserve space for the number/symbol tokens we intend to insert.
    let numberToken = '';
    let symbolToken = '';

    if (remaining > 0) {
      if (wantsNumber) {
        const pool = numbers.length > 0 ? numbers.map(String) : null;
        const reserveForSymbol = wantsSymbol ? 1 : 0;
        const budget = Math.max(0, remaining - reserveForSymbol);
        numberToken = pool ? (bestFitToken(pool, budget) || '') : randomDigits(Math.max(1, Math.min(4, budget)));
        if (numberToken.length > remaining) numberToken = numberToken.slice(0, Math.max(0, remaining));
      }
      remaining -= numberToken.length;
      if (wantsSymbol && remaining > 0) {
        symbolToken = String(secureRandomItem(symbols));
        if (symbolToken.length > remaining) symbolToken = '';
      }
      remaining -= symbolToken.length;
      // Any leftover gets absorbed by padding the number with extra random digits
      // (keeps output at/near requested length without cutting words).
      if (remaining > 0 && wantsNumber) {
        numberToken += randomDigits(remaining);
        remaining = 0;
      }
    } else if (remaining === 0) {
      if (wantsNumber && numbers.length > 0) numberToken = ''; // words alone already hit the target; skip padding
    }

    const finalLength = wordsLen + numberToken.length + symbolToken.length;
    const diff = Math.abs(finalLength - targetLength);
    // Only accept combos that don't wildly overshoot the target (words alone too long).
    if (wordsLen > targetLength + 2) continue;

    candidates.push({ combo, numberToken, symbolToken, finalLength, diff, wordCount: combo.length });
  }

  if (candidates.length === 0) {
    const shortest = cleanWords.reduce((s, w) => s + w.length, 0);
    return {
      success: false,
      message: `None of your words fit a ${targetLength}-character password without cutting them. Your shortest combination is ${cleanWords[0]?.length || 0} characters and your full word set is ${shortest} characters. Try increasing the desired length, adding shorter words, or removing a word.`,
      results: [],
      suggestions: [
        `Try a length of at least ${cleanWords[0]?.length || targetLength} characters.`,
        'Add one or two shorter words to give the engine more combinations to work with.',
        'Provide a few numbers so we can pad out the remaining length precisely.',
      ],
    };
  }

  // Rank: closest to target length first, then prefer using more of the user's words (memorability).
  candidates.sort((a, b) => a.diff - b.diff || b.wordCount - a.wordCount);

  const n = Math.max(1, Math.min(20, count));
  const chosen = [];
  const seen = new Set();
  for (const c of candidates) {
    const key = c.combo.join('|') + '#' + c.finalLength;
    if (seen.has(key) && chosen.length < candidates.length) continue;
    seen.add(key);
    chosen.push(c);
    if (chosen.length >= n) break;
  }
  // If we don't have enough distinct combos, allow repeats with different capitalization/placement.
  while (chosen.length < n) chosen.push(candidates[secureRandomInt(candidates.length)]);

  const results = chosen.map(({ combo, numberToken, symbolToken }) => {
    const capitalized = applyCapitalization(combo, capitalizationMode, capitalizeWordIndex);
    let value = insertAt(capitalized, numberPlacement === 'none' ? 'end' : numberPlacement, numberToken);
    if (symbolToken) {
      // Re-run insertion on the already-combined string by treating it as a single "word" part.
      value = insertAt([value], symbolPlacement === 'none' ? 'end' : symbolPlacement, symbolToken);
    }
    return { value, wordsUsed: combo, wordCount: combo.length };
  });

  return { success: true, results };
}

// ---------------------------------------------------------------------------
// Analysis — strength, entropy, crack time, character breakdown
// ---------------------------------------------------------------------------
function poolSizeForPassword(password) {
  let size = 0;
  if (/[a-z]/.test(password)) size += 26;
  if (/[A-Z]/.test(password)) size += 26;
  if (/[0-9]/.test(password)) size += 10;
  if (/[^a-zA-Z0-9]/.test(password)) size += 32;
  return size || 1;
}

function formatCrackTime(seconds) {
  if (seconds < 1) return 'Instantly';
  const units = [
    ['century', 'centuries', 60 * 60 * 24 * 365 * 100],
    ['year', 'years', 60 * 60 * 24 * 365],
    ['day', 'days', 60 * 60 * 24],
    ['hour', 'hours', 60 * 60],
    ['minute', 'minutes', 60],
    ['second', 'seconds', 1],
  ];
  for (const [singular, plural, unitSeconds] of units) {
    const value = seconds / unitSeconds;
    if (value >= 1) {
      const rounded = value >= 100 ? Math.round(value).toLocaleString() : value.toFixed(1);
      return `${rounded} ${value >= 2 ? plural : singular}`;
    }
  }
  return 'Instantly';
}

// `wordEntropyBits`, when supplied, overrides the character-pool entropy
// estimate. Real dictionary-word passphrases are far weaker than treating
// each character as independently random (an attacker who suspects a
// wordlist attacks word-by-word, not character-by-character) — pass the
// wordlist-based estimate (see PASSPHRASE_WORDS-based calc below) for those.
export function analyzePassword(password, { wordEntropyBits } = {}) {
  if (!password) {
    return { length: 0, upperCount: 0, lowerCount: 0, numberCount: 0, symbolCount: 0, entropyBits: 0, strengthLabel: 'Weak', crackTimeLabel: 'Instantly' };
  }
  const length = password.length;
  const upperCount = (password.match(/[A-Z]/g) || []).length;
  const lowerCount = (password.match(/[a-z]/g) || []).length;
  const numberCount = (password.match(/[0-9]/g) || []).length;
  const symbolCount = (password.match(/[^a-zA-Z0-9]/g) || []).length;

  const poolSize = poolSizeForPassword(password);
  const entropyBits = Math.round(typeof wordEntropyBits === 'number' ? wordEntropyBits : length * Math.log2(poolSize));

  let strengthLabel = 'Weak';
  if (entropyBits >= 80) strengthLabel = 'Very Strong';
  else if (entropyBits >= 60) strengthLabel = 'Strong';
  else if (entropyBits >= 35) strengthLabel = 'Fair';

  // Offline fast-hash attacker assumption: ~10 billion guesses/sec, half the
  // keyspace on average.
  const guessesPerSecond = 1e10;
  const seconds = Math.pow(2, entropyBits) / guessesPerSecond / 2;
  const crackTimeLabel = formatCrackTime(seconds);

  return { length, upperCount, lowerCount, numberCount, symbolCount, entropyBits, strengthLabel, crackTimeLabel };
}

// Wordlist-based entropy for a generated passphrase: log2(dictionary size)
// per word, plus the extra bits contributed by an appended number/symbol.
export function passphraseEntropyBits({ wordCount, includeNumber, includeSymbol, symbolsPoolSize }) {
  let bits = wordCount * Math.log2(PASSPHRASE_WORDS.length);
  if (includeNumber) bits += Math.log2(90); // one random 2-digit number, 10-99
  if (includeSymbol && symbolsPoolSize > 0) bits += Math.log2(symbolsPoolSize);
  return bits;
}

export function rememberabilityScore(mode, meta = {}) {
  if (mode === 'random') {
    // Pure random strings are inherently hard to remember; longer = harder.
    if (meta.length <= 8) return 2;
    if (meta.length <= 12) return 1;
    return 1;
  }
  if (mode === 'passphrase') {
    const wc = meta.wordCount || 4;
    if (wc <= 4) return 5;
    if (wc <= 6) return 4;
    return 3;
  }
  if (mode === 'smart') {
    const wc = meta.wordCount || 2;
    if (wc >= 3) return 4;
    if (wc === 2) return 5;
    return 3;
  }
  return 3;
}

export function starString(score) {
  const s = Math.max(1, Math.min(5, Math.round(score)));
  return '★'.repeat(s) + '☆'.repeat(5 - s);
}

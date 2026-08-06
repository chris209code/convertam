// Timing follows the PARIS standard: unit length (seconds) = 1.2 / wpm.
// dot = 1 unit, dash = 3 units, gap within a letter = 1 unit,
// gap between letters = 3 units, gap between words = 7 units.
function buildSchedule(morse, unitSeconds) {
  const words = morse.trim().split(/\s*\/\s*/).filter(Boolean);
  const events = []; // { start, dur, wordIndex, letterIndex } in seconds
  let cursor = 0;
  words.forEach((word, wi) => {
    const letters = word.split(/\s+/).filter(Boolean);
    letters.forEach((letter, li) => {
      const symbols = letter.split('');
      const letterStart = cursor;
      symbols.forEach((sym, si) => {
        const dur = (sym === '-' ? 3 : 1) * unitSeconds;
        events.push({ start: cursor, dur, wordIndex: wi, letterIndex: li, symbol: sym, symbolIndex: si });
        cursor += dur;
        const isLastSymbol = si === symbols.length - 1;
        const isLastLetter = li === letters.length - 1;
        const isLastWord = wi === words.length - 1;
        let gapUnits;
        if (!isLastSymbol) gapUnits = 1;
        else if (!isLastLetter) gapUnits = 3;
        else if (!isLastWord) gapUnits = 7;
        else gapUnits = 0;
        cursor += gapUnits * unitSeconds;
      });
      // Attach a whole-letter span for highlight purposes (first symbol start → last symbol end).
      events.push({ letterSpan: true, start: letterStart, end: cursor, wordIndex: wi, letterIndex: li });
    });
  });
  return { events, totalDuration: cursor };
}

let activeAudio = null;

export function playMorse(morse, { wpm = 15, frequency = 600, onLetter, onSymbol, onDone } = {}) {
  stopMorse();
  if (!morse || !morse.trim()) return () => {};

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  const unit = 1.2 / wpm;
  const { events, totalDuration } = buildSchedule(morse, unit);
  const startAt = ctx.currentTime + 0.05;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.frequency.value = frequency;
  osc.connect(gain).connect(ctx.destination);
  osc.start();

  const timeouts = [];
  events.forEach((ev) => {
    if (ev.letterSpan) {
      if (onLetter) {
        timeouts.push(setTimeout(() => onLetter({ wordIndex: ev.wordIndex, letterIndex: ev.letterIndex, active: true }), ev.start * 1000));
        timeouts.push(setTimeout(() => onLetter({ wordIndex: ev.wordIndex, letterIndex: ev.letterIndex, active: false }), ev.end * 1000));
      }
      return;
    }
    gain.gain.setValueAtTime(1, startAt + ev.start);
    gain.gain.setValueAtTime(0, startAt + ev.start + ev.dur);
    if (onSymbol) {
      timeouts.push(setTimeout(() => onSymbol({ symbol: ev.symbol, symbolIndex: ev.symbolIndex, wordIndex: ev.wordIndex, letterIndex: ev.letterIndex, active: true }), ev.start * 1000));
      timeouts.push(setTimeout(() => onSymbol({ symbol: ev.symbol, symbolIndex: ev.symbolIndex, wordIndex: ev.wordIndex, letterIndex: ev.letterIndex, active: false }), (ev.start + ev.dur) * 1000));
    }
  });

  const doneTimeout = setTimeout(() => {
    stopMorse();
    if (onDone) onDone();
  }, (totalDuration + 0.15) * 1000);
  timeouts.push(doneTimeout);

  activeAudio = { ctx, osc, timeouts };
  return stopMorse;
}

export function stopMorse() {
  if (!activeAudio) return;
  const { ctx, osc, timeouts } = activeAudio;
  timeouts.forEach(clearTimeout);
  try { osc.stop(); } catch { /* already stopped */ }
  ctx.close();
  activeAudio = null;
}

export function generateMorseWav(morse, { wpm = 15, frequency = 600, sampleRate = 44100 } = {}) {
  const unit = 1.2 / wpm;
  const { events, totalDuration } = buildSchedule(morse, unit);
  const attack = 0.003; // seconds — quick fade to avoid clicks
  const totalSamples = Math.max(1, Math.ceil((totalDuration + 0.1) * sampleRate));
  const samples = new Float32Array(totalSamples);

  events.filter((ev) => !ev.letterSpan).forEach(({ start, dur }) => {
    const startSample = Math.floor(start * sampleRate);
    const endSample = Math.min(totalSamples, Math.floor((start + dur) * sampleRate));
    for (let s = startSample; s < endSample; s++) {
      const t = s / sampleRate;
      const localT = t - start;
      const envelope = Math.min(1, localT / attack, (dur - localT) / attack);
      samples[s] = Math.sin(2 * Math.PI * frequency * t) * Math.max(0, Math.min(1, envelope));
    }
  });

  return encodeWav(samples, sampleRate);
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

'use client';

// The normalized transcription provider interface the spec asks for:
// transcribeMedia({ file }) -> a normalized transcript (see transcript.js).
// Today there is exactly one implementation (Gemini, via /api/media-
// transcribe), but every caller in the app goes through this function
// rather than talking to the route directly — swapping or adding a second
// provider later (a dedicated ASR API with real diarization/word
// timestamps, say) means changing this one file, not every call site.

import { fileToTranscribeWav } from '../audioEncode';
import { normalizeTranscript } from '../transcript';
import { TRANSCRIBE_SAMPLE_RATE, validateTranscribeDuration } from '../limits';

export class TranscriptionError extends Error {
  constructor(message, category) {
    super(message);
    this.category = category || 'unexpected';
  }
}

// `file` may be any audio or video File the browser can decode — video
// files have their audio track decoded the same way audio extraction does
// (see audioEncode.js), so a caller never needs to extract audio first.
export async function transcribeMedia({ file, onStatus }) {
  onStatus?.('preparing');
  let wav, durationSeconds;
  try {
    ({ blob: wav, durationSeconds } = await fileToTranscribeWav(file, TRANSCRIBE_SAMPLE_RATE));
  } catch (err) {
    throw new TranscriptionError(err.message || 'Could not read this file\'s audio.', 'invalid_file');
  }

  const durationError = validateTranscribeDuration(durationSeconds);
  if (durationError) throw new TranscriptionError(durationError, 'invalid_request');

  onStatus?.('transcribing');
  const formData = new FormData();
  formData.append('audio', wav, 'audio.wav');
  formData.append('durationSeconds', String(durationSeconds));

  let res;
  try {
    res = await fetch('/api/media-transcribe', { method: 'POST', body: formData });
  } catch {
    throw new TranscriptionError('Could not reach the transcription service. Check your connection and try again.', 'transient');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new TranscriptionError(data?.error || 'Transcription failed. Please try again.', data?.category || 'unexpected');
  }

  onStatus?.('done');
  return normalizeTranscript(data);
}

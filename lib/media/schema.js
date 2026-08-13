// Gemini responseSchema + prompt for audio transcription. Deliberately does
// NOT ask for speaker labels or word-level timestamps: Gemini's plain
// generateContent isn't a dedicated diarization or forced-alignment model,
// and asking it to produce those anyway risks it returning plausible-
// looking but fabricated values — exactly what the spec forbids ("never
// fabricate information the provider does not supply"). Segment-level
// start/end + text is what a general-purpose multimodal model can actually
// support reliably from audio input.

export const TRANSCRIBE_PROMPT = `You are a speech transcription engine. Listen to the attached audio and produce an accurate, verbatim transcript.

Break the transcript into natural segments (roughly one sentence or clause each). For every segment, report:
- start: the segment's start time in seconds from the beginning of the audio (a number, e.g. 12.5)
- end: the segment's end time in seconds (a number, always greater than start)
- text: the exact words spoken in that segment

Also report:
- language: the spoken language, as a short label (e.g. "English", "Spanish") — or null if you cannot determine it
- duration: the total duration of the audio in seconds, your best estimate from what you heard

Rules:
- Transcribe exactly what is said. Do not summarize, paraphrase, or clean up filler words.
- If a stretch of audio is silent, unintelligible, or non-speech (music, noise), do not invent words for it — either omit that stretch or use "[inaudible]" for a segment that clearly contains attempted speech you cannot make out.
- Segment start/end times must be in order and must not overlap.
- If the audio contains no speech at all, return an empty segments array.`;

export const TRANSCRIBE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    language: { type: 'STRING' },
    duration: { type: 'NUMBER' },
    segments: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          start: { type: 'NUMBER' },
          end: { type: 'NUMBER' },
          text: { type: 'STRING' },
        },
        required: ['start', 'end', 'text'],
      },
    },
  },
  required: ['segments'],
};

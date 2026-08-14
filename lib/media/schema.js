// Gemini responseSchema + prompt for audio transcription. Deliberately does
// NOT ask for speaker labels or word-level timestamps: Gemini's plain
// generateContent isn't a dedicated diarization or forced-alignment model,
// and asking it to produce those anyway risks it returning plausible-
// looking but fabricated values — exactly what the spec forbids ("never
// fabricate information the provider does not supply"). Segment-level
// start/end + text is what a general-purpose multimodal model can actually
// support reliably from audio input.

export const TRANSCRIBE_PROMPT = `You are a speech transcription engine. Listen to the attached audio and produce an accurate, verbatim transcript.

Break the transcript into short caption-length segments — like subtitles, not paragraphs. For every segment, report:
- start: the segment's start time in seconds from the beginning of the audio (a number, e.g. 12.5)
- end: the segment's end time in seconds (a number, always greater than start)
- text: the exact words spoken in that segment

Also report:
- language: the spoken language, as a short label (e.g. "English", "Spanish") — or null if you cannot determine it
- duration: the total duration of the audio in seconds, your best estimate from what you heard

Segmentation rules (read carefully — this is the part transcription engines most often get wrong):
- Never combine more than one complete sentence into a single segment, even if they're spoken back-to-back with no pause. A run of several short sentences ("It is oh. It is yes.") must become several short segments, not one long one.
- Target roughly 2-6 seconds of audio per segment. If a single sentence runs longer than that, split it at a natural clause or breath boundary rather than leaving one oversized segment.
- Each segment's start and end must tightly track the actual moment those specific words are spoken — not a loose estimate covering a wider span "close enough." A viewer reading captions in sync with the video should see each segment's text appear and disappear right as those words are said, never lingering on screen after the speaker has already moved on to a different sentence.

Other rules:
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

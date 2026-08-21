// Gemini responseSchema for the Contract Summarizer's full structured
// breakdown. lib/contractSummarize/prompt.js supplies the matching prompt —
// the two files must stay in sync since the model is only as structured as
// the schema it's constrained to.
//
// Free-text fields the model can't determine from the contract should read
// the literal string "Not specified in the contract." rather than being
// left blank or guessed at — enforced by the prompt, not by this schema.
//
// There is deliberately no "legal jargon glossary" field anywhere in this
// schema — every explanation field below is meant to already be plain
// English on its own (the prompt is what enforces that), not a legal
// summary paired with a separate definitions list.
//
// Almost every fact-bearing field is a {value, location} (or {text,
// location} / clause-shaped {..., location}) pair rather than a bare
// string, so the UI can always show the reader exactly where in the
// original document a given fact came from.

const sourced = {
  type: 'OBJECT',
  properties: { value: { type: 'STRING' }, location: { type: 'STRING' } },
  required: ['value'],
};

const sourcedText = {
  type: 'OBJECT',
  properties: { text: { type: 'STRING' }, location: { type: 'STRING' } },
  required: ['text'],
};

const clauseItem = {
  type: 'OBJECT',
  properties: {
    topic: { type: 'STRING' },
    label: { type: 'STRING' },
    explanation: { type: 'STRING' },
    location: { type: 'STRING' },
  },
  required: ['topic', 'explanation'],
};

const perspectiveItem = {
  type: 'OBJECT',
  properties: {
    point: { type: 'STRING' },
    explanation: { type: 'STRING' },
    location: { type: 'STRING' },
  },
  required: ['point', 'explanation'],
};

export const contractSummarySchema = {
  type: 'OBJECT',
  properties: {
    quickSummary: { type: 'STRING' },
    parties: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { name: { type: 'STRING' }, role: { type: 'STRING' }, location: { type: 'STRING' } },
        required: ['name', 'role'],
      },
    },
    importantDates: {
      type: 'OBJECT',
      properties: {
        effectiveDate: sourced,
        endDate: sourced,
        renewalDates: sourced,
        noticePeriods: sourced,
        paymentDueDates: sourced,
        otherDeadlines: sourced,
      },
      required: ['effectiveDate', 'endDate'],
    },
    obligations: {
      type: 'OBJECT',
      properties: {
        partyALabel: { type: 'STRING' },
        partyAObligations: { type: 'ARRAY', items: sourcedText },
        partyBLabel: { type: 'STRING' },
        partyBObligations: { type: 'ARRAY', items: sourcedText },
      },
      required: ['partyALabel', 'partyAObligations', 'partyBLabel', 'partyBObligations'],
    },
    moneyAndPayment: {
      type: 'OBJECT',
      properties: {
        contractValue: sourced,
        fees: sourced,
        paymentSchedule: sourced,
        deposits: sourced,
        latePaymentFees: sourced,
        penalties: sourced,
        refundTerms: sourced,
        commissions: sourced,
      },
    },
    importantClauses: { type: 'ARRAY', items: clauseItem },
    terminationAndExit: {
      type: 'OBJECT',
      properties: {
        howToTerminate: sourced,
        requiredNotice: sourced,
        groundsForTermination: sourced,
        earlyTerminationConditions: sourced,
        penalties: sourced,
        afterTermination: sourced,
        differsBetweenParties: sourced,
      },
      required: ['howToTerminate', 'requiredNotice'],
    },
    otherClauses: { type: 'ARRAY', items: clauseItem },
    conflictingClauses: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          description: { type: 'STRING' },
          clauseALocation: { type: 'STRING' },
          clauseBLocation: { type: 'STRING' },
        },
        required: ['description'],
      },
    },
    unreadableOrMissingPages: { type: 'ARRAY', items: { type: 'STRING' } },
    bottomLine: { type: 'STRING' },
    suggestLegalReview: { type: 'BOOLEAN' },
    userPerspective: {
      type: 'OBJECT',
      properties: {
        identified: { type: 'BOOLEAN' },
        identifiedAs: { type: 'STRING' },
        notIdentifiedReason: { type: 'STRING' },
        favorableTerms: { type: 'ARRAY', items: perspectiveItem },
        unfavorableTerms: { type: 'ARRAY', items: perspectiveItem },
        payAttentionTerms: { type: 'ARRAY', items: perspectiveItem },
        comparisons: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              topic: { type: 'STRING' },
              yourParty: { type: 'STRING' },
              yourPartyLocation: { type: 'STRING' },
              otherParty: { type: 'STRING' },
              otherPartyLocation: { type: 'STRING' },
              whyItMatters: { type: 'STRING' },
            },
            required: ['topic', 'yourParty', 'otherParty'],
          },
        },
      },
      required: ['identified'],
    },
  },
  required: [
    'quickSummary', 'parties', 'importantDates', 'obligations', 'moneyAndPayment',
    'importantClauses', 'terminationAndExit', 'bottomLine', 'userPerspective',
  ],
};

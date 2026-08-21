// Gemini responseSchema for the Contract Summarizer's full structured
// breakdown. lib/contractSummarize/prompt.js supplies the matching prompt —
// the two files must stay in sync since the model is only as structured as
// the schema it's constrained to.
//
// Free-text fields the model can't determine from the contract should read
// the literal string "Not specified in the contract." rather than being
// left blank or guessed at — enforced by the prompt, not by this schema.

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
        properties: { name: { type: 'STRING' }, role: { type: 'STRING' } },
        required: ['name', 'role'],
      },
    },
    importantDates: {
      type: 'OBJECT',
      properties: {
        effectiveDate: { type: 'STRING' },
        endDate: { type: 'STRING' },
        renewalDates: { type: 'STRING' },
        noticePeriods: { type: 'STRING' },
        paymentDueDates: { type: 'STRING' },
        otherDeadlines: { type: 'STRING' },
      },
      required: ['effectiveDate', 'endDate'],
    },
    obligations: {
      type: 'OBJECT',
      properties: {
        partyALabel: { type: 'STRING' },
        partyAObligations: { type: 'ARRAY', items: { type: 'STRING' } },
        partyBLabel: { type: 'STRING' },
        partyBObligations: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['partyALabel', 'partyAObligations', 'partyBLabel', 'partyBObligations'],
    },
    moneyAndPayment: {
      type: 'OBJECT',
      properties: {
        contractValue: { type: 'STRING' },
        fees: { type: 'STRING' },
        paymentSchedule: { type: 'STRING' },
        deposits: { type: 'STRING' },
        latePaymentFees: { type: 'STRING' },
        penalties: { type: 'STRING' },
        refundTerms: { type: 'STRING' },
        commissions: { type: 'STRING' },
      },
    },
    importantClauses: { type: 'ARRAY', items: clauseItem },
    legalJargon: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          term: { type: 'STRING' },
          plainEnglish: { type: 'STRING' },
          whyItMatters: { type: 'STRING' },
        },
        required: ['term', 'plainEnglish', 'whyItMatters'],
      },
    },
    terminationAndExit: {
      type: 'OBJECT',
      properties: {
        howToTerminate: { type: 'STRING' },
        requiredNotice: { type: 'STRING' },
        groundsForTermination: { type: 'STRING' },
        earlyTerminationConditions: { type: 'STRING' },
        penalties: { type: 'STRING' },
        afterTermination: { type: 'STRING' },
        differsBetweenParties: { type: 'STRING' },
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
              otherParty: { type: 'STRING' },
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
    'importantClauses', 'legalJargon', 'terminationAndExit', 'bottomLine', 'userPerspective',
  ],
};

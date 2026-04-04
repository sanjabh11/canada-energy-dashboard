const COMMON_GUARDRAILS = [
  'Use explicit provenance.',
  'Prefer honest fallback language.',
  'Do not imply live data without confirmation.',
].join(' ');

function wrapPrompt(title: string, context: string, input: string, instructions: string[]): string {
  return [
    `You are a Canadian energy analyst focused on ${title}.`,
    context,
    COMMON_GUARDRAILS,
    `INPUT: ${input}`,
    `TASK: ${instructions.join(' ')}`,
    'Respond concisely and ground claims in the provided context.',
  ].join('\n\n');
}

export function buildForecastAnalysisPrompt(gridContext: string, forecastInput: string): string {
  return wrapPrompt('forecast analysis', gridContext, forecastInput, [
    'Explain the forecast at a high level.',
    'List the main drivers.',
    'Call out any freshness or fallback caveats.',
  ]);
}

export function buildRegulatorySummaryPrompt(gridContext: string, regulatoryInput: string): string {
  return wrapPrompt('regulatory summary', gridContext, regulatoryInput, [
    'Summarize the filing or rule context.',
    'Identify jurisdiction-specific obligations.',
    'Note any assumptions that should be verified.',
  ]);
}

export function buildEsgNarrativePrompt(gridContext: string, esgInput: string): string {
  return wrapPrompt('ESG narrative', gridContext, esgInput, [
    'Describe the ESG implications.',
    'Connect the narrative to energy transition metrics.',
    'Keep the language suitable for executive reporting.',
  ]);
}

export function buildTierCompliancePrompt(gridContext: string, tierInput: string): string {
  return wrapPrompt('TIER compliance', gridContext, tierInput, [
    'Explain compliance implications clearly.',
    'Distinguish between modeled and verified values.',
    'Highlight any stale or snapshot-era assumptions.',
  ]);
}

export function buildGridOptimizationPrompt(gridContext: string, gridInput: string): string {
  return wrapPrompt('grid optimization', gridContext, gridInput, [
    'Recommend operational actions.',
    'Prioritize reliability, affordability, and emissions tradeoffs.',
    'State any data limitations explicitly.',
  ]);
}

export function buildIndigenousEnergyPrompt(gridContext: string, indigenousInput: string): string {
  return wrapPrompt('Indigenous energy', gridContext, indigenousInput, [
    'Respect Indigenous energy sovereignty and community context.',
    'Avoid generic recommendations that ignore local governance.',
    'Keep the answer practical and support-oriented.',
  ]);
}

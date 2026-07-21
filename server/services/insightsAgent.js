const client = require('../config/anthropicClient');
const env = require('../config/env');
const { mapAnthropicError } = require('../utils/anthropicErrors');

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    insights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'A short, business-friendly headline (under 12 words).' },
          description: { type: 'string', description: 'One or two plain-English sentences explaining the finding and why it matters.' },
          severity: { type: 'string', enum: ['INFO', 'WARNING', 'CRITICAL'] },
        },
        required: ['title', 'description', 'severity'],
        additionalProperties: false,
      },
    },
  },
  required: ['insights'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are InsightIQ's data analyst. You are given a list of statistical findings computed from a user's database (trends, anomalies, outliers). For each finding, write a short business-friendly title and a one-to-two sentence plain-English explanation a non-technical reader would understand. Use the finding's own numbers — never invent data. Judge severity by business significance:
- CRITICAL: a large, sudden change that likely needs immediate attention.
- WARNING: a notable change worth reviewing.
- INFO: a minor or routine observation.
Return exactly one insight per finding, in the same order they were given.`;

/** Template-based narration used when the AI is unavailable — keeps the
 * insights engine functional without an API key, just less polished. */
function fallbackNarration(findings) {
  return findings.map((f) => {
    if (f.kind === 'trend_change') {
      const pct = f.pctChange !== null ? `${Math.abs(f.pctChange).toFixed(0)}%` : 'notably';
      const verb = f.direction === 'up' ? 'increased' : 'decreased';
      return {
        title: `${f.column} in "${f.table}" ${verb} ${pct}`,
        description: `In the most recent period (${f.period}), ${f.column} was ${f.current.toFixed(2)}, versus ${f.previous.toFixed(2)} previously (historical average ${f.average.toFixed(2)}).`,
        severity: f.severity,
      };
    }
    return {
      title: `Unusual value in "${f.table}".${f.column}`,
      description: `A value of ${f.value.toFixed(2)} is well outside the typical range (average ${f.average.toFixed(2)}, z-score ${f.zScore.toFixed(1)}).`,
      severity: f.severity,
    };
  });
}

/**
 * Turns raw statistical findings into natural-language insights. Falls back
 * to deterministic templates if the AI is unavailable or errors, so the
 * insights engine keeps working either way.
 */
async function narrateFindings(findings) {
  if (findings.length === 0) return [];
  if (!env.ai.anthropicApiKey) return fallbackNarration(findings);

  try {
    const response = await client.messages.create({
      model: env.ai.anthropicModel,
      max_tokens: 1536,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(findings, null, 2) }],
      output_config: {
        format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
      },
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const parsed = JSON.parse(textBlock.text);

    if (!Array.isArray(parsed.insights) || parsed.insights.length !== findings.length) {
      throw new Error('AI returned a mismatched number of insights.');
    }
    return parsed.insights;
  } catch (err) {
    console.error('Insight narration failed, using fallback templates:', mapAnthropicError(err).message);
    return fallbackNarration(findings);
  }
}

module.exports = { narrateFindings };

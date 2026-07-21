const client = require('../config/anthropicClient');
const env = require('../config/env');
const { ApiError } = require('../middleware/errorHandler');
const { assertReadOnlyQuery } = require('./dataSource.service');
const { mapAnthropicError } = require('../utils/anthropicErrors');

const DIALECT_NOTES = {
  POSTGRES: 'PostgreSQL. Use double-quoted identifiers only if a name needs escaping. Use LIMIT for row caps.',
  MYSQL: 'MySQL. Use backtick identifiers only if a name needs escaping. Use LIMIT for row caps.',
  SQLITE: 'SQLite. Use double-quoted identifiers only if a name needs escaping. Use LIMIT for row caps.',
  CSV: 'SQLite (the file was imported into a local SQLite database). Same syntax rules as SQLite.',
  EXCEL: 'SQLite (each sheet was imported as a table into a local SQLite database). Same syntax rules as SQLite.',
};

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    sql: { type: 'string', description: 'A single read-only SQL SELECT statement that answers the question.' },
    explanation: { type: 'string', description: 'A one or two sentence, non-technical explanation of what the query does.' },
  },
  required: ['sql', 'explanation'],
  additionalProperties: false,
};

function formatSchema(schemaCache) {
  if (!schemaCache || schemaCache.length === 0) {
    return '(no tables found)';
  }
  return schemaCache
    .map((table) => {
      const columns = table.columns.map((c) => `${c.name} (${c.type})`).join(', ');
      return `- ${table.name}: ${columns}`;
    })
    .join('\n');
}

function buildSystemPrompt(dataSource) {
  const dialect = DIALECT_NOTES[dataSource.type] || 'standard SQL';
  return `You are InsightIQ's data analyst agent. You translate a business user's plain-English question into a single SQL query that can be run directly against their database.

Database dialect: ${dialect}

Schema (only these tables and columns exist — never invent one):
${formatSchema(dataSource.schemaCache)}

Rules:
- Output exactly one SQL statement. It MUST start with SELECT or WITH and must not contain any other statement.
- Never use INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, GRANT, REVOKE, or any other mutating or schema-changing keyword.
- Only reference tables and columns listed in the schema above.
- If the question is ambiguous, make a reasonable assumption and state it in the explanation.
- If the question cannot be answered from the schema above, respond with a query that selects nothing meaningful (e.g. SELECT 1 WHERE 1=0) and explain why in the explanation field.
- Add a LIMIT clause (e.g. LIMIT 200) unless the question clearly calls for an aggregate with few rows.`;
}

/**
 * Converts a natural-language question into a validated, read-only SQL query
 * for the given data source, using Claude's structured-output mode.
 */
async function generateSql({ dataSource, question }) {
  if (!env.ai.anthropicApiKey) {
    throw new ApiError(500, 'AI features are not configured. Set ANTHROPIC_API_KEY in the server environment.');
  }

  let response;
  try {
    response = await client.messages.create({
      model: env.ai.anthropicModel,
      max_tokens: 1024,
      system: buildSystemPrompt(dataSource),
      messages: [{ role: 'user', content: question }],
      output_config: {
        format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
      },
    });
  } catch (err) {
    throw mapAnthropicError(err);
  }

  if (response.stop_reason === 'refusal') {
    throw new ApiError(400, 'The AI declined to answer this question. Try rephrasing it.');
  }

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock) {
    throw new ApiError(502, 'The AI returned an unexpected response. Please try again.');
  }

  let parsed;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new ApiError(502, 'The AI returned a response that could not be parsed. Please try again.');
  }

  // Defense in depth: re-validate even though the schema/system prompt already
  // constrain the model to read-only SELECTs.
  const safeSql = assertReadOnlyQuery(parsed.sql);

  return { sql: safeSql, explanation: parsed.explanation };
}

module.exports = { generateSql };

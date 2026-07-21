const Anthropic = require('@anthropic-ai/sdk');
const env = require('./env');

const client = new Anthropic({ apiKey: env.ai.anthropicApiKey });

module.exports = client;
module.exports.Anthropic = Anthropic;

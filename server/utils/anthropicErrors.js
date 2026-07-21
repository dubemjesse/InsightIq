const { Anthropic } = require('../config/anthropicClient');
const { ApiError } = require('../middleware/errorHandler');

/** Maps an Anthropic SDK error to an ApiError with a safe, user-facing message. */
function mapAnthropicError(err) {
  if (err instanceof Anthropic.RateLimitError) {
    return new ApiError(429, 'The AI service is busy right now. Please try again in a moment.');
  }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    console.error('Anthropic auth error — check ANTHROPIC_API_KEY:', err.message);
    return new ApiError(500, 'The AI service is not configured correctly.');
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new ApiError(503, 'Could not reach the AI service. Please try again.');
  }
  if (err instanceof Anthropic.BadRequestError) {
    console.error('Anthropic request error:', err.message);
    return new ApiError(500, 'The AI request was malformed.');
  }
  if (err instanceof ApiError) {
    return err;
  }
  console.error('Unexpected Anthropic API error:', err);
  return new ApiError(502, 'The AI service returned an error. Please try again.');
}

module.exports = { mapAnthropicError };

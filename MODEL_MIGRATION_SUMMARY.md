# Model Migration Summary: Gemini → Claude Sonnet 4

## Changes Made

### Primary Model Selection (`selectOptimalModel` function)
- **Wizard mode**: Changed from `google/gemini-2.5-flash` to `anthropic/claude-sonnet-4-20250514`
- **GTM Strategy mode**: Changed from `google/gemini-2.5-flash` to `anthropic/claude-sonnet-4-20250514`
- **Freeform mode**: Changed from `google/gemini-2.5-flash` to `anthropic/claude-sonnet-4-20250514`
- **Tour-guide mode**: Kept as `google/gemini-2.5-flash` (intentional - speed-critical, low-quality requirement)

### Temperature Adjustments
- Reduced temperatures slightly (0.6-0.7 → 0.5-0.6) for Claude to optimize for precision
- Claude performs better with slightly lower temperatures for structured outputs

### RAG Function Updates
- Updated RAG chat invocation to use `anthropic/claude-sonnet-4-20250514`
- Updated fallback model name in cache logging

### Fallback Logic
- Updated fallback chain: If Claude Sonnet 4 fails, falls back to `google/gemini-2.5-flash`
- Removed Gemini-to-Gemini alternate fallback logic
- Improved error handling and logging

## Expected Improvements

1. **Superior Logical Consistency** - Better multi-step reasoning for business planning
2. **Enhanced Context Retention** - Maintains business context across conversation turns
3. **Better Format Adherence** - More reliable Problem/Insight/Recommendation/Next Actions structure
4. **Improved Component Alignment** - Better analysis of consistency between business components
5. **More Specific Responses** - Less generic advice, more concrete and actionable
6. **Lower Hallucination Risk** - Better distinction between verified facts and strategic insights

## Trade-offs

- **Higher Cost**: Claude Sonnet 4 is more expensive per token than Gemini Flash
- **Potentially Slower**: May have slightly higher latency
- **Mitigation**: Caching is already implemented, and Gemini Flash remains as fallback

## Model Name Format

Using: `anthropic/claude-sonnet-4-20250514`

**Note**: If this exact model name doesn't work with Lovable API, try:
- `claude-sonnet-4-20250514` (without provider prefix)
- `anthropic/claude-3-5-sonnet-20241022` (older Claude Sonnet version)

## Testing Checklist

After deployment, verify:
- [ ] Wizard mode responses show improved logical consistency
- [ ] Context is maintained across multiple conversation turns
- [ ] Responses follow Problem/Insight/Recommendation/Next Actions format
- [ ] Component alignment analysis is more accurate
- [ ] Responses are more specific and actionable
- [ ] Fallback to Gemini works if Claude fails
- [ ] Tour-guide mode still uses Gemini (speed-critical)

## Rollback Plan

If issues arise, revert by:
1. Changing all `anthropic/claude-sonnet-4-20250514` back to `google/gemini-2.5-flash`
2. Restoring original temperature values (0.6-0.7)
3. Restoring original fallback logic

## Files Modified

- `supabase/functions/chatbot-streaming/index.ts`
  - `selectOptimalModel()` function
  - `fetchRAGData()` function  
  - Fallback error handling in `createAIStream()`


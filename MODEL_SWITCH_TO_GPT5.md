# Model Switch: Claude Sonnet 4 → GPT-5

## Changes Made

### Model Updated
- **From**: `anthropic/claude-sonnet-4-20250514` (not working)
- **To**: `openai/gpt-5-2025-08-07`

### All Updated Locations (10 instances)
1. **Wizard mode** (all complexity levels) → GPT-5
2. **GTM Strategy mode** → GPT-5
3. **Freeform mode** (all complexity levels) → GPT-5
4. **RAG function calls** → GPT-5
5. **Fallback default model** → GPT-5
6. **Fallback detection logic** → Updated to check for GPT-5

### Temperature Settings
- Maintained at 0.5-0.6 (optimal for structured outputs)
- Simple queries: 0.5
- Moderate/Complex queries: 0.6

### Fallback Logic
- If GPT-5 fails → Falls back to `google/gemini-2.5-flash`
- Tour-guide mode still uses Gemini Flash (speed-critical)

## Model Name Format

Using: `openai/gpt-5-2025-08-07`

**Note**: If this exact format doesn't work with Lovable API, try:
- `gpt-5-2025-08-07` (without `openai/` prefix)
- `gpt-5` (simplified version, if available)

## Expected Behavior

GPT-5 should provide:
- Strong logical consistency
- Good context retention
- Reliable format adherence
- Balanced performance across all quality metrics
- Fast response times (better than Claude)

## Testing After Deployment

1. **Test wizard mode** - Verify responses are structured correctly
2. **Test context retention** - Send multiple messages, verify context is maintained
3. **Check for API errors** - Monitor logs for model name format issues
4. **Verify fallback** - If GPT-5 fails, should fall back to Gemini Flash

## Troubleshooting

If you see API errors about model not found:
1. Try `gpt-5-2025-08-07` (without prefix)
2. Try `gpt-5` (simplified)
3. Check Lovable API documentation for exact model name format

## Files Modified

- `supabase/functions/chatbot-streaming/index.ts`
  - All model selections updated to GPT-5
  - Fallback logic updated


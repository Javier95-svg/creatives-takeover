# Chatbot Debugging Playbook

Quick reference guide for diagnosing and fixing chatbot issues.

## Table of Contents
1. [Checking API Key Status](#checking-api-key-status)
2. [Querying Error Logs](#querying-error-logs)
3. [Analyzing Conversation Context](#analyzing-conversation-context)
4. [Monitoring Metrics](#monitoring-metrics)
5. [Common Issues and Solutions](#common-issues-and-solutions)

## Checking API Key Status

### Run Validation Script
```bash
deno run --allow-net --allow-env scripts/validate-api-keys.ts
```

### Check Database Status
```sql
SELECT 
  key_name,
  valid,
  error_message,
  validated_at,
  consecutive_failures
FROM api_key_validation_status
ORDER BY validated_at DESC
LIMIT 10;
```

### Check Recent Auth Failures
```sql
SELECT 
  error_message,
  api_key_name,
  endpoint,
  created_at
FROM chatbot_error_logs
WHERE error_type = 'auth_failure'
ORDER BY created_at DESC
LIMIT 10;
```

## Querying Error Logs

### Recent Errors by Type
```sql
SELECT 
  error_type,
  COUNT(*) as count,
  MAX(created_at) as last_occurrence
FROM chatbot_error_logs
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY error_type
ORDER BY count DESC;
```

### Error Rate Over Time
```sql
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  error_type,
  COUNT(*) as error_count
FROM chatbot_error_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour, error_type
ORDER BY hour DESC, error_count DESC;
```

### Specific Error Details
```sql
SELECT 
  error_type,
  error_code,
  error_message,
  user_id,
  session_id,
  endpoint,
  status_code,
  created_at
FROM chatbot_error_logs
WHERE error_type = 'model_error'  -- or 'auth_failure', 'rate_limit', etc.
  AND created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Use Helper Function
```sql
SELECT * FROM get_chatbot_error_rate(
  NOW() - INTERVAL '5 minutes',
  NOW(),
  'chatbot-streaming'  -- or NULL for all endpoints
);
```

## Analyzing Conversation Context

### Check Conversation History
```sql
SELECT 
  cm.role,
  cm.content,
  cm.created_at,
  cm.metadata
FROM chatbot_messages cm
JOIN chatbot_conversations cc ON cm.conversation_id = cc.id
WHERE cc.session_id = 'your-session-id'
ORDER BY cm.created_at ASC;
```

### Check Context Quality
```sql
SELECT 
  session_id,
  context_length,
  context_quality_score,
  ambiguity_score,
  created_at
FROM chatbot_metrics
WHERE session_id = 'your-session-id'
ORDER BY created_at DESC;
```

### Find Conversations with Low Context Quality
```sql
SELECT 
  session_id,
  AVG(context_quality_score) as avg_quality,
  AVG(ambiguity_score) as avg_ambiguity,
  COUNT(*) as message_count
FROM chatbot_metrics
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND success = true
GROUP BY session_id
HAVING AVG(context_quality_score) < 50
   OR AVG(ambiguity_score) > 70
ORDER BY avg_ambiguity DESC;
```

## Monitoring Metrics

### Overall Success Rate
```sql
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE success) as successful,
  COUNT(*) FILTER (WHERE NOT success) as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE success) / COUNT(*), 2) as success_rate
FROM chatbot_metrics
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

### Response Time Analysis
```sql
SELECT 
  endpoint,
  AVG(response_time_ms) as avg_response_time,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as median_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
  MAX(response_time_ms) as max_response_time
FROM chatbot_metrics
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND success = true
GROUP BY endpoint;
```

### High Ambiguity Responses
```sql
SELECT * FROM get_high_ambiguity_responses(
  NOW() - INTERVAL '1 hour',
  NOW(),
  70.0  -- threshold
);
```

### Recent Auth Failures
```sql
SELECT * FROM get_recent_auth_failures(1);  -- last 1 hour
```

## Common Issues and Solutions

### Issue: "Nonsensical Answers"

**Symptoms**: Bot gives generic or irrelevant responses

**Diagnosis**:
1. Check ambiguity scores:
   ```sql
   SELECT session_id, ambiguity_score, response_length
   FROM chatbot_metrics
   WHERE session_id = 'problematic-session-id'
   ORDER BY created_at DESC;
   ```

2. Check context quality:
   ```sql
   SELECT context_length, context_quality_score
   FROM chatbot_metrics
   WHERE session_id = 'problematic-session-id'
   ORDER BY created_at DESC;
   ```

**Solutions**:
- If `context_quality_score < 50`: Context may be lost. Check if conversation history is being retrieved from DB.
- If `ambiguity_score > 70`: Response is too generic. Check system prompt and model selection.
- If `context_length < 5`: Not enough context. Verify conversation history retrieval.

### Issue: "Authentication Errors"

**Symptoms**: 401 errors, "API key validation failed"

**Diagnosis**:
```sql
SELECT * FROM chatbot_error_logs
WHERE error_type = 'auth_failure'
ORDER BY created_at DESC
LIMIT 5;
```

**Solutions**:
1. Run validation script: `deno run scripts/validate-api-keys.ts`
2. Check environment variables: Ensure `LOVABLE_API_KEY` is set correctly
3. Check API key cache: May need to clear cache if key was recently updated
4. Verify key hasn't expired or been revoked

### Issue: "Rate Limit Errors"

**Symptoms**: 429 errors, "Rate limit exceeded"

**Diagnosis**:
```sql
SELECT 
  COUNT(*) as rate_limit_count,
  MAX(created_at) as last_occurrence
FROM chatbot_error_logs
WHERE error_type = 'rate_limit'
  AND created_at >= NOW() - INTERVAL '1 hour';
```

**Solutions**:
1. Check if legitimate high usage or potential abuse
2. Implement request throttling on frontend
3. Consider upgrading API plan if consistently hitting limits
4. Check `retry_after` value in error logs for when to retry

### Issue: "Context Loss in Long Conversations"

**Symptoms**: Bot forgets earlier parts of conversation after 6+ turns

**Diagnosis**:
```sql
SELECT 
  session_id,
  COUNT(*) as message_count,
  MAX(context_length) as max_context_used
FROM chatbot_metrics
WHERE session_id = 'problematic-session-id'
GROUP BY session_id;
```

**Solutions**:
1. Verify context window is 20 messages (not 6)
2. Check if smart message selection is working (system messages should be prioritized)
3. Verify conversation history is being retrieved from DB, not just frontend state
4. For very long conversations, consider conversation summarization

### Issue: "Slow Response Times"

**Symptoms**: Responses take >5 seconds

**Diagnosis**:
```sql
SELECT 
  endpoint,
  AVG(response_time_ms) as avg_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_ms
FROM chatbot_metrics
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY endpoint;
```

**Solutions**:
1. Check if API key validation is adding latency (should be cached)
2. Check if context retrieval is slow (should be <100ms)
3. Check model selection (complex queries may use slower models)
4. Verify cache is being used (check `cache_hit` in metrics)

### Issue: "High Error Rate"

**Symptoms**: >5% of requests failing

**Diagnosis**:
```sql
SELECT * FROM get_chatbot_error_rate(
  NOW() - INTERVAL '5 minutes',
  NOW()
);
```

**Solutions**:
1. Check error breakdown by type:
   ```sql
   SELECT error_type, COUNT(*) 
   FROM chatbot_error_logs
   WHERE created_at >= NOW() - INTERVAL '5 minutes'
   GROUP BY error_type;
   ```
2. Address most common error type first
3. Check if it's a temporary issue (API provider outage, network issues)
4. Review recent deployments for regressions

## Monitoring Dashboard Queries

### Real-time Health Check
```sql
SELECT 
  'Last 5 minutes' as period,
  COUNT(*) FILTER (WHERE success) as successful,
  COUNT(*) FILTER (WHERE NOT success) as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE success) / COUNT(*), 2) as success_rate,
  AVG(response_time_ms) FILTER (WHERE success) as avg_response_time_ms
FROM chatbot_metrics
WHERE created_at >= NOW() - INTERVAL '5 minutes';
```

### Alert Conditions Check
```sql
-- Error rate > 5%?
SELECT 
  COUNT(*) FILTER (WHERE NOT success)::float / COUNT(*) * 100 as error_rate
FROM chatbot_metrics
WHERE created_at >= NOW() - INTERVAL '5 minutes'
HAVING COUNT(*) FILTER (WHERE NOT success)::float / COUNT(*) * 100 > 5;

-- Any auth failures?
SELECT COUNT(*) as auth_failures
FROM chatbot_error_logs
WHERE error_type = 'auth_failure'
  AND created_at >= NOW() - INTERVAL '5 minutes';

-- Rate limits > 10 in last hour?
SELECT COUNT(*) as rate_limits
FROM chatbot_error_logs
WHERE error_type = 'rate_limit'
  AND created_at >= NOW() - INTERVAL '1 hour'
HAVING COUNT(*) > 10;

-- High ambiguity > 20%?
SELECT 
  COUNT(*) FILTER (WHERE ambiguity_score >= 70)::float / COUNT(*) * 100 as high_ambiguity_rate
FROM chatbot_metrics
WHERE created_at >= NOW() - INTERVAL '5 minutes'
  AND success = true
HAVING COUNT(*) FILTER (WHERE ambiguity_score >= 70)::float / COUNT(*) * 100 > 20;
```

## Quick Troubleshooting Checklist

When chatbot issues are reported:

1. ✅ Check API key status (`scripts/validate-api-keys.ts`)
2. ✅ Check recent error logs (last 1 hour)
3. ✅ Check error rate (should be <5%)
4. ✅ Check specific session context (if session ID provided)
5. ✅ Check ambiguity scores for that session
6. ✅ Check if it's a known issue (recent deployments, API provider status)
7. ✅ Review metrics for patterns (time of day, specific endpoints, etc.)

## Contact & Escalation

- **Critical Issues** (auth failures, >10% error rate): Check alerts immediately
- **High Ambiguity** (>20%): Review system prompts and model selection
- **Context Loss**: Verify conversation history retrieval is working
- **Performance**: Check response times and optimize slow queries

For persistent issues, review the bug report (`CHATBOT_BUG_REPORT.md`) for known issues and fixes.


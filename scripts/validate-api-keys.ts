#!/usr/bin/env deno run --allow-net --allow-env
/**
 * API Key Validation Script
 * 
 * Validates all critical API keys used by the chatbot system.
 * Run this on startup and periodically to ensure keys are working.
 */

interface ValidationResult {
  keyName: string;
  valid: boolean;
  error?: string;
  validatedAt: string;
}

const LOVABLE_API_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const SUPABASE_API_URL = Deno.env.get('SUPABASE_URL') || '';

/**
 * Validate LOVABLE_API_KEY by making a test API call
 */
async function validateLovableAPIKey(): Promise<ValidationResult> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!apiKey) {
    return {
      keyName: 'LOVABLE_API_KEY',
      valid: false,
      error: 'API key not configured',
      validatedAt: new Date().toISOString()
    };
  }

  try {
    const response = await fetch(LOVABLE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5,
      }),
    });

    if (response.status === 401) {
      return {
        keyName: 'LOVABLE_API_KEY',
        valid: false,
        error: 'Invalid API key (401 Unauthorized)',
        validatedAt: new Date().toISOString()
      };
    }

    if (response.status === 429) {
      return {
        keyName: 'LOVABLE_API_KEY',
        valid: false,
        error: 'Rate limit exceeded (429)',
        validatedAt: new Date().toISOString()
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        keyName: 'LOVABLE_API_KEY',
        valid: false,
        error: `API error: ${response.status} - ${errorText.substring(0, 100)}`,
        validatedAt: new Date().toISOString()
      };
    }

    // Key is valid if we get a successful response
    return {
      keyName: 'LOVABLE_API_KEY',
      valid: true,
      validatedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      keyName: 'LOVABLE_API_KEY',
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      validatedAt: new Date().toISOString()
    };
  }
}

/**
 * Validate SUPABASE_SERVICE_ROLE_KEY by checking connectivity
 */
async function validateSupabaseKey(): Promise<ValidationResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl) {
    return {
      keyName: 'SUPABASE_URL',
      valid: false,
      error: 'SUPABASE_URL not configured',
      validatedAt: new Date().toISOString()
    };
  }

  if (!supabaseKey) {
    return {
      keyName: 'SUPABASE_SERVICE_ROLE_KEY',
      valid: false,
      error: 'Service role key not configured',
      validatedAt: new Date().toISOString()
    };
  }

  try {
    // Test connectivity by making a simple query
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (response.status === 401) {
      return {
        keyName: 'SUPABASE_SERVICE_ROLE_KEY',
        valid: false,
        error: 'Invalid service role key (401 Unauthorized)',
        validatedAt: new Date().toISOString()
      };
    }

    // If we can reach the API, the key is likely valid
    return {
      keyName: 'SUPABASE_SERVICE_ROLE_KEY',
      valid: response.ok || response.status === 404, // 404 is OK, means API is reachable
      error: response.ok ? undefined : `HTTP ${response.status}`,
      validatedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      keyName: 'SUPABASE_SERVICE_ROLE_KEY',
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      validatedAt: new Date().toISOString()
    };
  }
}

/**
 * Main validation function
 */
async function validateAllKeys(): Promise<ValidationResult[]> {
  console.log('🔍 Validating API keys...\n');

  const results = await Promise.all([
    validateLovableAPIKey(),
    validateSupabaseKey(),
  ]);

  // Print results
  results.forEach(result => {
    if (result.valid) {
      console.log(`✅ ${result.keyName}: Valid`);
    } else {
      console.error(`❌ ${result.keyName}: Invalid - ${result.error}`);
    }
  });

  // Return non-zero exit code if any key is invalid
  const allValid = results.every(r => r.valid);
  if (!allValid) {
    console.error('\n⚠️  Some API keys are invalid. Please check your configuration.');
    Deno.exit(1);
  }

  console.log('\n✅ All API keys are valid.');
  return results;
}

// Run if executed directly
if (import.meta.main) {
  await validateAllKeys();
}

export { validateAllKeys, validateLovableAPIKey, validateSupabaseKey };


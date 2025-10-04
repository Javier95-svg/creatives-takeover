import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CommitmentInput {
  sprintId: string;
  commitmentText: string;
  measurableMetric: string;
  metricValue?: number;
  metricUnit?: string;
  deadline: string;
  creditsStaked: number;
}

interface ValidationResult {
  valid: boolean;
  issues: string[];
}

// SMART Goal Validation
function validateSMART(commitment: CommitmentInput, sprint: any): ValidationResult {
  const issues: string[] = [];
  
  // Specific: Clear and concrete
  if (commitment.commitmentText.length < 20) {
    issues.push("Commitment is too vague - be more specific about what you'll achieve");
  }
  
  // Measurable: Must have metric
  if (!commitment.measurableMetric || commitment.measurableMetric.trim().length === 0) {
    issues.push("Missing measurable outcome - how will you know you succeeded?");
  }
  
  if (commitment.metricValue !== undefined && commitment.metricValue <= 0) {
    issues.push("Metric value must be greater than 0");
  }
  
  // Achievable: Credits staked validation
  if (commitment.creditsStaked < 1 || commitment.creditsStaked > 100) {
    issues.push("Credits staked must be between 1 and 100");
  }
  
  // Time-bound: Must be within sprint timeframe
  const commitmentDeadline = new Date(commitment.deadline);
  const sprintEndDate = new Date(sprint.end_date);
  
  if (commitmentDeadline > sprintEndDate) {
    issues.push("Deadline must be within sprint timeframe");
  }
  
  if (commitmentDeadline <= new Date()) {
    issues.push("Deadline must be in the future");
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case 'createCommitment': {
        const input = params as CommitmentInput;
        
        // Get sprint details
        const { data: sprint, error: sprintError } = await supabase
          .from('sprints')
          .select('*')
          .eq('id', input.sprintId)
          .eq('user_id', user.id)
          .single();
        
        if (sprintError || !sprint) {
          return new Response(
            JSON.stringify({ error: 'Sprint not found or access denied' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Validate SMART criteria
        const validation = validateSMART(input, sprint);
        if (!validation.valid) {
          return new Response(
            JSON.stringify({ error: 'Validation failed', issues: validation.issues }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check user has enough credits
        const { data: userCredits } = await supabase
          .from('user_credits')
          .select('balance')
          .eq('user_id', user.id)
          .single();
        
        if (!userCredits || userCredits.balance < input.creditsStaked) {
          return new Response(
            JSON.stringify({ error: 'Insufficient credits' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check if commitment already exists for this sprint
        const { data: existingCommitment } = await supabase
          .from('sprint_commitments')
          .select('id')
          .eq('sprint_id', input.sprintId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (existingCommitment) {
          return new Response(
            JSON.stringify({ error: 'You already have a commitment for this sprint' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Deduct credits (lock them)
        const { error: deductError } = await supabase
          .from('user_credits')
          .update({ balance: userCredits.balance - input.creditsStaked })
          .eq('user_id', user.id);
        
        if (deductError) {
          throw new Error('Failed to lock credits');
        }
        
        // Log the transaction
        await supabase
          .from('credit_transactions')
          .insert({
            user_id: user.id,
            amount: -input.creditsStaked,
            tx_type: 'deduct',
            reason: 'Sprint commitment - credits locked',
            feature: 'sprint_commitment',
            metadata: { sprint_id: input.sprintId }
          });
        
        // Create commitment
        const { data: commitment, error: commitmentError } = await supabase
          .from('sprint_commitments')
          .insert({
            sprint_id: input.sprintId,
            user_id: user.id,
            commitment_text: input.commitmentText,
            measurable_metric: input.measurableMetric,
            metric_value: input.metricValue,
            metric_unit: input.metricUnit,
            deadline: input.deadline,
            credits_staked: input.creditsStaked,
            credits_locked: true,
            status: 'active'
          })
          .select()
          .single();
        
        if (commitmentError) {
          // Rollback credit deduction
          await supabase
            .from('user_credits')
            .update({ balance: userCredits.balance })
            .eq('user_id', user.id);
          
          throw new Error('Failed to create commitment');
        }
        
        return new Response(
          JSON.stringify({ success: true, commitment }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'submitProof': {
        const { commitmentId, proofUrl, actualValue, proofNotes } = params;
        
        // Get commitment
        const { data: commitment, error: fetchError } = await supabase
          .from('sprint_commitments')
          .select('*')
          .eq('id', commitmentId)
          .eq('user_id', user.id)
          .single();
        
        if (fetchError || !commitment) {
          return new Response(
            JSON.stringify({ error: 'Commitment not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (commitment.status !== 'active') {
          return new Response(
            JSON.stringify({ error: 'Can only submit proof for active commitments' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Update with proof and mark as achieved if metric matches or exceeds target
        const isAchieved = actualValue >= (commitment.metric_value || 0);
        
        const { data: updated, error: updateError } = await supabase
          .from('sprint_commitments')
          .update({
            proof_url: proofUrl,
            actual_metric_value: actualValue,
            proof_notes: proofNotes,
            status: isAchieved ? 'achieved' : 'failed',
            verified_at: new Date().toISOString(),
            verified_by: user.id,
            resolved_at: new Date().toISOString()
          })
          .eq('id', commitmentId)
          .select()
          .single();
        
        if (updateError) {
          throw new Error('Failed to submit proof');
        }
        
        // Resolve credits
        if (isAchieved) {
          const bonus = Math.floor(commitment.credits_staked * 0.1);
          const totalReturn = commitment.credits_staked + bonus;
          
          const { data: userCredits } = await supabase
            .from('user_credits')
            .select('balance')
            .eq('user_id', user.id)
            .single();
          
          await supabase
            .from('user_credits')
            .update({ balance: (userCredits?.balance || 0) + totalReturn })
            .eq('user_id', user.id);
          
          await supabase
            .from('credit_transactions')
            .insert({
              user_id: user.id,
              amount: totalReturn,
              tx_type: 'grant',
              reason: 'Sprint commitment achieved',
              feature: 'sprint_commitment_success',
              metadata: { 
                commitment_id: commitmentId,
                bonus,
                original_stake: commitment.credits_staked
              }
            });
          
          await supabase
            .from('sprint_commitments')
            .update({ credits_locked: false })
            .eq('id', commitmentId);
        } else {
          // Credits remain deducted (lost)
          await supabase
            .from('credit_transactions')
            .insert({
              user_id: user.id,
              amount: 0,
              tx_type: 'deduct',
              reason: 'Sprint commitment failed - credits forfeited',
              feature: 'sprint_commitment_penalty',
              metadata: { 
                commitment_id: commitmentId,
                credits_lost: commitment.credits_staked
              }
            });
          
          await supabase
            .from('sprint_commitments')
            .update({ credits_locked: false })
            .eq('id', commitmentId);
        }
        
        return new Response(
          JSON.stringify({ success: true, commitment: updated, achieved: isAchieved }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'withdrawCommitment': {
        const { commitmentId } = params;
        
        const { data: commitment, error: fetchError } = await supabase
          .from('sprint_commitments')
          .select('*')
          .eq('id', commitmentId)
          .eq('user_id', user.id)
          .single();
        
        if (fetchError || !commitment) {
          return new Response(
            JSON.stringify({ error: 'Commitment not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (commitment.status !== 'active') {
          return new Response(
            JSON.stringify({ error: 'Can only withdraw active commitments' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // 50% penalty - return half the credits
        const refund = Math.floor(commitment.credits_staked * 0.5);
        const penalty = commitment.credits_staked - refund;
        
        const { data: userCredits } = await supabase
          .from('user_credits')
          .select('balance')
          .eq('user_id', user.id)
          .single();
        
        await supabase
          .from('user_credits')
          .update({ balance: (userCredits?.balance || 0) + refund })
          .eq('user_id', user.id);
        
        await supabase
          .from('credit_transactions')
          .insert({
            user_id: user.id,
            amount: refund,
            tx_type: 'refund',
            reason: 'Sprint commitment withdrawn (50% penalty)',
            feature: 'sprint_commitment_withdrawal',
            metadata: { 
              commitment_id: commitmentId,
              penalty,
              refund
            }
          });
        
        await supabase
          .from('sprint_commitments')
          .update({ 
            status: 'withdrawn',
            credits_locked: false,
            resolved_at: new Date().toISOString()
          })
          .eq('id', commitmentId);
        
        return new Response(
          JSON.stringify({ success: true, refund, penalty }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'resolveExpired': {
        // Find all active commitments past deadline with no proof
        const { data: expiredCommitments, error: fetchError } = await supabase
          .from('sprint_commitments')
          .select('*')
          .eq('status', 'active')
          .lt('deadline', new Date().toISOString())
          .is('proof_url', null);
        
        if (fetchError) {
          throw new Error('Failed to fetch expired commitments');
        }
        
        const resolved = [];
        
        for (const commitment of expiredCommitments || []) {
          // Mark as failed
          await supabase
            .from('sprint_commitments')
            .update({ 
              status: 'failed',
              credits_locked: false,
              resolved_at: new Date().toISOString()
            })
            .eq('id', commitment.id);
          
          // Log penalty transaction
          await supabase
            .from('credit_transactions')
            .insert({
              user_id: commitment.user_id,
              amount: 0,
              tx_type: 'deduct',
              reason: 'Sprint commitment expired - no proof submitted',
              feature: 'sprint_commitment_penalty',
              metadata: { 
                commitment_id: commitment.id,
                credits_lost: commitment.credits_staked
              }
            });
          
          resolved.push(commitment.id);
        }
        
        return new Response(
          JSON.stringify({ success: true, resolved_count: resolved.length, commitment_ids: resolved }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in sprint-commitment-manager:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...payload } = await req.json();
    console.log(`Processing ${action} for user ${user.id}`);

    switch (action) {
      case 'createCommitment':
        return await createCommitment(supabase, user.id, payload);
      case 'verifyCommitment':
        return await verifyCommitment(supabase, user.id, payload);
      case 'resolveCommitment':
        return await resolveCommitment(supabase, user.id, payload);
      case 'cancelCommitment':
        return await cancelCommitment(supabase, user.id, payload);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in commitment-manager:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createCommitment(supabase: any, userId: string, payload: any) {
  const { sprintId, commitmentText, creditsStaked, targetDate, verificationMethod, isPublic } = payload;

  // Validate credits staked
  if (creditsStaked < 3) {
    return new Response(
      JSON.stringify({ error: 'Minimum stake is 3 credits' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check user has enough credits
  const { data: userCredits, error: creditsError } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (creditsError || !userCredits || userCredits.balance < creditsStaked) {
    return new Response(
      JSON.stringify({ error: 'Insufficient credits' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check max active commitments (3)
  const { data: activeCommitments, error: countError } = await supabase
    .from('sprint_commitments')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (countError || (activeCommitments && activeCommitments.length >= 3)) {
    return new Response(
      JSON.stringify({ error: 'Maximum 3 active commitments allowed' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Lock credits (move from balance to staked_balance)
  const { error: updateError } = await supabase
    .from('user_credits')
    .update({
      balance: userCredits.balance - creditsStaked,
      staked_balance: supabase.rpc('COALESCE', [supabase.raw('staked_balance'), 0]) + creditsStaked
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('Error locking credits:', updateError);
    return new Response(
      JSON.stringify({ error: 'Failed to lock credits' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create commitment
  const { data: commitment, error: commitmentError } = await supabase
    .from('sprint_commitments')
    .insert({
      user_id: userId,
      sprint_id: sprintId,
      commitment_text: commitmentText,
      credits_staked: creditsStaked,
      target_date: targetDate,
      verification_method: verificationMethod,
      is_public: isPublic ?? true,
      status: 'active'
    })
    .select()
    .single();

  if (commitmentError) {
    console.error('Error creating commitment:', commitmentError);
    // Rollback credit lock
    await supabase
      .from('user_credits')
      .update({
        balance: userCredits.balance,
        staked_balance: Math.max(0, (userCredits.staked_balance || 0) - creditsStaked)
      })
      .eq('user_id', userId);

    return new Response(
      JSON.stringify({ error: 'Failed to create commitment' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Log transaction
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: -creditsStaked,
    tx_type: 'stake',
    reason: 'Commitment staked',
    feature: 'Public Commitment'
  });

  console.log(`Commitment created: ${commitment.id}, staked ${creditsStaked} credits`);

  return new Response(
    JSON.stringify({ success: true, commitment }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function verifyCommitment(supabase: any, userId: string, payload: any) {
  const { commitmentId, verificationData, achievementNotes } = payload;

  // Get commitment
  const { data: commitment, error: fetchError } = await supabase
    .from('sprint_commitments')
    .select('*')
    .eq('id', commitmentId)
    .single();

  if (fetchError || !commitment) {
    return new Response(
      JSON.stringify({ error: 'Commitment not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if user is owner or verifier
  const isOwner = commitment.user_id === userId;
  const isPeerVerification = commitment.verification_method === 'peer_verified';

  if (!isOwner && !isPeerVerification) {
    return new Response(
      JSON.stringify({ error: 'Not authorized to verify this commitment' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Handle peer verification
  if (isPeerVerification && !isOwner) {
    const verifiedBy = commitment.verified_by || [];
    
    if (verifiedBy.includes(userId)) {
      return new Response(
        JSON.stringify({ error: 'You have already verified this commitment' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    verifiedBy.push(userId);

    await supabase
      .from('sprint_commitments')
      .update({ verified_by: verifiedBy })
      .eq('id', commitmentId);

    // If 3 verifications reached, mark as achieved
    if (verifiedBy.length >= 3) {
      return await resolveCommitment(supabase, commitment.user_id, {
        commitmentId,
        status: 'achieved',
        achievementNotes: 'Peer verified by community'
      });
    }

    // Reward verifier (5% of stake)
    const verifierReward = Math.floor(commitment.credits_staked * 0.05);
    await supabase.from('user_credits').update({
      balance: supabase.raw(`balance + ${verifierReward}`)
    }).eq('user_id', userId);

    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: verifierReward,
      tx_type: 'grant',
      reason: 'Peer verification reward',
      feature: 'Public Commitment'
    });

    return new Response(
      JSON.stringify({ success: true, verifiedBy, pending: 3 - verifiedBy.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Self-report verification (owner only)
  if (isOwner) {
    const { error: updateError } = await supabase
      .from('sprint_commitments')
      .update({
        verification_data: verificationData,
        achievement_notes: achievementNotes,
        verified_at: new Date().toISOString()
      })
      .eq('id', commitmentId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update verification data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For self-report, automatically mark as achieved after 24 hours (would need a cron job)
    // For now, we'll mark it immediately
    return await resolveCommitment(supabase, userId, {
      commitmentId,
      status: 'achieved',
      achievementNotes
    });
  }

  return new Response(
    JSON.stringify({ error: 'Invalid verification attempt' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function resolveCommitment(supabase: any, userId: string, payload: any) {
  const { commitmentId, status, achievementNotes } = payload;

  // Get commitment
  const { data: commitment, error: fetchError } = await supabase
    .from('sprint_commitments')
    .select('*')
    .eq('id', commitmentId)
    .single();

  if (fetchError || !commitment) {
    return new Response(
      JSON.stringify({ error: 'Commitment not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (commitment.user_id !== userId) {
    return new Response(
      JSON.stringify({ error: 'Not authorized' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (commitment.status !== 'active') {
    return new Response(
      JSON.stringify({ error: 'Commitment is not active' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Calculate credit resolution
  let creditsToReturn = 0;
  let bonusCredits = 0;
  let txReason = '';

  if (status === 'achieved') {
    // Return stake + 10% bonus
    creditsToReturn = commitment.credits_staked;
    bonusCredits = Math.floor(commitment.credits_staked * 0.1);
    txReason = 'Commitment achieved - stake returned + bonus';
  } else if (status === 'failed') {
    // Forfeit all credits
    creditsToReturn = 0;
    txReason = 'Commitment failed - credits forfeited';
  }

  // Update commitment status
  await supabase
    .from('sprint_commitments')
    .update({
      status,
      achievement_notes: achievementNotes,
      verified_at: new Date().toISOString()
    })
    .eq('id', commitmentId);

  // Get current user credits
  const { data: userCredits } = await supabase
    .from('user_credits')
    .select('balance, staked_balance')
    .eq('user_id', userId)
    .single();

  // Return credits
  const totalReturn = creditsToReturn + bonusCredits;
  if (totalReturn > 0) {
    await supabase
      .from('user_credits')
      .update({
        balance: (userCredits?.balance || 0) + totalReturn,
        staked_balance: Math.max(0, (userCredits?.staked_balance || 0) - commitment.credits_staked)
      })
      .eq('user_id', userId);

    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: totalReturn,
      tx_type: 'grant',
      reason: txReason,
      feature: 'Public Commitment'
    });
  } else {
    // Just unlock staked balance
    await supabase
      .from('user_credits')
      .update({
        staked_balance: Math.max(0, (userCredits?.staked_balance || 0) - commitment.credits_staked)
      })
      .eq('user_id', userId);
  }

  console.log(`Commitment resolved: ${commitmentId}, status: ${status}, returned: ${totalReturn}`);

  return new Response(
    JSON.stringify({ success: true, creditsReturned: totalReturn, status }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function cancelCommitment(supabase: any, userId: string, payload: any) {
  const { commitmentId } = payload;

  // Get commitment
  const { data: commitment, error: fetchError } = await supabase
    .from('sprint_commitments')
    .select('*')
    .eq('id', commitmentId)
    .single();

  if (fetchError || !commitment) {
    return new Response(
      JSON.stringify({ error: 'Commitment not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (commitment.user_id !== userId) {
    return new Response(
      JSON.stringify({ error: 'Not authorized' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if within 24 hours
  const createdAt = new Date(commitment.created_at);
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceCreation > 24) {
    return new Response(
      JSON.stringify({ error: 'Can only cancel within 24 hours of creation' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Return 50% of staked credits (50% penalty)
  const creditsToReturn = Math.floor(commitment.credits_staked * 0.5);

  // Update commitment
  await supabase
    .from('sprint_commitments')
    .update({ status: 'cancelled' })
    .eq('id', commitmentId);

  // Get current credits
  const { data: userCredits } = await supabase
    .from('user_credits')
    .select('balance, staked_balance')
    .eq('user_id', userId)
    .single();

  // Return 50% of credits
  await supabase
    .from('user_credits')
    .update({
      balance: (userCredits?.balance || 0) + creditsToReturn,
      staked_balance: Math.max(0, (userCredits?.staked_balance || 0) - commitment.credits_staked)
    })
    .eq('user_id', userId);

  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: creditsToReturn,
    tx_type: 'refund',
    reason: 'Commitment cancelled - 50% returned',
    feature: 'Public Commitment'
  });

  console.log(`Commitment cancelled: ${commitmentId}, returned: ${creditsToReturn}`);

  return new Response(
    JSON.stringify({ success: true, creditsReturned: creditsToReturn }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
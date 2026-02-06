# User Account Fix: does@elevatedynamics.pt

## Issue
User with UID `15bba750-6594-4f48-a101-0c02a404835e` and email `does@elevatedynamics.pt` cannot sign in to their account. The user should be on the Pro plan with 150 credits.

## Root Causes Identified
The following issues could prevent sign-in:
1. **Email not confirmed** - User account may not have `email_confirmed_at` set
2. **Account banned** - User may have `banned_until` set
3. **Missing profile** - Profile may not exist in `profiles` table
4. **Wrong subscription tier** - User may not be on Professional tier
5. **Insufficient credits** - User may not have 150 credits

## Solution
A migration script has been created: `supabase/migrations/20250130000000_fix_user_account_does_elevatedynamics.sql`

This migration will:
1. ✅ Verify user exists in `auth.users`
2. ✅ Confirm email (`email_confirmed_at`) and remove any bans (`banned_until`)
3. ✅ Create profile in `profiles` table if missing
4. ✅ Set subscription tier to `professional`
5. ✅ Set credits to 150 (both `balance` and `monthly_quota`)
6. ✅ Update `subscribers` table
7. ✅ Log credit transaction for audit trail
8. ✅ Verify final state

## How to Apply the Fix

### Option 1: Run Migration via Supabase CLI (Recommended)
```bash
# Make sure you're in the project root directory
cd creatives-takeover-15

# Run the migration
supabase db push

# Or if using local development
supabase migration up
```

### Option 2: Run Migration via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20250130000000_fix_user_account_does_elevatedynamics.sql`
4. Paste and execute the SQL script

### Option 3: Direct Database Access
If you have direct database access, you can run the migration SQL directly against your database.

## Verification

After running the migration, verify the fix by checking:

```sql
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  u.banned_until IS NULL as not_banned,
  p.subscription_tier as profile_tier,
  uc.balance,
  uc.monthly_quota,
  uc.subscription_tier as credits_tier,
  s.subscription_tier as subscriber_tier,
  s.subscribed
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_credits uc ON uc.user_id = u.id
LEFT JOIN public.subscribers s ON s.user_id = u.id
WHERE u.id = '15bba750-6594-4f48-a101-0c02a404835e';
```

Expected results:
- `email_confirmed`: `true`
- `not_banned`: `true`
- `profile_tier`: `professional`
- `balance`: `150`
- `monthly_quota`: `150`
- `credits_tier`: `professional`
- `subscriber_tier`: `professional`
- `subscribed`: `true`

## Additional Notes

### Password Reset
If the user still cannot sign in after this fix, they may need to reset their password:
1. Use the "Forgot Password" feature on the login page
2. Or manually reset via Supabase Dashboard → Authentication → Users → Select user → Reset Password

### Email Confirmation
The migration automatically confirms the email address. If email confirmation is required by your auth settings, this should resolve that issue.

### Testing
After applying the fix:
1. Ask the user to try signing in again
2. If issues persist, check:
   - Password is correct (may need reset)
   - Browser cache/cookies cleared
   - No browser extensions blocking authentication
   - Network/firewall issues

## Migration Details

**File**: `supabase/migrations/20250130000000_fix_user_account_does_elevatedynamics.sql`

**User Details**:
- UID: `15bba750-6594-4f48-a101-0c02a404835e`
- Email: `does@elevatedynamics.pt`
- Target Tier: `professional`
- Target Credits: `150`

**Idempotent**: Yes - This migration can be run multiple times safely. It uses `ON CONFLICT` clauses and checks before updates.

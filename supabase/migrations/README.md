# Database Migrations

This directory contains SQL migration files for the Creatives Takeover platform.

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of the migration file you want to apply
5. Paste into the SQL editor
6. Click **Run** or press `Ctrl/Cmd + Enter`
7. Verify the output shows success

### Option 2: Supabase CLI

```bash
# Initialize Supabase (if not already done)
supabase init

# Link to your project
supabase link --project-ref your-project-ref

# Pull remote changes
supabase db pull

# Apply local migrations
supabase db push
```

### Option 3: Direct Database Connection

```bash
# Using psql
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" < migrations/20260101_add_onboarding_columns.sql
```

---

## Migration Files

### `20260101_add_onboarding_columns.sql`

**Date:** January 1, 2026
**Purpose:** Add onboarding tracking to profiles table

**Changes:**
- Adds `onboarding_completed` column (BOOLEAN, default FALSE)
- Adds `first_login_at` column (TIMESTAMP WITH TIME ZONE)
- Creates indexes for faster queries
- Auto-completes onboarding for existing users

**Impact:**
- Existing users: Automatically marked as `onboarding_completed = true`
- New users: Start with `onboarding_completed = false`
- Backward compatible: No breaking changes

**How to Apply:**
```sql
-- Copy and paste the entire file contents into Supabase SQL Editor
-- Then click Run
```

**Verification:**
```sql
-- Check columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('onboarding_completed', 'first_login_at');

-- Expected: 2 rows

-- Check indexes exist
SELECT indexname
FROM pg_indexes
WHERE tablename = 'profiles'
  AND indexname LIKE '%onboarding%';

-- Expected: 2 rows (idx_profiles_onboarding_completed, idx_profiles_first_login_at)

-- Check existing users marked complete
SELECT COUNT(*) as users_marked_complete
FROM profiles
WHERE onboarding_completed = true;

-- Expected: Number should match existing users with profile data
```

**Rollback (if needed):**
```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_profiles_onboarding_completed;
DROP INDEX IF EXISTS idx_profiles_first_login_at;

-- Remove columns
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_completed;
ALTER TABLE profiles DROP COLUMN IF EXISTS first_login_at;
```

---

## Migration Best Practices

### Before Applying

1. **Backup Your Database**
   - Supabase automatically backs up, but create manual backup for safety
   - Dashboard → Database → Backups → Create Backup

2. **Test in Development First**
   - Apply to development/staging environment
   - Verify application works as expected
   - Check for any errors or warnings

3. **Review the Migration**
   - Read the SQL carefully
   - Understand what changes it makes
   - Check for any destructive operations

### During Application

1. **Apply During Low Traffic**
   - Choose off-peak hours
   - Monitor for errors
   - Be ready to rollback if needed

2. **Monitor Performance**
   - Watch for slow queries
   - Check index creation time
   - Monitor database connections

### After Application

1. **Verify Changes**
   - Run verification queries
   - Check application functionality
   - Test critical user flows

2. **Monitor Logs**
   - Check Supabase logs for errors
   - Monitor application error tracking
   - Watch for performance issues

3. **Update Documentation**
   - Mark migration as applied
   - Document any issues encountered
   - Update team on changes

---

## Migration Naming Convention

Migrations follow this pattern:
```
YYYYMMDD_descriptive_name.sql
```

Examples:
- `20260101_add_onboarding_columns.sql`
- `20260115_create_analytics_tables.sql`
- `20260201_add_subscription_indexes.sql`

---

## Troubleshooting

### Common Issues

**Issue: "Column already exists"**
```
ERROR: column "onboarding_completed" already exists
```
**Solution:** Migration was already applied. Check `SELECT * FROM profiles LIMIT 1;` to verify columns exist.

---

**Issue: "Permission denied"**
```
ERROR: must be owner of table profiles
```
**Solution:** Ensure you're using the Supabase dashboard or have proper permissions. Use the postgres role.

---

**Issue: "Too many connections"**
```
ERROR: too many connections for role
```
**Solution:**
1. Close unused connections
2. Wait a few minutes
3. Try again during off-peak hours

---

**Issue: Migration takes too long**
```
Statement timeout or very slow execution
```
**Solution:**
1. Check table size: `SELECT COUNT(*) FROM profiles;`
2. If large table, apply index creation separately
3. Monitor progress with `pg_stat_activity`

---

## Support

For migration issues:
1. Check Supabase docs: https://supabase.com/docs/guides/database/migrations
2. Search community forum: https://github.com/supabase/supabase/discussions
3. Create issue in project repo with:
   - Migration file name
   - Error message
   - Database version
   - Table row count

---

## Migration History

| Date | File | Description | Status |
|------|------|-------------|--------|
| 2026-01-01 | `20260101_add_onboarding_columns.sql` | Add onboarding tracking | ✅ Ready |

---

## Future Migrations

Planned migrations:
- [ ] Analytics event tracking tables
- [ ] Notification preferences
- [ ] Feature usage metrics
- [ ] A/B test variant tracking

---

## Emergency Rollback

If a migration causes critical issues:

```sql
-- 1. Immediately rollback the transaction (if still open)
ROLLBACK;

-- 2. Restore from backup
-- Go to Dashboard → Database → Backups → Restore

-- 3. Apply rollback SQL (specific to each migration)
-- See individual migration file for rollback instructions
```

**When to Rollback:**
- Production down
- Data corruption
- Critical bugs introduced
- Performance severely degraded

**When NOT to Rollback:**
- Minor UI issues (fix in application code)
- Non-critical features broken (deploy fix)
- Expected behavior (update documentation)

---

## Additional Resources

- [Supabase Migration Guide](https://supabase.com/docs/guides/database/migrations)
- [PostgreSQL ALTER TABLE Docs](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Database Indexing Best Practices](https://www.postgresql.org/docs/current/indexes.html)

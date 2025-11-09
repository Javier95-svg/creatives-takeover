# Phase 1: Funding Board Database Setup - COMPLETE ✅

## Overview
Simplified database foundation for the Insighta funding board. Focused on ease of use for regular visitors with no login required to view opportunities.

## Files Created

### 1. Database Migrations
- ✅ `supabase/migrations/20251109001310_create_funding_opportunities.sql`
  - Creates `funding_opportunities` table
  - Simple schema: title, description, url, type, funding_amount, location, keywords
  - RLS: Anyone can view, only admins can manage
  - Indexes for fast filtering

- ✅ `supabase/migrations/20251109001311_create_user_funding_bookmarks.sql`
  - Creates `user_funding_bookmarks` table (optional, for logged-in users)
  - Simple bookmark tracking
  - RLS: Users can only see their own bookmarks

- ✅ `supabase/migrations/20251109001312_seed_funding_opportunities.sql`
  - Seeds 12 initial funding opportunities
  - Idempotent (safe to run multiple times)
  - Includes: Y Combinator, Techstars, SBIR, AWS Activate, etc.

### 2. TypeScript Types
- ✅ `src/types/funding.ts`
  - `FundingType`: 'grant' | 'accelerator' | 'contest' | 'microfund'
  - `FundingOpportunity`: Interface for funding opportunities
  - `FundingFilters`: Simple filter interface

### 3. React Hook
- ✅ `src/hooks/useFundingOpportunities.ts`
  - Fetches funding opportunities from database
  - Supports filtering by type, location, search term, featured status
  - Client-side search (can be upgraded to database full-text search later)

## Database Schema

### funding_opportunities
```sql
- id: UUID (primary key)
- title: TEXT
- description: TEXT
- url: TEXT
- type: 'grant' | 'accelerator' | 'contest' | 'microfund'
- funding_amount: TEXT (e.g., "$500,000" or "€100,000 - €500,000")
- location: TEXT[] (array of locations)
- keywords: TEXT[] (array of keywords)
- is_featured: BOOLEAN
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### user_funding_bookmarks (optional)
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- funding_opportunity_id: UUID (references funding_opportunities)
- created_at: TIMESTAMP
```

## Security (RLS Policies)

### funding_opportunities
- **View**: Anyone can view active opportunities (no login required)
- **Insert/Update/Delete**: Only admins (via user_roles table)

### user_funding_bookmarks
- **All operations**: Users can only manage their own bookmarks

## Next Steps

### To Apply Migrations:
1. **Local Development**: Migrations will run automatically if using Supabase CLI
2. **Production**: Apply migrations through Supabase Dashboard or CLI:
   ```bash
   supabase db push
   ```

### After Migrations:
1. Verify tables exist in Supabase Dashboard
2. Check seed data was inserted (should have 12 opportunities)
3. Test RLS policies work correctly
4. Regenerate Supabase types:
   ```bash
   supabase gen types typescript --local > src/integrations/supabase/types.ts
   ```

### Phase 2 (Next):
- Update UI components to use database instead of hardcoded data
- Create simple filtering UI
- Add search functionality
- Update FundingOpportunitiesSection to use `useFundingOpportunities` hook

## Features

✅ **Simple & User-Friendly**
- No login required to view opportunities
- Clear, readable data structure
- Fast queries with proper indexes

✅ **Easy to Maintain**
- Simple schema (no complex relationships)
- Easy to add new opportunities (admin only)
- Idempotent seed data

✅ **Scalable**
- Indexes for common queries
- GIN indexes for array searches
- Ready for full-text search upgrade

## Testing

After migrations are applied, test:
1. ✅ View opportunities without login
2. ✅ Filter by type (grant, accelerator, contest, microfund)
3. ✅ Filter by location
4. ✅ Search by keyword
5. ✅ View featured opportunities
6. ✅ Bookmark (if logged in)

## Notes

- Admin role is checked via `user_roles` table with `role = 'admin'`
- Seed data is idempotent (won't duplicate if run multiple times)
- Funding amounts are stored as text for simplicity (e.g., "$500,000")
- Location and keywords are arrays for flexible filtering
- All opportunities are active by default (set `is_active = false` to hide)


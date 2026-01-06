# Apply Hourly Rate Migration

## What Was Added

I've added a new "Hourly Rate" field to the Edit Mentor page that appears above the "8 Week Coaching Program Fee" field. This allows you to specify how much each mentor charges per hour for consulting, separate from the 8-week program fee.

---

## 🗄️ Database Migration Required

You need to run a SQL migration to add the `hourly_rate_per_hour` column to your database.

### Step 1: Go to Supabase SQL Editor

Visit: https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa/sql/new

### Step 2: Run This SQL Code

```sql
-- Add hourly_rate_per_hour column to mentors table
-- This column stores the per-hour consulting rate (separate from the 8-week program fee)
-- Stored in cents (e.g., 15000 = $150.00 per hour)

ALTER TABLE public.mentors
ADD COLUMN IF NOT EXISTS hourly_rate_per_hour INTEGER DEFAULT 0;

COMMENT ON COLUMN public.mentors.hourly_rate_per_hour IS 'Per-hour consulting rate in USD cents (e.g., 15000 = $150.00/hour). Default 0 means not offering hourly consulting.';

-- Update existing mentors to have a default hourly rate (optional, can be set later by admin)
UPDATE public.mentors
SET hourly_rate_per_hour = 0
WHERE hourly_rate_per_hour IS NULL;
```

### Step 3: Click "Run"

The migration will add the new column to all existing mentor records with a default value of $0.

---

## ✅ How It Works

### In the Admin Editor:

1. Go to any mentor edit page: `/community/admin/mentors/{id}/edit`
2. You'll now see **two** pricing fields:
   - **Hourly Rate (USD)**: For per-hour consulting (optional, default $0)
   - **8 Week Coaching Program Fee (USD)**: For the 8-week program (required, min $100)

### Example Usage:

**Mentor charges:**
- $150/hour for 1-on-1 consulting
- $1,500 for the 8-week coaching program

**You would enter:**
- Hourly Rate: `150`
- 8 Week Coaching Program Fee: `1500`

**If a mentor doesn't offer hourly consulting:**
- Hourly Rate: `0` (or leave as default)
- 8 Week Coaching Program Fee: `1500`

---

## 🔍 Field Details

| Field | Description | Format | Default | Required |
|-------|-------------|--------|---------|----------|
| Hourly Rate | Per-hour consulting fee | Dollars (stored as cents in DB) | $0 | No |
| 8 Week Program Fee | Full 8-week program fee | Dollars (stored as cents in DB) | $100 | Yes (min $100) |

---

## 📊 Database Storage

Both fields are stored in **cents** in the database:

- `hourly_rate_per_hour`: Integer (e.g., 15000 = $150.00/hour)
- `hourly_rate`: Integer (e.g., 150000 = $1,500.00 for 8-week program)

The UI automatically converts between dollars (what you enter) and cents (what's stored).

---

## 🧪 Testing

After running the migration:

1. Go to `/community/admin/mentors/new` to create a new mentor
2. You should see the "Hourly Rate" field above "8 Week Coaching Program Fee"
3. Enter a value like `150` for hourly rate
4. Enter a value like `1500` for 8-week program fee
5. Save the mentor
6. Edit the mentor again - both values should be preserved

---

## ✅ Success Checklist

- [ ] Ran the SQL migration in Supabase SQL Editor
- [ ] Saw "Success" message after running the migration
- [ ] Opened a mentor edit page
- [ ] See "Hourly Rate (USD)" field above "8 Week Coaching Program Fee"
- [ ] Can enter and save hourly rate values
- [ ] Values are preserved when editing existing mentors

---

**Migration file location:** `supabase/migrations/20260105_add_hourly_rate_per_hour_to_mentors.sql`

**The field is now live in the code and ready to use once you run the migration!**

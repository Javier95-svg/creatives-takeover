-- Refresh Ignite accelerator data from the current official website.
UPDATE public.funding_opportunities
SET
  description = 'India-based early-stage startup accelerator at Sri Eshwar College of Engineering in Coimbatore, helping founders move from ideation to incubation with mentorship, infrastructure, and funding support.',
  funding_amount = 'Funding support available',
  location = ARRAY['Coimbatore','Tamil Nadu','India'],
  keywords = ARRAY['IoT','Cyber Security','Energy Management','Student Startups'],
  website_url = 'https://www.igniteaccelerator.in/',
  application_url = 'https://www.igniteaccelerator.in/',
  url = 'https://www.igniteaccelerator.in/',
  logo_url = 'https://logo.clearbit.com/igniteaccelerator.in',
  program_duration = 'Program-based',
  program_format = 'In-person',
  focus_stage = ARRAY['idea','pre-seed'],
  focus_sectors = ARRAY['IoT','Cyber Security','Energy Management','Student Startups'],
  equity_taken = 'Not disclosed',
  funding_offered = 'Platform, infrastructure, mentorship, and funding support',
  cohort_geography = ARRAY['India','Asia'],
  application_deadline_info = 'See Ignite programs or events pages for current intake dates.',
  notable_alumni = '[]'::jsonb
WHERE type = 'accelerator'
  AND slug = 'ignite';

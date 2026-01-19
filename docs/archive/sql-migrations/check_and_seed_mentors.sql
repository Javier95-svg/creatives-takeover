-- First, check what mentors currently exist
SELECT id, name, is_active, is_featured, created_at
FROM mentors
ORDER BY created_at DESC;

-- If you need to add the mentors, run the following INSERT statements:
-- (Only run these if the SELECT above shows no mentors or missing mentors)

/*
-- Insert mentors with proper data
INSERT INTO mentors (name, bio, hourly_rate, is_active, is_featured, expertise, universities, linkedin_url, twitter_x_url, website_url)
VALUES
(
  'Samuel Starkman',
  'Experienced startup founder and advisor with expertise in early-stage ventures, product development, and fundraising. Helped multiple startups scale from idea to Series A.',
  15000, -- $150/hour in cents
  true,
  true,
  ARRAY['Product Development', 'Fundraising', 'Early Stage'],
  ARRAY['Stanford University'],
  'https://linkedin.com/in/samuelstarkman',
  NULL,
  NULL
),
(
  'Nic M Rayce',
  'Singapore-based entrepreneur and tech advisor specializing in SaaS, growth strategies, and market expansion across Asia-Pacific markets.',
  12000, -- $120/hour in cents
  true,
  true,
  ARRAY['SaaS', 'Growth Strategy', 'Market Expansion'],
  ARRAY['National University of Singapore'],
  NULL,
  NULL,
  NULL
),
(
  'Irfan Ahmad Malik',
  'Pakistani entrepreneur with deep expertise in mobile technology, fintech, and building products for emerging markets.',
  10000, -- $100/hour in cents
  true,
  false,
  ARRAY['Mobile Tech', 'Fintech', 'Emerging Markets'],
  ARRAY['LUMS'],
  NULL,
  NULL,
  NULL
),
(
  'Gonzalo Wangüemert',
  'Spanish startup mentor focused on European market entry, B2B sales, and building sustainable business models.',
  11000, -- $110/hour in cents
  true,
  false,
  ARRAY['B2B Sales', 'European Markets', 'Business Development'],
  ARRAY['IE Business School'],
  NULL,
  NULL,
  NULL
),
(
  'Marc Bright',
  'British advisor specializing in hourly consulting for startups. Expert in product-market fit, customer development, and lean startup methodologies.',
  8000, -- $80/hour in cents
  true,
  false,
  ARRAY['Product-Market Fit', 'Customer Development', 'Lean Startup'],
  ARRAY['Oxford University'],
  NULL,
  NULL,
  NULL
),
(
  'Vashti Joseph',
  'French entrepreneur and investor with expertise in fashion tech, e-commerce, and building consumer brands in European markets.',
  13000, -- $130/hour in cents
  true,
  false,
  ARRAY['Fashion Tech', 'E-commerce', 'Consumer Brands'],
  ARRAY['HEC Paris'],
  NULL,
  NULL,
  NULL
),
(
  'Ramona Chihaia',
  'Netherlands-based startup advisor focusing on sustainability, impact ventures, and circular economy business models.',
  11500, -- $115/hour in cents
  true,
  false,
  ARRAY['Sustainability', 'Impact Ventures', 'Circular Economy'],
  ARRAY['University of Amsterdam'],
  NULL,
  NULL,
  NULL
),
(
  'Dikshit Kukreja',
  'Indian entrepreneur with expertise in AI/ML, developer tools, and building technical products for global markets from India.',
  9500, -- $95/hour in cents
  true,
  false,
  ARRAY['AI/ML', 'Developer Tools', 'Technical Products'],
  ARRAY['IIT Delhi'],
  NULL,
  NULL,
  NULL
)
ON CONFLICT (name) DO NOTHING;

-- Verify the insert
SELECT id, name, is_active, is_featured, hourly_rate, expertise, universities
FROM mentors
ORDER BY is_featured DESC, created_at DESC;
*/

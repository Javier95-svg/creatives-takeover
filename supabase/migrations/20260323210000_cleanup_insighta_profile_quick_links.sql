-- Keep only verified VC and accelerator quick links in Insighta profiles.

-- Crunchbase pages are currently not reliable enough to verify one by one for end users,
-- so remove them from active VC profiles until a confirmed set is curated.
UPDATE public.investors
SET crunchbase_url = NULL
WHERE investor_type = 'vc'
  AND is_active = true;

-- Replace or remove VC LinkedIn URLs that no longer resolve.
UPDATE public.investors
SET linkedin_url = CASE slug
  WHEN '500-startups' THEN 'https://www.linkedin.com/company/500global'
  WHEN 'accel' THEN 'https://www.linkedin.com/company/accel-vc'
  WHEN 'f-prime-capital' THEN 'https://www.linkedin.com/company/f-prime-capital-partners'
  WHEN 'insight-partners' THEN 'https://www.linkedin.com/company/insight--partners'
  WHEN 'sequoia-capital' THEN 'https://www.linkedin.com/company/sequoia'
  WHEN 'indievc' THEN NULL
  ELSE linkedin_url
END
WHERE slug IN (
  '500-startups',
  'accel',
  'f-prime-capital',
  'indievc',
  'insight-partners',
  'sequoia-capital'
);

-- Refresh accelerator quick links from current official sources.
UPDATE public.funding_opportunities
SET
  website_url = CASE slug
    WHEN 'boomtown-accelerators' THEN NULL
    WHEN 'catalyst-fund' THEN 'https://www.thecatalystfund.com/'
    WHEN 'entrepreneur-first' THEN 'https://www.joinef.com/'
    WHEN 'food-x' THEN 'https://food-x.com/'
    WHEN 'muckerlab' THEN 'https://mucker.com/accelerator/'
    WHEN 'norrsken-accelerator' THEN 'https://accelerator.norrsken.org/'
    WHEN 'orange-fab' THEN 'https://orangefab.com/en/'
    WHEN 'station-f-founders-program' THEN 'https://stationf.co/'
    ELSE website_url
  END,
  application_url = CASE slug
    WHEN 'boomtown-accelerators' THEN 'https://www.f6s.com/boomtownapplication'
    WHEN 'catalyst-fund' THEN 'https://www.thecatalystfund.com/apply'
    WHEN 'entrepreneur-first' THEN 'https://apply.joinef.com'
    WHEN 'food-x' THEN NULL
    WHEN 'muckerlab' THEN 'https://mucker.com/accelerator/'
    WHEN 'norrsken-accelerator' THEN 'https://accelerator.norrsken.org/'
    WHEN 'orange-fab' THEN NULL
    WHEN 'station-f-founders-program' THEN 'https://stationf.co/apply'
    ELSE application_url
  END,
  url = CASE slug
    WHEN 'boomtown-accelerators' THEN 'https://www.f6s.com/boomtownapplication'
    WHEN 'catalyst-fund' THEN 'https://www.thecatalystfund.com/'
    WHEN 'entrepreneur-first' THEN 'https://www.joinef.com/'
    WHEN 'food-x' THEN 'https://food-x.com/'
    WHEN 'muckerlab' THEN 'https://mucker.com/accelerator/'
    WHEN 'norrsken-accelerator' THEN 'https://accelerator.norrsken.org/'
    WHEN 'orange-fab' THEN 'https://orangefab.com/en/'
    WHEN 'station-f-founders-program' THEN 'https://stationf.co/'
    ELSE url
  END
WHERE type = 'accelerator'
  AND slug IN (
    'boomtown-accelerators',
    'catalyst-fund',
    'entrepreneur-first',
    'food-x',
    'muckerlab',
    'norrsken-accelerator',
    'orange-fab',
    'station-f-founders-program'
  );

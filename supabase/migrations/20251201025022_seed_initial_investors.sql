-- ================================================
-- SEED INITIAL INVESTORS
-- Populate investors table with curated investor data
-- Idempotent: Only inserts if table is empty
-- ================================================

DO $$
BEGIN
  -- Only seed if table is empty
  IF NOT EXISTS (SELECT 1 FROM public.investors LIMIT 1) THEN
    
    -- Y Combinator
    INSERT INTO public.investors (
      name, firm_name, firm_website, industries, investment_stages,
      typical_check_size_min, typical_check_size_max,
      locations, geographic_focus, remote_friendly,
      portfolio_companies, recent_investments_count, total_portfolio_count,
      contact_preference, application_url, requires_warm_intro,
      response_rate_percentage, typical_timeline_days,
      is_featured, is_active, data_source, investment_thesis
    ) VALUES (
      'Paul Graham',
      'Y Combinator',
      'https://www.ycombinator.com',
      ARRAY['SaaS', 'AI/ML', 'Fintech', 'E-commerce', 'Healthcare', 'Technology'],
      ARRAY['pre-seed', 'seed'],
      125000, 500000,
      ARRAY['San Francisco', 'Mountain View'],
      ARRAY['US', 'Global'],
      true,
      '[{"name":"CloudSync","industry":"SaaS","stage":"Series A","description":"Cloud collaboration platform"},{"name":"DataFlow","industry":"SaaS","stage":"Seed","description":"Data pipeline automation"},{"name":"NeuralNet","industry":"AI/ML","stage":"Seed","description":"ML model deployment platform"}]'::jsonb,
      8, 45,
      'application',
      'https://www.ycombinator.com/apply',
      false,
      15, 30,
      true, true, 'manual',
      'We fund early-stage startups twice a year. We look for founders with strong technical backgrounds and big ideas.'
    );

    -- Techstars
    INSERT INTO public.investors (
      name, firm_name, firm_website, industries, investment_stages,
      typical_check_size_min, typical_check_size_max,
      locations, geographic_focus, remote_friendly,
      portfolio_companies, recent_investments_count, total_portfolio_count,
      contact_preference, application_url, requires_warm_intro,
      response_rate_percentage, typical_timeline_days,
      is_featured, is_active, data_source, investment_thesis
    ) VALUES (
      'David Cohen',
      'Techstars',
      'https://www.techstars.com',
      ARRAY['SaaS', 'AI/ML', 'Fintech', 'E-commerce', 'Healthcare'],
      ARRAY['pre-seed', 'seed'],
      120000, 200000,
      ARRAY['Boulder', 'New York', 'Seattle', 'London'],
      ARRAY['US', 'Europe', 'Global'],
      true,
      '[{"name":"CloudSync","industry":"SaaS","stage":"Series A"},{"name":"NeuralNet","industry":"AI/ML","stage":"Seed"}]'::jsonb,
      6, 38,
      'application',
      'https://www.techstars.com/apply',
      false,
      12, 45,
      true, true, 'manual',
      'We invest in the best entrepreneurs and help them succeed through our accelerator programs.'
    );

    -- AngelList
    INSERT INTO public.investors (
      name, firm_name, firm_website, industries, investment_stages,
      typical_check_size_min, typical_check_size_max,
      locations, geographic_focus, remote_friendly,
      portfolio_companies, recent_investments_count, total_portfolio_count,
      contact_preference, application_url, requires_warm_intro,
      response_rate_percentage, typical_timeline_days,
      is_active, data_source, investment_thesis
    ) VALUES (
      'Naval Ravikant',
      'AngelList',
      'https://angel.co',
      ARRAY['SaaS', 'AI/ML', 'Fintech', 'E-commerce'],
      ARRAY['pre-seed', 'seed'],
      25000, 500000,
      ARRAY['San Francisco'],
      ARRAY['US', 'Global'],
      true,
      '[{"name":"CloudSync","industry":"SaaS"},{"name":"PayFlow","industry":"Fintech"}]'::jsonb,
      5, 32,
      'application',
      'https://angel.co/apply',
      false,
      20, 14,
      true, 'manual',
      'We help startups raise capital and connect with investors through our platform.'
    );

    -- SaaStr Fund
    INSERT INTO public.investors (
      name, firm_name, firm_website, industries, investment_stages,
      typical_check_size_min, typical_check_size_max,
      locations, geographic_focus, remote_friendly,
      portfolio_companies, recent_investments_count, total_portfolio_count,
      contact_preference, email, requires_warm_intro,
      response_rate_percentage, typical_timeline_days,
      is_featured, is_active, data_source, investment_thesis
    ) VALUES (
      'Jason Lemkin',
      'SaaStr Fund',
      'https://www.saastr.com',
      ARRAY['SaaS'],
      ARRAY['seed', 'series-a'],
      500000, 2000000,
      ARRAY['San Francisco'],
      ARRAY['US', 'Global'],
      true,
      '[{"name":"CloudSync","industry":"SaaS","stage":"Series A"},{"name":"TeamHub","industry":"SaaS","stage":"Series B"}]'::jsonb,
      4, 28,
      'email',
      'invest@saastr.com',
      false,
      25, 21,
      true, true, 'manual',
      'We invest exclusively in B2B SaaS companies at seed and Series A stages.'
    );

    -- a16z
    INSERT INTO public.investors (
      name, firm_name, firm_website, industries, investment_stages,
      typical_check_size_min, typical_check_size_max,
      locations, geographic_focus, remote_friendly,
      portfolio_companies, recent_investments_count, total_portfolio_count,
      contact_preference, requires_warm_intro,
      response_rate_percentage, typical_timeline_days,
      is_active, data_source, investment_thesis
    ) VALUES (
      'Marc Andreessen',
      'a16z',
      'https://a16z.com',
      ARRAY['SaaS', 'AI/ML', 'Fintech', 'Healthcare', 'E-commerce'],
      ARRAY['seed', 'series-a', 'series-b'],
      1000000, 10000000,
      ARRAY['Menlo Park'],
      ARRAY['US', 'Global'],
      true,
      '[{"name":"CloudSync","industry":"SaaS"},{"name":"NeuralNet","industry":"AI/ML"},{"name":"PayFlow","industry":"Fintech"}]'::jsonb,
      7, 52,
      'warm-intro-only',
      true,
      5, 60,
      true, 'manual',
      'We invest in software companies that are building the future.'
    );

    -- First Round Capital
    INSERT INTO public.investors (
      name, firm_name, firm_website, industries, investment_stages,
      typical_check_size_min, typical_check_size_max,
      locations, geographic_focus, remote_friendly,
      portfolio_companies, recent_investments_count, total_portfolio_count,
      contact_preference, application_url, requires_warm_intro,
      response_rate_percentage, typical_timeline_days,
      is_active, data_source, investment_thesis
    ) VALUES (
      'First Round Capital',
      'First Round Capital',
      'https://firstround.com',
      ARRAY['SaaS', 'AI/ML', 'Fintech', 'E-commerce', 'Healthcare'],
      ARRAY['pre-seed', 'seed'],
      250000, 2000000,
      ARRAY['San Francisco', 'New York'],
      ARRAY['US'],
      false,
      '[{"name":"CloudSync","industry":"SaaS"},{"name":"NeuralNet","industry":"AI/ML"}]'::jsonb,
      5, 35,
      'application',
      'https://firstround.com/apply',
      false,
      18, 30,
      true, 'manual',
      'We are a seed-stage venture firm focused on building a vibrant community of entrepreneurs.'
    );

    -- Weekend Fund
    INSERT INTO public.investors (
      name, firm_name, firm_website, industries, investment_stages,
      typical_check_size_min, typical_check_size_max,
      locations, geographic_focus, remote_friendly,
      portfolio_companies, recent_investments_count, total_portfolio_count,
      contact_preference, email, requires_warm_intro,
      response_rate_percentage, typical_timeline_days,
      is_active, data_source, investment_thesis
    ) VALUES (
      'Ryan Hoover',
      'Weekend Fund',
      'https://weekend.fund',
      ARRAY['SaaS', 'E-commerce', 'Technology'],
      ARRAY['pre-seed', 'seed'],
      25000, 250000,
      ARRAY['San Francisco'],
      ARRAY['US', 'Global'],
      true,
      '[{"name":"TechStart","industry":"Technology"}]'::jsonb,
      3, 18,
      'email',
      'hello@weekend.fund',
      false,
      30, 7,
      true, 'manual',
      'We invest in early-stage consumer and B2B companies.'
    );

    -- AI Fund
    INSERT INTO public.investors (
      name, firm_name, firm_website, industries, investment_stages,
      typical_check_size_min, typical_check_size_max,
      locations, geographic_focus, remote_friendly,
      portfolio_companies, recent_investments_count, total_portfolio_count,
      contact_preference, email, requires_warm_intro,
      response_rate_percentage, typical_timeline_days,
      is_featured, is_active, data_source, investment_thesis
    ) VALUES (
      'AI Fund',
      'AI Fund',
      'https://aifund.com',
      ARRAY['AI/ML'],
      ARRAY['pre-seed', 'seed', 'series-a'],
      500000, 5000000,
      ARRAY['Palo Alto'],
      ARRAY['US', 'Global'],
      true,
      '[{"name":"NeuralNet","industry":"AI/ML","stage":"Seed"},{"name":"AutoBot","industry":"AI/ML","stage":"Series A"}]'::jsonb,
      6, 42,
      'email',
      'invest@aifund.com',
      false,
      18, 30,
      true, true, 'manual',
      'We invest in AI and machine learning companies that solve real problems.'
    );

    -- 500 Startups
    INSERT INTO public.investors (
      name, firm_name, firm_website, industries, investment_stages,
      typical_check_size_min, typical_check_size_max,
      locations, geographic_focus, remote_friendly,
      portfolio_companies, recent_investments_count, total_portfolio_count,
      contact_preference, application_url, requires_warm_intro,
      response_rate_percentage, typical_timeline_days,
      is_active, data_source, investment_thesis
    ) VALUES (
      '500 Startups',
      '500 Startups',
      'https://500.co',
      ARRAY['SaaS', 'AI/ML', 'Fintech', 'E-commerce', 'Healthcare'],
      ARRAY['pre-seed', 'seed'],
      150000, 250000,
      ARRAY['San Francisco', 'Mountain View'],
      ARRAY['US', 'Global'],
      true,
      '[{"name":"CloudSync","industry":"SaaS"},{"name":"NeuralNet","industry":"AI/ML"}]'::jsonb,
      4, 30,
      'application',
      'https://500.co/apply',
      false,
      20, 30,
      true, 'manual',
      'We invest in early-stage startups across all industries.'
    );

    -- Remote First Capital
    INSERT INTO public.investors (
      name, firm_name, firm_website, industries, investment_stages,
      typical_check_size_min, typical_check_size_max,
      locations, geographic_focus, remote_friendly,
      portfolio_companies, recent_investments_count, total_portfolio_count,
      contact_preference, email, requires_warm_intro,
      response_rate_percentage, typical_timeline_days,
      is_active, data_source, investment_thesis
    ) VALUES (
      'Remote First Capital',
      'Remote First Capital',
      'https://remotefirst.vc',
      ARRAY['SaaS', 'AI/ML', 'E-commerce'],
      ARRAY['pre-seed', 'seed'],
      100000, 1000000,
      ARRAY['Remote'],
      ARRAY['Global'],
      true,
      '[{"name":"CloudSync","industry":"SaaS"},{"name":"NeuralNet","industry":"AI/ML"}]'::jsonb,
      3, 22,
      'email',
      'hello@remotefirst.vc',
      false,
      30, 14,
      true, 'manual',
      'We invest in remote-first companies building distributed teams.'
    );

    -- Note: Additional investors can be added by running a script that converts
    -- the TypeScript data from src/data/initialInvestors.ts to SQL INSERT statements
    -- For now, this seed provides a representative sample of key investors

  END IF;
END $$;


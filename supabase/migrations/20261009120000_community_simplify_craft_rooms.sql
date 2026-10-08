-- Community: fewer skill rooms. Seven was too many for the activity there is,
-- and two duplicated other sections:
--   Co-founders & team  -> Find a Co-Founder (Network) already covers it.
--   Tech stack          -> Tech Stack Builder (Resources) and the Building room.
--   Customers & ICP + Distribution -> one "Customers & growth" room.
-- Posts and follows move to the closest remaining room instead of being lost.

-- Distribution folds into customers.
UPDATE public.community_posts SET topic = 'customers' WHERE topic = 'distribution';
INSERT INTO public.user_topic_preferences (user_id, topic)
SELECT user_id, 'customers' FROM public.user_topic_preferences WHERE topic = 'distribution'
ON CONFLICT (user_id, topic) DO NOTHING;

-- Tech stack questions belong with building the product.
UPDATE public.community_posts SET topic = 'building' WHERE topic = 'tech-stack';
INSERT INTO public.user_topic_preferences (user_id, topic)
SELECT user_id, 'building' FROM public.user_topic_preferences WHERE topic = 'tech-stack'
ON CONFLICT (user_id, topic) DO NOTHING;

-- Team posts are founder conversations; partner search lives in Find a Co-Founder.
UPDATE public.community_posts SET topic = 'founder-life' WHERE topic = 'team';
INSERT INTO public.user_topic_preferences (user_id, topic)
SELECT user_id, 'founder-life' FROM public.user_topic_preferences WHERE topic = 'team'
ON CONFLICT (user_id, topic) DO NOTHING;

-- Follows on the removed rooms cascade away with them.
DELETE FROM public.launchpad_topics WHERE slug IN ('distribution', 'tech-stack', 'team');

UPDATE public.launchpad_topics SET label = 'Customers & growth', sort_order = 60 WHERE slug = 'customers';
UPDATE public.launchpad_topics SET sort_order = 70 WHERE slug = 'pricing';
UPDATE public.launchpad_topics SET sort_order = 80 WHERE slug = 'product';
UPDATE public.launchpad_topics SET sort_order = 90 WHERE slug = 'founder-life';

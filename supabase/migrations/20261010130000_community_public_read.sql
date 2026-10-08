-- Community is public to read: visitors see room activity and the weekly
-- launch round. Both functions return only public data (counts, launches,
-- makers' public stages); for anon, voted and is_mine are always false.
-- Writing (posting, voting, entering) still requires an account.
GRANT EXECUTE ON FUNCTION public.launchpad_topic_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.launchpad_round(date, text, integer) TO anon;

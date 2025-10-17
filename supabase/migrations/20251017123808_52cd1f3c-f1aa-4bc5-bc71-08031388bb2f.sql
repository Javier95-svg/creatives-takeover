-- Delete posts from David Kim and Priya Sharma
DELETE FROM community_posts 
WHERE title IN (
  'Validation > Building',
  'My 3 startup failures taught me everything about success'
);
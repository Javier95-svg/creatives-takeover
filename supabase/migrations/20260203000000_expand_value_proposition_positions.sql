-- Expand value_proposition_images position range to support 6 cards
ALTER TABLE public.value_proposition_images
  DROP CONSTRAINT IF EXISTS value_proposition_images_position_check;

ALTER TABLE public.value_proposition_images
  ADD CONSTRAINT value_proposition_images_position_check CHECK (position >= 1 AND position <= 6);

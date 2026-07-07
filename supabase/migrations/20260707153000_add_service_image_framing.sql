-- Store manual image framing for Service Marketplace banners and provider photos.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS banner_focal_x SMALLINT DEFAULT 50 CHECK (banner_focal_x >= 0 AND banner_focal_x <= 100),
  ADD COLUMN IF NOT EXISTS banner_focal_y SMALLINT DEFAULT 50 CHECK (banner_focal_y >= 0 AND banner_focal_y <= 100),
  ADD COLUMN IF NOT EXISTS delivered_by_picture_focal_x SMALLINT DEFAULT 50 CHECK (delivered_by_picture_focal_x >= 0 AND delivered_by_picture_focal_x <= 100),
  ADD COLUMN IF NOT EXISTS delivered_by_picture_focal_y SMALLINT DEFAULT 50 CHECK (delivered_by_picture_focal_y >= 0 AND delivered_by_picture_focal_y <= 100);

COMMENT ON COLUMN public.services.banner_focal_x IS 'Manual banner horizontal framing percentage for object-position.';
COMMENT ON COLUMN public.services.banner_focal_y IS 'Manual banner vertical framing percentage for object-position.';
COMMENT ON COLUMN public.services.delivered_by_picture_focal_x IS 'Manual provider photo horizontal framing percentage for object-position.';
COMMENT ON COLUMN public.services.delivered_by_picture_focal_y IS 'Manual provider photo vertical framing percentage for object-position.';

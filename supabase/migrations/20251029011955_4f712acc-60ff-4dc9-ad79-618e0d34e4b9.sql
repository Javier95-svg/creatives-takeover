-- Clean up expired and inactive articles to allow fresh content
DELETE FROM trends WHERE is_active = false OR expires_at <= now();
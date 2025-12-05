// Mentor Marketplace Type Definitions

export interface Mentor {
  id: string;
  user_id?: string; // Link to user account if mentor is a platform user
  name: string;
  picture?: string; // Avatar/profile picture URL
  bio: string;
  hourly_rate: number; // In USD cents (e.g., 10000 = $100.00)
  stripe_connected_account_id?: string; // Stripe Connect account ID
  expertise?: string[]; // Array of expertise areas/tags
  rating?: number; // Average rating (1-5)
  review_count?: number; // Total number of reviews
  availability?: AvailabilitySlot[]; // Available time slots
  is_active?: boolean; // Whether mentor is accepting new bookings
  is_featured?: boolean; // Whether mentor is featured on the hub page
  linkedin_url?: string; // LinkedIn profile URL
  twitter_x_url?: string; // X (Twitter) profile URL
  website_url?: string; // Personal or company website URL
  calendly_url?: string; // Calendly scheduling link for discovery calls
  nationality?: string; // Country name or code (e.g., "USA", "US", "United States")
  universities?: string[]; // Array of universities/educational institutions
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySlot {
  id?: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  timezone?: string; // Default: UTC
}

export interface Booking {
  id: string;
  mentor_id: string;
  founder_id: string;
  scheduled_time: string; // ISO 8601 datetime
  duration_minutes: number; // Typically 60 minutes
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  payment_intent_id?: string; // Stripe Payment Intent ID
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  amount_charged: number; // Total charged to founder (in cents)
  platform_fee: number; // Platform fee (10% in cents)
  mentor_payout: number; // Amount sent to mentor (90% in cents)
  zoom_link?: string; // Zoom meeting link
  calendar_event_id?: string; // Calendar event ID
  notes?: string; // Notes from founder
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  cancellation_reason?: string;
}

export interface Review {
  id: string;
  mentor_id: string;
  founder_id: string;
  booking_id?: string; // Link to booking if review is from a booking
  rating: number; // 1-5 stars
  comment?: string; // Review text
  created_at: string;
  updated_at: string;
}

export interface MentorProfile extends Mentor {
  testimonials?: Testimonial[];
  recent_reviews?: Review[];
  total_sessions_completed?: number;
  response_time_hours?: number; // Average response time
}

export interface Testimonial {
  id: string;
  mentor_id: string;
  founder_name: string;
  founder_avatar?: string;
  text: string;
  rating: number;
  created_at: string;
}

export type BookingStatus = Booking['status'];
export type PaymentStatus = Booking['payment_status'];


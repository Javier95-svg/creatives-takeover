# BizMap AI Chatbot Features

## Core Features

### 🤖 Smart FAQ Matching
- Keyword-based question matching
- Contextual responses based on current page route
- Fallback responses for unmatched queries
- 8 predefined FAQ categories covering business planning, pricing, and platform features

### 💬 Interactive Chat Interface
- Clean, modern UI design
- Minimizable chat window
- Message history with timestamps
- User and bot message differentiation
- Scrollable message area with smooth animations

### ⚡ Typing Animation System
- Realistic typing effect for bot responses
- Configurable typing speed (default: 30ms per character)
- Skip animation option for long messages
- Smooth cursor animation with pulse effect

### 🎯 Quick Actions
- Contextual action buttons on bot messages
- Three action types:
  - `navigate`: Redirect to specific URLs
  - `faq`: Trigger specific FAQ responses
  - `scroll`: Scroll to page sections
- Customizable button styling and behavior

### 📱 Responsive Design
- Mobile-optimized interface
- Adaptive sizing and positioning
- Touch-friendly interactions
- Proper viewport handling

## Technical Features

### 🔧 Modular Architecture
- Separation of concerns with dedicated hooks
- Reusable components
- Type-safe TypeScript implementation
- Clean prop interfaces

### 🎨 Styling System
- Tailwind CSS integration
- Design system tokens support
- Consistent spacing and typography
- Dark/light mode compatible classes

### 📊 State Management
- React hooks-based state management
- Automatic message ID generation
- Timestamp tracking for all messages
- Typing state indicators

## FAQ Database Structure

### Current FAQ Topics:
1. **Platform Overview** - "What is BizMap?"
2. **Pricing Information** - Subscription and credit details
3. **How It Works** - Platform functionality
4. **Account Management** - Registration and access
5. **Support & Contact** - Help and assistance
6. **Technology Stack** - Technical specifications
7. **Business Planning** - Core features
8. **Getting Started** - Onboarding process

### Contextual Responses
- Homepage (`/`): General platform information
- Pricing page (`/pricing`): Pricing and subscription details
- FAQ page (`/faq`): Support and help topics
- About page (`/about`): Company and platform information

## UI Components

### ChatbotWidget
- **Position**: Fixed bottom-right corner
- **Size**: Responsive (380px width on desktop, full width on mobile)
- **States**: Open, minimized, closed
- **Controls**: Minimize, close, send message
- **Features**: Auto-scroll, message history, typing indicators

### TypingMessage
- **Animation**: Character-by-character typing
- **Speed**: Configurable (default 30ms/char)
- **Skip Option**: Available for messages >50 characters
- **Styling**: Bot avatar, message bubble, typing cursor

## Browser Compatibility

- **Modern Browsers**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **Mobile**: iOS Safari 14+, Chrome Mobile 88+
- **React**: 18.0+ (compatible with React 19)
- **TypeScript**: 4.5+ support

## Performance

- **Bundle Size**: ~15KB gzipped (excluding dependencies)
- **Dependencies**: Minimal external dependencies
- **Lazy Loading**: Components can be lazy-loaded
- **Memory**: Efficient message storage and cleanup
# Customization Guide

## FAQ Configuration

### Adding New FAQs

Edit `src/data/chatbotFAQ.ts` to add new questions:

```typescript
export const chatbotFAQ: FAQItem[] = [
  // ... existing FAQs
  {
    id: 'your-new-faq',
    keywords: ['keyword1', 'keyword2', 'phrase to match'],
    question: 'What is your question?',
    answer: 'Your detailed answer here.',
    category: 'general',
    quickActions: [
      { text: 'Learn More', action: 'navigate', href: '/your-page' },
      { text: 'Contact Us', action: 'navigate', href: '/contact' }
    ]
  }
];
```

### Contextual FAQ Configuration

Modify the `getContextualFAQ` function to add page-specific FAQs:

```typescript
export const getContextualFAQ = (currentPath: string): FAQItem[] => {
  const pathMappings: Record<string, string[]> = {
    '/': ['what-is-bizmap', 'how-it-works'],
    '/your-page': ['your-faq-id', 'another-faq-id'],
    // Add your custom paths
  };
  
  const relevantIds = pathMappings[currentPath] || [];
  return chatbotFAQ.filter(item => relevantIds.includes(item.id));
};
```

## Styling Customization

### Colors and Theme

Update CSS variables in your `index.css`:

```css
:root {
  /* Chatbot specific colors */
  --chatbot-primary: 222.2 47.4% 11.2%;
  --chatbot-background: 0 0% 100%;
  --chatbot-muted: 210 40% 98%;
  --chatbot-border: 214.3 31.8% 91.4%;
}
```

### Component Styling

Customize the ChatbotWidget appearance:

```tsx
// In ChatbotWidget.tsx, modify these classes:
<div className="fixed bottom-4 right-4 z-50 w-80 h-96 bg-background border border-border rounded-lg shadow-lg">
  {/* Change to your preferred styling */}
</div>
```

### Message Styling

Customize message appearance in `TypingMessage.tsx`:

```tsx
<div className="max-w-[85%] bg-muted p-3 rounded-lg rounded-bl-none text-sm">
  {/* Modify padding, background, border-radius */}
</div>
```

## Animation Configuration

### Typing Speed

Adjust typing animation speed:

```tsx
// In ChatbotWidget.tsx
<TypingMessage 
  content={message.content} 
  speed={20} // Faster typing (default: 30)
/>
```

### Animation Timing

Modify bot response delay in `useChatbot.ts`:

```typescript
setTimeout(() => {
  // Bot response logic
}, 800); // Faster response (default: 1000-2000ms)
```

## UI Layout Options

### Position Configuration

Change chatbot position:

```tsx
// Bottom-left positioning
<div className="fixed bottom-4 left-4 z-50">

// Center positioning
<div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">

// Top-right positioning  
<div className="fixed top-4 right-4 z-50">
```

### Size Customization

Adjust chatbot dimensions:

```tsx
// Larger chatbot
<div className="w-96 h-[500px]">

// Smaller chatbot
<div className="w-72 h-80">

// Full height on mobile
<div className="w-80 h-96 md:h-screen">
```

## Quick Actions Customization

### Action Types

Add custom action handlers in `useChatbot.ts`:

```typescript
const handleQuickAction = useCallback((action: string, href?: string) => {
  switch(action) {
    case 'navigate':
      window.location.href = href;
      break;
    case 'scroll':
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
      break;
    case 'custom-action':
      // Your custom logic here
      console.log('Custom action triggered');
      break;
    // Add more custom actions
  }
}, []);
```

### Button Styling

Customize quick action buttons:

```tsx
<button className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
  {/* Modify colors, padding, hover effects */}
</button>
```

## Welcome Message Customization

Change the initial bot message:

```typescript
// In useChatbot.ts
const welcomeMessage: ChatMessage = {
  id: '1',
  content: "Your custom welcome message here! 🚀",
  isBot: true,
  timestamp: new Date(),
  quickActions: [
    { text: 'Get Started', action: 'navigate', href: '/onboarding' },
    // Your custom quick actions
  ]
};
```

## Advanced Customization

### Custom Message Types

Extend the ChatMessage interface:

```typescript
export interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  messageType?: 'text' | 'image' | 'link' | 'custom';
  metadata?: Record<string, any>;
  quickActions?: Array<{
    text: string;
    action: string;
    href?: string;
    icon?: string; // Add icon support
  }>;
}
```

### Integration with Analytics

Add tracking to message interactions:

```typescript
const sendMessage = useCallback(async (content: string) => {
  // Analytics tracking
  if (typeof gtag !== 'undefined') {
    gtag('event', 'chatbot_message_sent', {
      message: content,
      timestamp: new Date().toISOString()
    });
  }
  
  // Rest of message logic...
}, []);
```

### Custom Avatar

Replace the default bot icon:

```tsx
// In TypingMessage.tsx
<div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
  <img src="/your-bot-avatar.png" alt="Bot" className="w-6 h-6 rounded-full" />
</div>
```

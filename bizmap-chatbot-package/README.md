# BizMap AI Chatbot Package

A sophisticated React chatbot component with FAQ matching, typing animations, and contextual responses.

## Features

- 🤖 Smart FAQ matching with keyword recognition
- ⚡ Contextual responses based on current page
- 💬 Typing animation effects
- 🎯 Interactive quick actions
- 📱 Responsive design with mobile optimization
- 🎨 Beautiful UI with Tailwind CSS
- 🔧 Fully customizable and extensible

## Quick Start

### 1. Install Dependencies

```bash
npm install @radix-ui/react-scroll-area @radix-ui/react-dialog lucide-react class-variance-authority clsx tailwind-merge
```

### 2. Copy Files

Copy all files from the `src/` directory to your React project:

```
your-project/
├── src/
│   ├── components/
│   │   ├── ChatbotWidget.tsx
│   │   └── TypingMessage.tsx
│   ├── hooks/
│   │   ├── useChatbot.ts
│   │   └── useTypingAnimation.ts
│   └── data/
│       └── chatbotFAQ.ts
```

### 3. Add to Your App

```tsx
import ChatbotWidget from './components/ChatbotWidget';

function App() {
  return (
    <div className="App">
      {/* Your app content */}
      <ChatbotWidget />
    </div>
  );
}
```

### 4. Required CSS Classes

Ensure your Tailwind CSS setup includes these design tokens in your `index.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --muted: 210 40% 98%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}
```

## File Structure

- **`ChatbotWidget.tsx`** - Main chatbot UI component
- **`TypingMessage.tsx`** - Animated message component
- **`useChatbot.ts`** - Core chatbot logic and state management
- **`useTypingAnimation.ts`** - Typing animation hook
- **`chatbotFAQ.ts`** - FAQ database and configuration

## Customization

See `CUSTOMIZATION.md` for detailed customization options.

## Integration Guide

See `INTEGRATION.md` for platform-specific integration instructions.

## License

This chatbot package is provided as-is for educational and commercial use.
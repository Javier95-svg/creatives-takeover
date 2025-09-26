# Integration Guide

## React Integration

### Standard React App

1. **Install Dependencies**
```bash
npm install @radix-ui/react-scroll-area @radix-ui/react-dialog lucide-react class-variance-authority clsx tailwind-merge
```

2. **Copy Files**
```bash
# Copy the chatbot files to your src directory
cp -r bizmap-chatbot-package/src/* your-project/src/
```

3. **Add to App.tsx**
```tsx
import React from 'react';
import ChatbotWidget from './components/ChatbotWidget';
import './App.css';

function App() {
  return (
    <div className="App">
      {/* Your existing app content */}
      <ChatbotWidget />
    </div>
  );
}

export default App;
```

### Next.js Integration

1. **Install Dependencies**
```bash
npm install @radix-ui/react-scroll-area @radix-ui/react-dialog lucide-react class-variance-authority clsx tailwind-merge
```

2. **Create Components Directory**
```bash
mkdir -p components/chatbot
mkdir -p hooks
mkdir -p data
```

3. **Copy Files**
```bash
cp bizmap-chatbot-package/src/components/* components/chatbot/
cp bizmap-chatbot-package/src/hooks/* hooks/
cp bizmap-chatbot-package/src/data/* data/
```

4. **Add to Layout or Page**
```tsx
// app/layout.tsx or pages/_app.tsx
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <ChatbotWidget />
      </body>
    </html>
  );
}
```

### Vite React Integration

1. **Install Dependencies**
```bash
npm install @radix-ui/react-scroll-area @radix-ui/react-dialog lucide-react class-variance-authority clsx tailwind-merge
```

2. **Configure Path Alias (vite.config.ts)**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

3. **Copy Files and Import**
```tsx
// src/App.tsx
import ChatbotWidget from '@/components/ChatbotWidget';

function App() {
  return (
    <>
      {/* Your app content */}
      <ChatbotWidget />
    </>
  );
}
```

## Tailwind CSS Setup

### Required Configuration

Add to `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    // Add chatbot component paths
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        border: "hsl(var(--border))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
```

### CSS Variables

Add to your main CSS file (`index.css` or `globals.css`):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --muted: 210 40% 98%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --border: 214.3 31.8% 91.4%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --border: 217.2 32.6% 17.5%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 84% 4.9%;
  }
}
```

## Framework-Specific Integration

### Gatsby Integration

1. **Install Dependencies**
```bash
npm install @radix-ui/react-scroll-area @radix-ui/react-dialog lucide-react class-variance-authority clsx tailwind-merge
```

2. **Create Layout Component**
```tsx
// src/components/layout.tsx
import React from 'react';
import ChatbotWidget from './ChatbotWidget';

const Layout = ({ children }) => {
  return (
    <>
      <main>{children}</main>
      <ChatbotWidget />
    </>
  );
};

export default Layout;
```

3. **Use in Pages**
```tsx
// src/pages/index.tsx
import Layout from '../components/layout';

const IndexPage = () => {
  return (
    <Layout>
      {/* Page content */}
    </Layout>
  );
};
```

### TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "lib": ["dom", "dom.iterable", "es6"],
    "strict": true
  },
  "include": [
    "src/**/*"
  ]
}
```

## Environment-Specific Setup

### Development Environment

```tsx
// Conditionally render chatbot in development
function App() {
  return (
    <>
      {/* Your app content */}
      {process.env.NODE_ENV === 'development' && <ChatbotWidget />}
    </>
  );
}
```

### Production Considerations

1. **Bundle Optimization**
```tsx
// Lazy load chatbot for better performance
import { lazy, Suspense } from 'react';

const ChatbotWidget = lazy(() => import('./components/ChatbotWidget'));

function App() {
  return (
    <>
      {/* Your app content */}
      <Suspense fallback={null}>
        <ChatbotWidget />
      </Suspense>
    </>
  );
}
```

2. **Error Boundaries**
```tsx
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  return (
    <>
      {/* Your app content */}
      <ErrorBoundary fallback={<div>Chatbot unavailable</div>}>
        <ChatbotWidget />
      </ErrorBoundary>
    </>
  );
}
```

## Mobile Integration

### Responsive Considerations

The chatbot automatically adapts to mobile screens, but you can customize:

```tsx
// Custom mobile positioning
<div className="fixed bottom-4 right-4 z-50 w-80 h-96 md:w-96 md:h-96 sm:w-full sm:h-full sm:bottom-0 sm:right-0 sm:rounded-none">
```

### PWA Integration

For Progressive Web Apps, ensure the chatbot doesn't interfere with install prompts:

```css
/* Adjust z-index if needed */
.chatbot-widget {
  z-index: 1000; /* Below PWA install prompts */
}
```

## Testing Integration

### Jest Configuration

Add to `jest.config.js`:

```javascript
module.exports = {
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
};
```

### Test Example

```tsx
// ChatbotWidget.test.tsx
import { render, screen } from '@testing-library/react';
import ChatbotWidget from './ChatbotWidget';

test('renders chatbot widget', () => {
  render(<ChatbotWidget />);
  expect(screen.getByLabelText(/chat/i)).toBeInTheDocument();
});
```
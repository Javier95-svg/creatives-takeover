import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

// The markdown parser is about 140 KB, so it lives in its own chunk that loads
// with the first assistant reply rather than with the widget on every page.
export default function PulseMarkdown({ content, components }: { content: string; components: Components }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
      {content}
    </ReactMarkdown>
  );
}

import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { getPostTextLinks } from '@/lib/platformMentions';

export function LinkedPostText({ content }: { content: string }) {
  let cursor = 0;
  const links = getPostTextLinks(content);
  const style = 'text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  return <>{links.map((link) => {
    const preceding = content.slice(cursor, link.start);
    cursor = link.end;
    return <Fragment key={link.start}>{preceding}{link.href.startsWith('/')
      ? <Link to={link.href} className={style}>{link.text}</Link>
      : <a href={link.href} target="_blank" rel="noopener noreferrer ugc" className={style}>{link.text}</a>}
    </Fragment>;
  })}{content.slice(cursor)}</>;
}

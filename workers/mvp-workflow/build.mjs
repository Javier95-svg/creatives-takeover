import { build } from 'esbuild';
import { createRequire } from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
export async function buildArtifact(snapshot){
  const files=new Map();
  for(const file of snapshot.files || []){
    const name=file.filename || file.path;
    if(typeof name!=='string' || name.startsWith('/') || name.includes('..') || name.includes('\\') || typeof file.content!=='string')throw new Error('Invalid project file path');
    if(files.has(name))throw new Error('Duplicate project file');
    files.set(name,file.content);
  }
  let html=files.get('index.html');if(!html)throw new Error('Add index.html before testing');
  if(snapshot.projectType==='react_vite'){
    const scripts=[...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi)];
    const match=scripts.find(m=>/type=["']module["']/i.test(m[0])&&!m[1].endsWith('ct-workflow.js'))||scripts.find(m=>!m[1].endsWith('ct-workflow.js'));
    if(!match)throw new Error('React entry script is missing');
    const entry=match[1].replace(/^\//,'');
    const compiled=await build({entryPoints:[entry],bundle:true,write:false,outdir:'out',format:'esm',platform:'browser',logLevel:'silent',jsx:'automatic',minify:true,tsconfigRaw:{},define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'saved-files',setup(b){
      b.onResolve({filter:/.*/},args=>{
        if(args.kind==='entry-point')return {path:args.path.replace(/^\.\//,''),namespace:'saved'};
        if(args.namespace==='file')return;
        if(args.path.startsWith('.') || args.path.startsWith('/') || args.path.startsWith('@/')){
          const base=args.path.startsWith('@/')?'src/'+args.path.slice(2):args.path.startsWith('/')?args.path.slice(1):path.posix.normalize(path.posix.join(path.posix.dirname(args.importer),args.path));
          const found=[base,...['.tsx','.ts','.jsx','.js','.css','/index.tsx','/index.ts','/index.js'].map(ext=>base+ext)].find(f=>files.has(f));
          if(!found)throw new Error('Missing saved dependency: '+base);
          return {path:found,namespace:'saved'};
        }
        if(!/^(react|react-dom|lucide-react)(\/|$)/.test(args.path))throw new Error('Unsupported dependency: '+args.path+'. Use the supported browser stack.');
        return {path:require.resolve(args.path),namespace:'file'};
      });
      b.onLoad({filter:/.*/,namespace:'saved'},args=>({contents:files.get(args.path),loader:args.path.endsWith('.css')?'css':args.path.endsWith('.tsx')?'tsx':args.path.endsWith('.ts')?'ts':args.path.endsWith('.json')?'json':'jsx'}));
    }}]});
    const assets=compiled.outputFiles.map(f=>({filename:'assets/'+path.basename(f.path),content:f.text}));
    const js=assets.find(f=>f.filename.endsWith('.js'));if(!js)throw new Error('No built JavaScript');
    html=html.replace(match[0],'<script type="module" src="/'+js.filename+'"></script>');
    for(const css of assets.filter(f=>f.filename.endsWith('.css')))html=html.replace('</head>','<link rel="stylesheet" href="/'+css.filename+'"></head>');
    return [{filename:'index.html',content:html},...assets,...[...files].filter(([name])=>name!=='index.html' && !assets.some(a=>a.filename===name) && /\.(css|js|mjs|svg|json|txt|webmanifest)$/i.test(name)).map(([filename,content])=>({filename,content}))];
  }
  return [...files].filter(([name])=>/\.(html?|css|js|mjs|svg|json|txt|webmanifest)$/i.test(name)).map(([filename,content])=>({filename,content}));
}

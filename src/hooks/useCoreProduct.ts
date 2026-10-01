import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const connectedToolsEnabled = () => import.meta.env.VITE_CORE_TOOLS_CONNECTED_ENABLED === 'true';
export type CoreTool = 'pmf_lab' | 'gtm_strategist' | 'traction_engine';
export interface CoreProduct { id: string; name: string; timezone: string }
const db = supabase as any;

export function useCoreProduct(tool?: CoreTool, artifactId?: string | null) {
  const { user } = useAuth();
  const generation = useRef(0);
  const [products, setProducts] = useState<CoreProduct[]>([]);
  const [productId, setProductId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const reload = useCallback(async () => {
    const run = ++generation.current;
    if (!user || !connectedToolsEnabled()) return;
    setLoading(true);
    try {
      const result = await db.from('ct_products').select('id,name,timezone').eq('user_id', user.id).order('created_at');
      if (result.error) throw result.error;
      if (run !== generation.current) return;
      setProducts(result.data ?? []);
      if (tool && artifactId) {
        const link = await db.from('ct_product_artifacts').select('product_id').eq('user_id', user.id).eq('tool', tool).eq('artifact_id', artifactId).maybeSingle();
        if (link.error) throw link.error;
        if (run !== generation.current) return;
        setProductId(link.data?.product_id ?? '');
      } else {
        const saved = localStorage.getItem(`ct-product:${user.id}`);
        setProductId((result.data ?? []).some((p: CoreProduct) => p.id === saved) ? saved! : '');
      }
      setError('');
    } catch { if(run === generation.current) setError('Product data could not be loaded. Retry after the connected-data release is available.'); }
    finally { if(run === generation.current) setLoading(false); }
  }, [user?.id, tool, artifactId]);
  useEffect(() => { setProducts([]); setProductId(''); void reload(); return () => { generation.current++; }; }, [reload]);
  const select = async (id: string) => {
    if(user && !id && !(tool && artifactId)) { localStorage.removeItem(`ct-product:${user.id}`); setProductId(''); return; }
    if (!user || !products.some(product => product.id === id)) throw new Error('Choose one of your products.');
    if (tool && artifactId) {
      const result = await db.rpc('ct_link_product_artifact', { p_product_id: id, p_tool: tool, p_artifact_id: artifactId });
      if (result.error) throw result.error;
    }
    localStorage.setItem(`ct-product:${user.id}`, id); setProductId(id);
  };
  const create = async (name: string) => {
    if (!user || !name.trim()) throw new Error('Enter a product name.');
    const result = await db.from('ct_products').insert({ user_id: user.id, name: name.trim(), timezone: 'UTC' }).select('id').single();
    if (result.error) throw result.error;
    await reload(); return result.data.id as string;
  };
  return { products, productId, product: products.find(p => p.id === productId), error, loading, select, create, reload };
}

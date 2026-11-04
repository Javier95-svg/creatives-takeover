import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const INVESTOR_UPDATES_V1 = 'INVESTOR_UPDATES_V1';

export function useInvestorUpdatesAccess(){
  const {user}=useAuth();
  return useQuery({queryKey:[INVESTOR_UPDATES_V1,'access',user?.id],enabled:Boolean(user),queryFn:async()=>{
    // Generated database types intentionally lag the not-yet-deployed migration.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {data,error}=await (supabase as any).rpc('can_use_investor_updates_v1',{p_user_id:user!.id});if(error)return false;return data===true;
  },staleTime:300000});
}

export function useCurrentInvestorUpdateStatus(){
  const {user}=useAuth(); const now=new Date(); const month=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  return useQuery({queryKey:[INVESTOR_UPDATES_V1,'status',user?.id,month],enabled:Boolean(user),queryFn:async()=>{
    // Generated database types intentionally lag the not-yet-deployed migration.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {data,error}=await (supabase as any).from('investor_updates').select('status,shared_at').eq('user_id',user!.id).eq('period_start',month).order('revision',{ascending:false}).limit(1).maybeSingle();if(error)return null;return data as {status:string;shared_at:string|null}|null;
  },staleTime:60000});
}

// Managed application database only. Browser roles never confirm orders or entitlements.
export const COMMERCE_SCHEMA_V1=String.raw`
BEGIN;
CREATE TABLE IF NOT EXISTS public.ct_store_settings(app_id uuid PRIMARY KEY REFERENCES public.ct_app_config ON DELETE CASCADE,currency text NOT NULL CHECK(currency ~ '^[a-z]{3}$'),shipping_countries text[] NOT NULL DEFAULT '{}',shipping_cents integer NOT NULL DEFAULT 0 CHECK(shipping_cents>=0));
CREATE TABLE IF NOT EXISTS public.ct_catalogue(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),app_id uuid NOT NULL REFERENCES public.ct_app_config ON DELETE CASCADE,title text NOT NULL CHECK(length(title) BETWEEN 1 AND 200),price_cents integer NOT NULL CHECK(price_cents>0),stock integer NOT NULL CHECK(stock>=0),active boolean NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS public.ct_orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),app_id uuid NOT NULL REFERENCES public.ct_app_config ON DELETE CASCADE,request_key uuid NOT NULL,cart jsonb NOT NULL,status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','pending','paid','expired','refunded','review')),currency text NOT NULL,shipping_cents integer NOT NULL,total_cents bigint NOT NULL,refunded_cents bigint NOT NULL DEFAULT 0,checkout_id text UNIQUE,payment_intent text UNIQUE,expires_at timestamptz NOT NULL DEFAULT now()+interval '30 minutes',shipping_status text NOT NULL DEFAULT 'unfulfilled' CHECK(shipping_status IN ('unfulfilled','processing','shipped','delivered')),created_at timestamptz DEFAULT now(),UNIQUE(app_id,request_key));
CREATE TABLE IF NOT EXISTS public.ct_payment_events(id text PRIMARY KEY,app_id uuid NOT NULL REFERENCES public.ct_app_config ON DELETE CASCADE,created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.ct_billing_customers(app_id uuid REFERENCES public.ct_app_config ON DELETE CASCADE,user_id uuid REFERENCES auth.users ON DELETE CASCADE,customer_id text NOT NULL UNIQUE,PRIMARY KEY(app_id,user_id));
CREATE TABLE IF NOT EXISTS public.ct_subscriptions(app_id uuid REFERENCES public.ct_app_config ON DELETE CASCADE,user_id uuid REFERENCES auth.users ON DELETE CASCADE,subscription_id text NOT NULL UNIQUE,status text NOT NULL,period_end timestamptz NOT NULL,price_id text NOT NULL,updated_at timestamptz DEFAULT now(),PRIMARY KEY(app_id,user_id));
ALTER TABLE public.ct_store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ct_store_settings,public.ct_catalogue,public.ct_orders,public.ct_payment_events,public.ct_billing_customers,public.ct_subscriptions FROM anon,authenticated;
GRANT SELECT ON public.ct_store_settings,public.ct_catalogue TO anon,authenticated;
GRANT SELECT ON public.ct_orders,public.ct_subscriptions TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.ct_catalogue TO authenticated;
GRANT UPDATE(shipping_status) ON public.ct_orders TO authenticated;
GRANT ALL ON public.ct_store_settings,public.ct_catalogue,public.ct_orders,public.ct_payment_events,public.ct_billing_customers,public.ct_subscriptions TO service_role;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ct_catalogue') THEN
 CREATE POLICY settings_read ON public.ct_store_settings FOR SELECT USING(true);
 CREATE POLICY catalogue_read ON public.ct_catalogue FOR SELECT USING(active OR ct_app_role(app_id)='owner');
 CREATE POLICY catalogue_owner ON public.ct_catalogue FOR ALL USING(ct_app_role(app_id)='owner') WITH CHECK(ct_app_role(app_id)='owner' AND ct_has_module(app_id,'commerce'));
 CREATE POLICY orders_owner ON public.ct_orders FOR SELECT USING(ct_app_role(app_id)='owner');
 CREATE POLICY order_shipping ON public.ct_orders FOR UPDATE USING(ct_app_role(app_id)='owner' AND status IN ('paid','refunded')) WITH CHECK(ct_app_role(app_id)='owner' AND status IN ('paid','refunded'));
 CREATE POLICY subscriptions_read ON public.ct_subscriptions FOR SELECT USING(user_id=auth.uid());
 END IF; END $$;
CREATE OR REPLACE FUNCTION public.ct_reserve_order(p_app uuid,p_key uuid,p_items jsonb) RETURNS public.ct_orders LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE settings ct_store_settings; item jsonb; product ct_catalogue; order_row ct_orders; cart jsonb:='[]'; total bigint:=0; quantity int;
BEGIN
 IF NOT coalesce(ct_has_module(p_app,'commerce'),false) THEN RAISE EXCEPTION 'Commerce unavailable'; END IF;
 -- App settings serialize admission/retries, then stock locks use a fixed order.
 SELECT * INTO settings FROM ct_store_settings WHERE app_id=p_app FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Store configuration is incomplete'; END IF;
 SELECT * INTO order_row FROM ct_orders WHERE app_id=p_app AND request_key=p_key;
 IF FOUND THEN
  IF (SELECT jsonb_agg(jsonb_build_object('id',v->>'id','quantity',(v->>'quantity')::int) ORDER BY v->>'id') FROM jsonb_array_elements(order_row.cart) v) IS DISTINCT FROM (SELECT jsonb_agg(jsonb_build_object('id',v->>'id','quantity',(v->>'quantity')::int) ORDER BY v->>'id') FROM jsonb_array_elements(p_items) v) THEN RAISE EXCEPTION 'Checkout request changed. Use a new request identifier'; END IF;
  RETURN order_row;
 END IF;
 IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Invalid cart'; END IF;
 IF (SELECT count(DISTINCT v->>'id') FROM jsonb_array_elements(p_items) v)<>jsonb_array_length(p_items) THEN RAISE EXCEPTION 'Duplicate cart product'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY value->>'id' LOOP
  IF (item->>'quantity') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
  quantity:=(item->>'quantity')::int;
  IF quantity IS NULL OR quantity NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
  SELECT * INTO product FROM ct_catalogue WHERE id=(item->>'id')::uuid AND app_id=p_app AND active FOR UPDATE;
  IF NOT FOUND OR product.stock<quantity THEN RAISE EXCEPTION 'Insufficient inventory'; END IF;
  UPDATE ct_catalogue SET stock=stock-quantity WHERE id=product.id;
  total:=total+product.price_cents::bigint*quantity;
  cart:=cart||jsonb_build_array(jsonb_build_object('id',product.id,'title',product.title,'quantity',quantity,'price_cents',product.price_cents));
 END LOOP;
 INSERT INTO ct_orders(app_id,request_key,cart,currency,shipping_cents,total_cents) VALUES(p_app,p_key,cart,settings.currency,settings.shipping_cents,total+settings.shipping_cents) RETURNING * INTO order_row;
 RETURN order_row;
END $$;
CREATE OR REPLACE FUNCTION public.ct_reconcile_order(p_app uuid,p_order uuid,p_event text,p_state text,p_checkout text,p_intent text,p_refunded bigint DEFAULT 0) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE order_row ct_orders; item jsonb;
BEGIN
 SELECT * INTO order_row FROM ct_orders WHERE id=p_order AND app_id=p_app FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF EXISTS(SELECT 1 FROM ct_payment_events WHERE id=p_event) THEN RETURN; END IF;
 IF order_row.checkout_id IS NOT NULL AND order_row.checkout_id IS DISTINCT FROM p_checkout THEN RAISE EXCEPTION 'Checkout identity mismatch'; END IF;
 IF p_state NOT IN ('pending','paid','expired','refunded') THEN RAISE EXCEPTION 'Invalid payment state'; END IF;
 IF p_refunded<0 OR p_refunded>order_row.total_cents THEN RAISE EXCEPTION 'Invalid refund amount'; END IF;
 IF p_state='expired' AND order_row.status IN ('reserved','pending') THEN
  FOR item IN SELECT value FROM jsonb_array_elements(order_row.cart) ORDER BY value->>'id' LOOP
   UPDATE ct_catalogue SET stock=stock+(item->>'quantity')::int WHERE id=(item->>'id')::uuid AND app_id=p_app;
  END LOOP;
  UPDATE ct_orders SET status='expired' WHERE id=p_order;
 ELSIF p_state IN ('paid','refunded') AND order_row.status='expired' THEN
  -- Never silently fulfill a delayed payment after released stock was sold.
  UPDATE ct_orders SET status='review' WHERE id=p_order;
 ELSIF p_state='paid' AND order_row.status IN ('reserved','pending') THEN
  UPDATE ct_orders SET status='paid' WHERE id=p_order;
 ELSIF p_state='pending' AND order_row.status='reserved' THEN
  UPDATE ct_orders SET status='pending' WHERE id=p_order;
 ELSIF p_state='refunded' AND order_row.status IN ('paid','refunded') THEN
  UPDATE ct_orders SET refunded_cents=greatest(refunded_cents,p_refunded),status=CASE WHEN p_refunded>=total_cents THEN 'refunded' ELSE status END WHERE id=p_order;
 END IF;
 UPDATE ct_orders SET checkout_id=coalesce(checkout_id,p_checkout),payment_intent=coalesce(payment_intent,p_intent) WHERE id=p_order;
 INSERT INTO ct_payment_events(id,app_id) VALUES(p_event,p_app);
END $$;
CREATE OR REPLACE FUNCTION public.ct_paid_access(p_app uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT NOT coalesce(ct_has_module(p_app,'billing'),false) OR EXISTS(SELECT 1 FROM ct_subscriptions WHERE app_id=p_app AND user_id=auth.uid() AND status IN ('active','trialing') AND period_end>now()) OR ct_app_role(p_app)='owner'
$$;
-- Restrictive policies combine with every normal ownership policy.
DROP POLICY IF EXISTS paid_records ON public.ct_app_records;
CREATE POLICY paid_records ON public.ct_app_records AS RESTRICTIVE FOR ALL TO authenticated USING(ct_paid_access(app_id)) WITH CHECK(ct_paid_access(app_id));
REVOKE ALL ON FUNCTION public.ct_reserve_order(uuid,uuid,jsonb),public.ct_reconcile_order(uuid,uuid,text,text,text,text,bigint),public.ct_paid_access(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ct_reserve_order(uuid,uuid,jsonb),public.ct_reconcile_order(uuid,uuid,text,text,text,text,bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.ct_paid_access(uuid) TO authenticated;
COMMIT;
`;

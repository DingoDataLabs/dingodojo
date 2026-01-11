import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHAMPION_PRODUCT_ID = "prod_TluTU8gJXMXj3A";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ subscribed: false, tier: "explorer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;

    // Check for active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    // Also check for trialing subscriptions
    const trialingSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: "trialing",
      limit: 1,
    });

    const activeSub = subscriptions.data[0] || trialingSubs.data[0];
    
    if (activeSub) {
      const productId = activeSub.items.data[0]?.price?.product;
      const isChampion = productId === CHAMPION_PRODUCT_ID;
      
      // Update profile with stripe_customer_id and tier
      const { data: profileData } = await supabaseClient
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData) {
        await supabaseClient
          .from("profiles")
          .update({
            subscription_tier: isChampion ? "champion" : "explorer",
            stripe_customer_id: customerId,
          })
          .eq("id", profileData.id);
      }

      return new Response(JSON.stringify({
        subscribed: true,
        tier: isChampion ? "champion" : "explorer",
        subscriptionEnd: new Date(activeSub.current_period_end * 1000).toISOString(),
        status: activeSub.status,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // No active subscription - ensure profile is set to explorer
    const { data: profileData } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileData) {
      await supabaseClient
        .from("profiles")
        .update({ 
          subscription_tier: "explorer",
          stripe_customer_id: customerId,
        })
        .eq("id", profileData.id);
    }

    return new Response(JSON.stringify({ subscribed: false, tier: "explorer" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[CHECK-SUBSCRIPTION] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

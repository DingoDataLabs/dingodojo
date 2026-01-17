import { useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

// Initialize Stripe with the publishable key
const stripePromise = loadStripe("pk_live_51So8bsK84hi74TCsOqBFGLu3RYsAJKBv19BUGBwjBM4SJp1qHLAIqxfRFQn53FNYG4gSuYAMnGWYMd5pKpjslR2k00dMDqE0Xo");

interface StripeCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function StripeCheckoutModal({ open, onOpenChange, onSuccess }: StripeCheckoutModalProps) {
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    const promoCode = sessionStorage.getItem("dingo_promo_code") || "";
    
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { promoCode, embedded: true },
    });

    if (error) {
      setError("Failed to initialize checkout. Please try again.");
      throw error;
    }

    if (!data?.clientSecret) {
      setError("Failed to initialize checkout. Please try again.");
      throw new Error("No client secret returned");
    }

    return data.clientSecret;
  }, []);

  const handleComplete = useCallback(() => {
    onOpenChange(false);
    onSuccess?.();
  }, [onOpenChange, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">Upgrade to Champion</DialogTitle>
        {error ? (
          <div className="p-6 text-center">
            <p className="text-destructive">{error}</p>
          </div>
        ) : (
          <div id="checkout" className="min-h-[400px]">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                fetchClientSecret,
                onComplete: handleComplete,
              }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { loadStripe, Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null>;

/**
 * Carga la instancia de Stripe de forma lazy.
 * Utiliza la clave pública configurada en las variables de entorno.
 */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.warn("Stripe publishable key not found. Payment features will be disabled.");
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

/**
 * Configuración de planes para Stripe Checkout.
 * Estos IDs deben coincidir con los productos/precios creados en el Dashboard de Stripe.
 */
export const STRIPE_PLANS = {
  plan50: {
    priceId: "price_album_50",
    name: "Plan 50",
    price: 200,
    currency: "mxn",
  },
  plan200: {
    priceId: "price_album_200",
    name: "Plan 200",
    price: 500,
    currency: "mxn",
  },
  ilimitado: {
    priceId: "price_album_unlimited",
    name: "Plan Ilimitado",
    price: 2000,
    currency: "mxn",
  },
} as const;

export type PlanKey = keyof typeof STRIPE_PLANS;

/**
 * Redirige al usuario a Stripe Checkout.
 * 
 * @param planKey - La clave del plan (plan50, plan200, ilimitado)
 * 
 * Uso:
 * ```tsx
 * const handleCheckout = async () => {
 *   await redirectToCheckout('plan200');
 * };
 * ```
 */
export const redirectToCheckout = async (
  planKey: PlanKey
): Promise<void> => {
  const stripe = await getStripe();
  
  if (!stripe) {
    console.error("Stripe not initialized");
    return;
  }

  const plan = STRIPE_PLANS[planKey];
  
  // En producción, esta llamada debería ir a una API Route que cree la sesión
  // Por ahora, esto es solo una preparación de la estructura
  console.log("Redirecting to checkout for plan:", plan);
  
  // Ejemplo de integración futura:
  // const response = await fetch('/api/checkout', {
  //   method: 'POST',
  //   body: JSON.stringify({ priceId: plan.priceId }),
  // });
  // const { sessionId } = await response.json();
  // await stripe.redirectToCheckout({ sessionId });
};

/**
 * Hook placeholder para gestionar el estado del checkout.
 * Implementar cuando se integre completamente con Stripe.
 */
export interface CheckoutState {
  isLoading: boolean;
  error: string | null;
}

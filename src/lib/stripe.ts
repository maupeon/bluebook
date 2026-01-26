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
  basico: {
    priceId: "price_basic_99",
    name: "Básico",
    price: 99,
    currency: "eur",
  },
  premium: {
    priceId: "price_premium_199",
    name: "Premium",
    price: 199,
    currency: "eur",
  },
  deluxe: {
    priceId: "price_deluxe_349",
    name: "Deluxe",
    price: 349,
    currency: "eur",
  },
} as const;

export type PlanKey = keyof typeof STRIPE_PLANS;

/**
 * Redirige al usuario a Stripe Checkout.
 * 
 * @param planKey - La clave del plan (basico, premium, deluxe)
 * @param successUrl - URL de redirección tras pago exitoso
 * @param cancelUrl - URL de redirección si el usuario cancela
 * 
 * Uso:
 * ```tsx
 * const handleCheckout = async () => {
 *   await redirectToCheckout('premium', '/success', '/precios');
 * };
 * ```
 */
export const redirectToCheckout = async (
  planKey: PlanKey,
  _successUrl: string = "/success",
  _cancelUrl: string = "/precios"
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

// ── Customer-facing Stripe payment errors ────────────────────────────────────
// Turns Stripe's error/decline codes and PaymentIntent statuses into clear,
// actionable messages so a buyer knows exactly what went wrong and how to fix it.
// Used at checkout to block completion (and ticket issuance) on any failed payment.

export type StripeErrorLike = {
  type?: string;
  code?: string;
  decline_code?: string;
  message?: string;
};

// Bank decline reasons (Stripe `decline_code`).
const DECLINE_MESSAGES: Record<string, string> = {
  insufficient_funds: "Your card has insufficient funds. Please use a different card or payment method.",
  card_declined: "Your card was declined. Please use a different card or contact your bank.",
  generic_decline: "Your card was declined. Please use a different card or contact your bank.",
  do_not_honor: "Your bank declined this charge. Please contact your bank or try another card.",
  call_issuer: "Your bank declined this charge. Please contact your bank or try another card.",
  fraudulent: "This payment couldn't be processed. Please contact your bank or use a different card.",
  lost_card: "This card was reported lost and can't be used. Please use a different card.",
  stolen_card: "This card was reported stolen and can't be used. Please use a different card.",
  pickup_card: "This card can't be used. Please contact your bank or use a different card.",
  expired_card: "Your card has expired. Please use a different card.",
  incorrect_cvc: "The security code (CVC) is incorrect. Please re-enter it and try again.",
  invalid_cvc: "The security code (CVC) is invalid. Please check it and try again.",
  incorrect_number: "The card number is incorrect. Please check it and try again.",
  invalid_number: "The card number is invalid. Please check it and try again.",
  incorrect_zip: "The billing ZIP code doesn't match your card. Please check it and try again.",
  invalid_expiry_month: "The card's expiration month is invalid. Please check it and try again.",
  invalid_expiry_year: "The card's expiration year is invalid. Please check it and try again.",
  processing_error: "There was an error processing your card. Please try again in a moment.",
  authentication_required: "Your bank requires authentication for this payment. Please try again and complete the verification.",
  card_not_supported: "This card isn't supported for this purchase. Please use a different card.",
  currency_not_supported: "This card doesn't support USD payments. Please use a different card.",
  withdrawal_count_limit_exceeded: "You've exceeded your card's transaction limit. Please try a different card.",
  try_again_later: "Your bank couldn't approve this payment right now. Please try again in a few minutes.",
};

// Field/validation errors (Stripe `code`).
const CODE_MESSAGES: Record<string, string> = {
  expired_card: DECLINE_MESSAGES.expired_card,
  incorrect_cvc: DECLINE_MESSAGES.incorrect_cvc,
  invalid_cvc: DECLINE_MESSAGES.invalid_cvc,
  incorrect_number: DECLINE_MESSAGES.incorrect_number,
  invalid_number: DECLINE_MESSAGES.invalid_number,
  incomplete_number: "Your card number is incomplete. Please finish entering it.",
  incomplete_cvc: "Your card's security code is incomplete. Please finish entering it.",
  incomplete_expiry: "Your card's expiration date is incomplete. Please finish entering it.",
  invalid_expiry_month: DECLINE_MESSAGES.invalid_expiry_month,
  invalid_expiry_year: DECLINE_MESSAGES.invalid_expiry_year,
  card_declined: DECLINE_MESSAGES.card_declined,
  processing_error: DECLINE_MESSAGES.processing_error,
  payment_intent_authentication_failure:
    "We couldn't authenticate this payment with your bank. Please try again or use a different card.",
};

// One clear message for any Stripe error object.
export function friendlyStripeError(err?: StripeErrorLike | null): string {
  if (!err) return "Your payment couldn't be completed. No charge was made — please try again.";
  if (err.decline_code && DECLINE_MESSAGES[err.decline_code]) return DECLINE_MESSAGES[err.decline_code];
  if (err.code && CODE_MESSAGES[err.code]) return CODE_MESSAGES[err.code];
  // Stripe guarantees card_error / validation_error messages are safe to show.
  if ((err.type === "card_error" || err.type === "validation_error") && err.message) return err.message;
  // API/connection/internal errors: keep it generic and reassuring (no internals).
  return "Your payment couldn't be completed. No charge was made — please check your details or try a different payment method.";
}

// Inspect a confirmed PaymentIntent. Returns null when the payment is good
// (succeeded = card cleared, processing = ACH initiated/ticket reserved), or a
// customer-facing error message for every failure/incomplete state — so the
// caller can block completion and never issue tickets on a bad payment.
export function paymentIntentError(
  pi?: { status?: string; last_payment_error?: StripeErrorLike | null } | null,
): string | null {
  if (!pi || !pi.status) return "We couldn't confirm your payment. No charge was made — please try again.";
  switch (pi.status) {
    case "succeeded":
    case "processing":
      return null;
    case "requires_payment_method":
      // The submitted method failed/was declined; PI is reusable for a retry.
      return pi.last_payment_error
        ? friendlyStripeError(pi.last_payment_error)
        : "Your payment was declined. Please use a different card or payment method.";
    case "requires_action":
    case "requires_confirmation":
      return "Your bank needs additional verification to approve this payment. Please try again and complete any authentication prompts.";
    case "canceled":
      return "This payment was canceled before it completed. Please start the payment again.";
    default:
      return "We couldn't confirm your payment. No charge was made — please try again.";
  }
}

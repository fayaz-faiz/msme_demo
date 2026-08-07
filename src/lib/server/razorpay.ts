function getRazorpayKeyId() {
  return process.env.NEXT_PUBLIC_RAZORPAY_API_KEY || "";
}

export function getRazorpayPublicKey() {
  const keyId = getRazorpayKeyId();
  if (!keyId) {
    throw new Error("Razorpay public key is missing.");
  }
  return keyId;
}

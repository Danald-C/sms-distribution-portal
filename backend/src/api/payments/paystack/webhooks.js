router.post('/payments/paystack/create', async (req, res) => {
  const { amount = 5000 } = req.body; // amount in kobo for NGN or cents for other currencies depending on Paystack config
  // Create transaction via Paystack API and return authorization_url
  // POST https://api.paystack.co/transaction/initialize

  // Example response: { authorization_url: 'https://paystack.com/...' }
  res.json({ authorization_url: 'https://paystack.com/demo' });
});

// Webhook: /api/payments/paystack/webhook — verify signature, update user balance
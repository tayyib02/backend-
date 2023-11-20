const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const payment = async () => {
  try {
    // Create a charge for $350.
    const charge = await stripe.charges.create({
      amount: 11,
      currency: "USD",
    });

    // Create a transfer for $150 to our other Stripe connected account.
    const transfer_1 = await stripe.transfers.create({
      amount: 5,
      currency: "USD",
      source_transaction: charge.id,
      destination: "acct_1NiiOxQav3b3hYxz",
    });

    console.log("Transfers created!");
  } catch (error) {
    console.error(error);
  }
};

payment();

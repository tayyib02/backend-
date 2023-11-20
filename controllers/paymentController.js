const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.payment = async (req, res) => {
  // const YOUR_DOMAIN = "http://localhost:5173";
  const productPrice = req.body.totalCost - 26; // Example product price
  const ownerAmount = Math.round(productPrice * 0.12 * 100); // 12% for owner
  const sellerAmount = Math.round(productPrice * 0.88 * 100) + 26; // 88% for seller
  const final_items = req.body.services.map((item) => {
    return {
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.name,
          images: item.images,
          description: item.description,
          metadata: {
            id: item._id,
          },
        },
        unit_amount: item.price * 100,
      },
      quantity: 1,
    };
  });

  const line_items = [
    ...final_items,
    {
      price_data: {
        currency: "gbp",
        product_data: {
          name: "Booking fee",
        },
        unit_amount: 26 * 100,
      },
      quantity: 1,
    },
  ];

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items,
    payment_intent_data: {
      // application_fee_amount: ownerAmount, // Owner's fee
      transfer_data: {
        destination: "acct_1NiiOxQav3b3hYxz", // Seller's Stripe account ID
        amount: sellerAmount,
      },
    },
    mode: "payment",
    success_url: `${process.env.CLIENT_URL}/`,
    cancel_url: `${process.env.CLIENT_URL}`,
  });

  res.send({ url: session.url });
  // res.redirect(303, session.url);
};

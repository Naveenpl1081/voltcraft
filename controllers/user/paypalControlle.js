
const paypal = require('paypal-rest-sdk')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema'); 
const Cart = require('../../models/cartSchema');
const Coupon=require('../../models/couponSchema')

const createPayPalPayment = async (req, res) => {
  try {
    console.log("Request received for PayPal payment");

    const { cartItems, selectedAddressId, couponCode } = req.body;
    console.log(couponCode)

    if (!cartItems || !selectedAddressId || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: "Invalid input data" });
    }

    let totalAmount = cartItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
    let discount = 0;

    if (couponCode) {
      const coupon = await Coupon.findOne({ couponCode, isActive: true });
      if (!coupon) {
        return res.status(400).json({ error: "Invalid or expired coupon code" });
      }

      if (totalAmount < coupon.minimumPrice) {
        return res.status(400).json({ error: `Minimum purchase amount of $${coupon.minimumPrice} is required` });
      }

      discount = coupon.offerType === "percentage"
        ? (coupon.offerValue / 100) * totalAmount
        : coupon.offerValue;

      totalAmount = Math.max(totalAmount - discount, 0);
      req.session.appliedCoupon = coupon._id; // Save coupon ID in session
    }

    req.session.cartItems = cartItems;
    req.session.selectedAddressId = selectedAddressId;

    const create_payment_json = {
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: {
        return_url: "http://localhost:3001/paypalSuccess",
        cancel_url: "http://localhost:3001/paypalCancel",
      },
      transactions: [
        {
          amount: {
            currency: "USD",
            total: totalAmount.toFixed(2),
          },
          description: "Order payment",
        },
      ],
    };

    const createPayment = () =>
      new Promise((resolve, reject) => {
        paypal.payment.create(create_payment_json, (error, payment) => {
          if (error) {
            reject(error);
          } else {
            resolve(payment);
          }
        });
      });

    const payment = await createPayment();
    const approvalUrl = payment.links.find((link) => link.rel === "approval_url").href;

    res.status(200).json({ approvalUrl });
  } catch (error) {
    console.error("Error creating PayPal payment:", error.message);
    res.status(500).json({ error: "Something went wrong while creating PayPal payment" });
  }
};


  
const paypalSuccess = async (req, res) => {
  try {
    const { paymentId, PayerID } = req.query;

    if (!paymentId || !PayerID) {
      return res.status(400).send("Missing paymentId or PayerID");
    }

    const execute_payment_json = {
      payer_id: PayerID,
    };

    paypal.payment.execute(paymentId, execute_payment_json, async (error, payment) => {
      if (error) {
        console.error("Error executing PayPal payment:", error.response);
        return res.status(500).send("Error executing PayPal payment");
      }

      const cartItems = req.session.cartItems;
      const selectedAddressId = req.session.selectedAddressId;
      const userId = req.session.userId;
      const appliedCoupon = req.session.appliedCoupon;

      if (!cartItems || !selectedAddressId) {
        return res.status(400).send("Missing cart items or address details in session");
      }

      const address = await Address.findById({ _id: selectedAddressId });
      if (!address) {
        return res.status(404).json({ error: "Address not found" });
      }

      const totalAmount = payment.transactions[0].amount.total;

      const newOrder = new Order({
        userId,
        deliveryAddress: address,
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        totalAmount,
        paymentMethod: "paypal",
        orderStatus: "Ordered",
        couponApplied: appliedCoupon || null,
        createdAt: new Date(),
      });

      const savedOrder = await newOrder.save();
      console.log("Order saved to database:", savedOrder);

      if (appliedCoupon) {
        await Coupon.findByIdAndUpdate(appliedCoupon, { $inc: { couponUsed: 1 } });
      }

      await Cart.deleteMany({ userId });
      req.session.cartItems = null;
      req.session.selectedAddressId = null;
      req.session.appliedCoupon = null;

      res.redirect("/orderSuccess");
    });
  } catch (error) {
    console.error("Error in PayPal Success:", error.message);
    res.status(500).send("Something went wrong during PayPal payment success handling");
  }
};



  
  module.exports = {
    paypalSuccess,
    createPayPalPayment
  }

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
    totalAmount=totalAmount+(18/100)*totalAmount+100

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



const createPayPalPayments = async (req, res) => {
  try {
    console.log("Request received for PayPal payment");

    // Retrieve the orderId from the request body
    const { orderId } = req.body;
    console.log("orderId:",orderId);
    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    // Fetch the order details from the database
    const order = await Order.findById(orderId) // Assuming `cartItems` is an array of objects with product references
    console.log("order",order)
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const totalAmount = order.totalAmount;

    console.log('totalAmount:',totalAmount);

    // Extract necessary details from the order schema
    // const { cartItems, selectedAddressId, couponCode, totalAmount: orderTotalAmount } = order;



    // Check if cartItems exist and are valid
    // if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    //   return res.status(400).json({ error: "Invalid cart items" });
    // }

    // let totalAmount = cartItems.reduce((acc, item) => acc + item.quantity * item.product.price, 0); // Adjusted to use the product price from the cartItems
    // let discount = 0;

    // Apply taxes and shipping charges (if applicable)
    // totalAmount = totalAmount + (18 / 100) * totalAmount + 100; // Example tax and shipping fee

    // Apply coupon if provided
    // if (couponCode) {
    //   const coupon = await Coupon.findOne({ couponCode, isActive: true });
    //   if (!coupon) {
    //     return res.status(400).json({ error: "Invalid or expired coupon code" });
    //   }

    //   if (totalAmount < coupon.minimumPrice) {
    //     return res.status(400).json({ error: `Minimum purchase amount of $${coupon.minimumPrice} is required` });
    //   }

    //   discount = coupon.offerType === "percentage"
    //     ? (coupon.offerValue / 100) * totalAmount
    //     : coupon.offerValue;

    //   totalAmount = Math.max(totalAmount - discount, 0);
    //   req.session.appliedCoupon = coupon._id; // Save coupon ID in session
    // }

    // Save order details in session (optional)
    req.session.cartItems = order.items;
    req.session.selectedAddressId = order.selectedAddressId;
    req.session.orderId = orderId

    // Create the PayPal payment JSON request
    const create_payment_json = {
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: {
        return_url: "http://localhost:3001/paypalSuccesss",
        cancel_url: "http://localhost:3001/paypalCancel",
      },
      transactions: [
        {
          amount: {
            currency: "USD",  // You can adjust the currency based on your needs
            total: totalAmount.toFixed(2),
          },
          description: `Payment for Order #${orderId}`,
        },
      ],
    };

    // Create PayPal payment using the PayPal SDK
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
    console.log("reach")

    // Return the PayPal approval URL to the client
    res.status(200).json({ approvalUrl });
  } catch (error) {
    console.error("Error creating PayPal payment:", error.message);
    res.status(500).json({ error: "Something went wrong while creating PayPal payment" });
  }
};


  
const paypalSuccess = async (req, res) => {
  try {
    console.log("entering the paypal success controller")
    const { paymentId, PayerID } = req.query;
    console.log("paymentID:",paymentId);
    console.log("payerID:",PayerID);

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
      console.log("cartItems:",req.session.cartItems);
      const selectedAddressId = req.session.selectedAddressId;
      console.log("selectedAddressId :",req.session.selectedAddressId );
      const userId = req.session.userId;
      const appliedCoupon = req.session.appliedCoupon;

      if (!cartItems || !selectedAddressId) {
        return res.status(400).send("Missing cart items or address details in session");
      }

      const address = await Address.findById({ _id: selectedAddressId });
      if (!address) {
        return res.status(404).json({ error: "Address not found" });
      }

   
      let totalAmount = payment.transactions[0].amount.total;
      // let totalWithGST = Number(totalAmount) * (18 / 100) + Number(totalAmount);
      // totalWithGST = totalWithGST.toFixed(2);

      

       
      // console.log(".,.,.,.,",totalAmount)

      const newOrder = new Order({
        userId,
        deliveryAddress: address,
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        totalAmount: totalAmount,
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


const paypalSuccesss = async (req, res) => {
  try {
    console.log("entering the paypal successs controller")
    const { paymentId, PayerID } = req.query;
    console.log("paymentID:",paymentId);
    console.log("payerID:",PayerID);

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
      console.log("cartItems:",cartItems);


      // const selectedAddressId = req.session.selectedAddressId;
      // console.log("selectedAddressId :",req.session.selectedAddressId );
      // const userId = req.session.userId;
      // const appliedCoupon = req.session.appliedCoupon;

      // if (!cartItems || !selectedAddressId) {
      //   return res.status(400).send("Missing cart items or address details in session");
      // }

      // const address = await Address.findById({ _id: selectedAddressId });
      // if (!address) {
      //   return res.status(404).json({ error: "Address not found" });
      // }

   
      // let totalAmount = payment.transactions[0].amount.total;
      // let totalWithGST = Number(totalAmount) * (18 / 100) + Number(totalAmount);
      // totalWithGST = totalWithGST.toFixed(2);

      

       
      // console.log(".,.,.,.,",totalAmount)

      // const newOrder = new Order({
      //   userId,
      //   deliveryAddress: address,
      //   items: cartItems.map((item) => ({
      //     productId: item.productId,
      //     quantity: item.quantity,
      //     price: item.price,
      //   })),
      //   totalAmount: totalAmount,
      //   paymentMethod: "paypal",
      //   orderStatus: "Ordered",
      //   couponApplied: appliedCoupon || null,
      //   createdAt: new Date(),
      // });

      // const savedOrder = await newOrder.save();
      // console.log("Order saved to database:", savedOrder);

      // if (appliedCoupon) {
      //   await Coupon.findByIdAndUpdate(appliedCoupon, { $inc: { couponUsed: 1 } });
      // }

      const userId = req.session.userId;
      const orderId = req.session.orderId;
      const order = await Order.findOne({
        _id: orderId,
      });
      
      console.log("order:",order);

      if (!order) {
        return { error: "Order not found or status is not 'payment-Retry'" };
      }
  
      // Update the payment status to "success"

      order.orderStatus = "Ordered"; // You can change this to "success" if you prefer
  
      let savedOrder =  await order.save();
      
      console.log("saved Order:",savedOrder);
  

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



const paypalCancel = async (req, res) => {
  try {
    console.log("PayPal payment was canceled by the user.");

    const { cartItems, selectedAddressId } = req.session;

    if (!cartItems || !selectedAddressId) {
      return res.status(400).send("Missing cart items or address details in session");
    }

    const address = await Address.findById({ _id: selectedAddressId });
    if (!address) {
      return res.status(404).json({ error: "Address not found" });
    }

    const userId = req.session.userId;
    const appliedCoupon = req.session.appliedCoupon;

    let totalAmount = cartItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
    totalAmount = totalAmount + (18 / 100) * totalAmount + 100; // Including GST and shipping fee

    const newOrder = new Order({
      userId,
      deliveryAddress: address,
      items: cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount: totalAmount,
      paymentMethod: "paypal", // Even if canceled, it's still considered a PayPal order
      orderStatus: "payment-Retry", // Mark the order status as canceled
      couponApplied: appliedCoupon || null,
      createdAt: new Date(),
    });

    const savedOrder = await newOrder.save();
    console.log("Order saved to database even after cancellation:", savedOrder);

    if (appliedCoupon) {
      await Coupon.findByIdAndUpdate(appliedCoupon, { $inc: { couponUsed: 1 } });
    }

    // Clear session data related to the payment
    req.session.cartItems = null;
    req.session.selectedAddressId = null;
    req.session.appliedCoupon = null;

    // Redirect to the cancellation page
    res.redirect("/myorder");
  } catch (error) {
    console.error("Error handling PayPal cancellation:", error.message);
    res.status(500).send("Something went wrong while handling PayPal cancellation");
  }
};


const  orderCancelled=async (req,res)=>{
  try {
    res.render("oderCancelled")
  } catch (error) {
    
  }
}
  
  module.exports = {
    paypalSuccess,
    createPayPalPayment,
    paypalCancel,
    orderCancelled,
    createPayPalPayments,
    paypalSuccesss
  }
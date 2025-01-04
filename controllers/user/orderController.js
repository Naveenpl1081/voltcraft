
const Order = require('../../models/orderSchema'); 
const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');
const Address = require('../../models/addressSchema')
const Product = require('../../models/productSchema');
const Coupon=require('../../models/couponSchema')
const Wallet=require('../../models/walletSchema')
const CancelOrder=require('../../models/cancelSchema')
const { findById } = require('../../models/orderSchema');
 

const placeOrder = async (req, res) => {
  try {
    console.log("Place Order API called with body:", req.body);

    const { selectedAddressId, paymentMethod, cartItems, couponCode } = req.body;
    console.log("cou",couponCode)

   
    if (!selectedAddressId || !paymentMethod || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: "Invalid input data" });
    }

   
    const address = await Address.findById({ _id: selectedAddressId });
    if (!address) {
      return res.status(404).json({ error: "Address not found" });
    }

    
    const validPaymentMethods = ["cod", "paypal"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    
    let totalAmount = cartItems.reduce((acc, item) => {
      if (!item.productId || isNaN(item.quantity) || isNaN(item.price)) {
        throw new Error("Invalid cart item data");
      }
      return acc + item.quantity * item.price;
    }, 0);

    let discount = 0;
    let couponDetails = null;

   
    if (couponCode) {
      const coupon = await Coupon.findOne({ couponCode, isActive: true });
      if (!coupon) {
        return res.status(400).json({ error: "Invalid or expired coupon code" });
      }

      

      
      if (coupon.usageLimit && coupon.couponUsed >= coupon.usageLimit) {
        return res.status(400).json({ error: "Coupon usage limit reached" });
      }

      const user = await User.findById(req.session.userId);
      if (user.couponUsed.includes(coupon._id)) {
          return res.status(400).json({ error: "You have already used this coupon" });
      }


      
      if (totalAmount < coupon.minimumPrice) {
        return res.status(400).json({
          error: `Minimum purchase amount of $${coupon.minimumPrice} is required`,
        });
      }

      
      if (coupon.offerType === "percentage") {
        discount = (coupon.offerValue / 100) * totalAmount;
      } else if (coupon.offerType === "flat") {
        discount = coupon.offerValue;
      }

      
      coupon.couponUsed += 1;
      await coupon.save();

      
      totalAmount = Math.max(totalAmount - discount, 0);

      couponDetails = {
        couponId: coupon._id,
        couponCode: coupon.couponCode,
        discount,
      };
      user.couponUsed.push(coupon._id);
      await user.save();
     
    }

   
    const newOrder = new Order({
      userId: req.session.userId, 
      deliveryAddress: address,
      items: cartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount,
      paymentMethod,
      orderStatus: "Ordered", 
      createdAt: new Date(),
      couponApplied: couponDetails ? couponDetails.couponId : null,
    });

    console.log("New Order Object: ", newOrder);

    
    const savedOrder = await newOrder.save();
    console.log("Order saved to database: ", savedOrder);

    
    for (const item of cartItems) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: item.productId },
        { $inc: { quantity: -item.quantity } }, 
        { new: true } 
      );

      
      if (updatedProduct.quantity === 0) {
        await Product.findByIdAndUpdate(item.productId, { status: "Out of Stock" });
      }
    }
    

    
    await Cart.deleteMany({ userId: req.session.userId });

    
    res.status(201).json({
      message: "Order placed successfully",
      order: savedOrder,
      discount,
      couponDetails,
    });
  } catch (error) {
    console.error("Error in placeOrder:", error.message);
    res.status(500).json({ error: "Something went wrong while placing the order" });
  }
};



const getAddressById = async (addressId) => {
 
  const userAddress = [
    {
      _id: '12345',
      name: 'John Doe',
      streetAddress: '123 Main St',
      addressType: 'Home',
      city: 'Cityville',
      apartment: 'Apt 101',
      landMark: 'Near Park',
      postalCode: 123456,
      phone: '9876543210',
    },
  ];
  return userAddress.find(address => address._id === addressId) || null;
};


const validateAndApplyCoupon = async (couponId, totalAmount) => {
  
  const mockCoupon = { id: couponId, discount: 50 }; 
  return mockCoupon.discount || 0;
};

const orderSuccess = async (req, res) => {
  try {
    
    res.render("orderSuccess", { message: "Your order was placed successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error showing order success page." });
  }
};


const orderDetails = async (req, res) => {
  try {
    
    const userId = req.session.userId;
    const orderId = req.params.orderId;

    console.log("User ID:", userId);
    console.log("Order ID:", orderId);

    
    const order = await Order.findOne({ _id: orderId, userId: userId }).populate('items.productId');

    console.log(order)

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    
    res.render("orderDetails", { order }); 
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ message: "An error occurred while fetching the order details." });
  }
};

const myOrder = async (req, res) => {
  try {
    const userId = req.session.userId;
    console.log("User ID: ", userId);

    const page = parseInt(req.query.page) || 1; 
    const limit = parseInt(req.query.limit) || 5; 
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments({ userId }); 
    const orders = await Order.find({ userId })
      .populate('items.productId', 'name') 
      .sort({ createdAt: -1 }) // Sort orders by createdAt in descending order
      .skip(skip)
      .limit(limit);

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found" });
    }

    const totalPages = Math.ceil(totalOrders / limit);

    res.render("myOrder", {
      order: orders,
      userId,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching orders" });
  }
};





const addressConfirm = async (req, res) => {
  try {
      const userId = req.session.userId; 
      if (!userId) return res.status(401).send('User not authenticated.');

      const { name, number, addressone, addresstwo, city, state, email, country } = req.body;


      const newAddress = new Address({
          fullName: name,
          phone: number,
          addressLine1: addressone,
          addressLine2: addresstwo,
          city: city,
          state: state,
          email: email,
          country: country,
          userId,
      });

      console.log("...",newAddress)

      await newAddress.save();
      return res.redirect('/confirmOrder');
  } catch (error) {
      console.error('Error saving address:', error);
      res.status(500).send('Something went wrong.');
  }
};


const applyCoupon = async (req, res, next) => {
  try {
      const { couponCode } = req.body;
      const userId = req.session.userId;

      
      const cart = await Cart.findOne({ userId }).populate('items.productId');
      if (!cart || cart.items.length === 0) {
          return res.status(400).json({ message: 'Your cart is empty' });
      }

      

    
      const coupon = await Coupon.findOne({ couponCode: couponCode, isDeleted: false });
      if (!coupon) {
          return res.status(400).json({ message: 'Invalid or expired coupon code' });
      }

      // Check if user has already used this coupon
      // const user = await User.findById(userId);
      // if (user.couponUsed.includes(coupon._id)) {
      //     return res.status(400).json({ message: 'You have already used this coupon' });
      // }

      const user = await User.findById(userId);
      if (user.couponUsed.includes(coupon._id)) {
          return res.status(400).json({ message: 'You have already used this coupon' });
      }
      

      
      if (coupon.usageLimit && coupon.couponUsed >= coupon.usageLimit) {
          return res.status(400).json({ message: 'Coupon usage limit reached' });
      }

      
      let cartTotal = 0;
      cart.items.forEach(item => {
          cartTotal += item.totalPrice;
      });

      
      if (cartTotal < coupon.minimumPrice) {
          return res.status(400).json({ message: `Minimum purchase amount of $${coupon.minimumPrice} is required` });
      }

      
      let discount = 0;
      if (coupon.offerType === 'percentage') {
          discount = (coupon.offerValue / 100) * cartTotal;
      } else if (coupon.offerType === 'flat') {
          discount = coupon.offerValue;
      }

      const discountedTotal = Math.max(cartTotal - discount, 0); 

     
      coupon.couponUsed += 1;
      await coupon.save();

      // Add coupon ID to user's used coupons list
      // user.couponUsed.push(coupon._id);
      // await user.save();

      
      return res.status(200).json({
          message: 'Coupon applied successfully',
          discount,
          discountedTotal
      });

  } catch (error) {
      console.error(error.message);
      next(error);
      return res.status(500).json({ message: 'Internal server error' });
  }
};

const handleOrderModification = async (req, res, action) => {
  try {
    const { orderId } = req.params;
    const { canceledItems, reason } = req.body;
    const userId = req.session.userId;

    // Fetch the order and populate necessary fields
    const order = await Order.findOne({ _id: orderId, userId: userId })
      .populate('items.productId')
      .populate({
        path: 'cancelOrder',
        populate: {
          path: 'canceledItems.productId'
        }
      });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Ensure the order is eligible for the action
    if (action === 'cancel' && order.orderStatus === 'Cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    if (action === 'return' && order.orderStatus !== 'Delivered') {
      return res.status(400).json({ message: 'Only delivered orders can be returned' });
    }

    // Calculate the total refund amount and update order items
    let totalRefund = 0;
    const updatedItems = [];

    for (const canceledItem of canceledItems) {
      const orderItem = order.items.find(
        (item) => item.productId._id.toString() === canceledItem.productId
      );

      if (!orderItem) {
        return res.status(400).json({ message: 'Invalid product in the request' });
      }

      if (canceledItem.quantity > orderItem.quantity) {
        return res.status(400).json({
          message: `Cannot ${action} more than the available quantity for product: ${orderItem.productId.name}`,
        });
      }

      // Update item quantity and calculate refund for the item
      orderItem.quantity -= canceledItem.quantity;
      const itemRefund = canceledItem.quantity * orderItem.price;
      updatedItems.push({
        productId: orderItem.productId._id,
        quantity: canceledItem.quantity,
        price: orderItem.price,
      });

      totalRefund += itemRefund;
    }

    // Adjust refund amount if a coupon was applied
    if (order.couponApplied) {
      const coupon = await Coupon.findById(order.couponApplied);
      if (coupon) {
        const discount = coupon.offerType === 'percentage'
          ? (coupon.offerValue / 100) * totalRefund
          : Math.min(coupon.offerValue, totalRefund);

        totalRefund -= discount;
        totalRefund = Math.max(totalRefund, 0); // Ensure refund is not negative
      }
    }

    // Save the canceled or returned items in the CancelOrder schema
    const cancelOrder = new CancelOrder({
      orderId: order._id,
      userId,
      canceledItems: updatedItems,
      totalRefund,
      reason: reason || '',
      action,
      paymentMethod: order.paymentMethod, // Include payment method
    });

    console.log("Saving CancelOrder:", cancelOrder);

    await cancelOrder.save(); // Save the CancelOrder instance

    // Update the order to reference the cancelOrder
    order.cancelOrder = cancelOrder._id;
    order.orderStatus = action === 'cancel' ? 'Cancelled' : 'Pending';
    await order.save();

    const updatedOrder = await Order.findById(orderId)
      .populate('items.productId')
      .populate({
        path: 'cancelOrder',
        populate: {
          path: 'canceledItems.productId'
        }
      });

    console.log("Updated Order:", updatedOrder);

    res.render("orderDetails", {
      order: updatedOrder,
      message: `Order successfully ${action}ed`,
    });

  } catch (error) {
    console.error(`Error processing ${action}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};





const cancelOrder = (req, res) => {
  handleOrderModification(req, res, 'cancel');
};

const returnOrder = (req, res) => {
  handleOrderModification(req, res, 'return');
};



module.exports = {
  placeOrder,
  orderSuccess,
  orderDetails,
  myOrder,
  addressConfirm,
  applyCoupon,
  cancelOrder,
  returnOrder
};


const Order = require('../../models/orderSchema'); 
const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');
const Address = require('../../models/addressSchema')
const Product = require('../../models/productSchema');
const Coupon=require('../../models/couponSchema')
const Wallet=require('../../models/walletSchema')
const CancelOrder=require('../../models/cancelSchema')
const PDFDocument = require('pdfkit');
const fs = require('fs');
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

    
    const validPaymentMethods = ["cod", "paypal",'wallet'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    
    let totalAmount = cartItems.reduce((acc, item) => {
      if (!item.productId || isNaN(item.quantity) || isNaN(item.price)) {
        throw new Error("Invalid cart item data");
      }
      return acc + item.quantity * item.price;
    }, 0);
    totalAmount=totalAmount*(18/100)+totalAmount+100
    console.log("naveen.",totalAmount)

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
      console.log("discount am",discount)

      
      coupon.couponUsed += 1;
      await coupon.save();
      console.log("first",totalAmount)

      
      totalAmount = Math.max(totalAmount - discount, 0);
      console.log("poiuytre",totalAmount)
      
      

      couponDetails = {
        couponId: coupon._id,
        couponCode: coupon.couponCode,
        discount,
      };
      user.couponUsed.push(coupon._id);
      await user.save();
     
    }


    if (paymentMethod === "wallet") {
      const wallet = await Wallet.findOne({ userId: req.session.userId });
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }

      if (wallet.balance < totalAmount) {
        return res.status(400).json({ error: "Insufficient wallet balance" });
      }

      // Deduct wallet balance
      wallet.balance -= totalAmount;
      wallet.transactions.push({
        amount: totalAmount,
        type: 'debit',
        description: 'Order Payment',
      });
      await wallet.save();
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
    const userId = req.session.userId; // Ensure `userId` is available in the session
    console.log("User ID: ", userId);

    const page = parseInt(req.query.page) || 1; // Current page number
    const limit = parseInt(req.query.limit) || 5; // Orders per page
    const skip = (page - 1) * limit;

    // Count total orders for pagination
    const totalOrders = await Order.countDocuments({ userId });

    // Fetch paginated orders for the user
    let orders = await Order.find({ userId })
      .populate('items.productId', 'name') // Populate product details
      .sort({ createdAt: -1 }) // Sort by most recent orders
      .skip(skip)
      .limit(limit);

    // Handle case where no orders are found
    if (!orders || orders.length === 0) {
      return res.render("myOrder", {
        order: [],
        userId,
        currentPage: page,
        totalPages: 0,
        message: "No orders found",
      });
    }

    // Calculate total pages for pagination
    const totalPages = Math.ceil(totalOrders / limit);

    // Render the orders page
    res.render("myOrder", {
      order: orders,
      userId,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Error fetching orders" });
  }
};





const addressConfirm = async (req, res) => {
  try {
    
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ errors: ['Please login to continue.'] });
    }

    
    const { name, number, addressone, addresstwo, city, state, email, country } = req.body;

    
    const errors = [];
    
    
    if (!name?.trim()) errors.push('Name is required.');
    if (!number?.trim()) errors.push('Phone number is required.');
    if (!addressone?.trim()) errors.push('Street address is required.');
    if (!city?.trim()) errors.push('City is required.');
    if (!state?.trim()) errors.push('State is required.');
    if (!email?.trim()) errors.push('Email is required.');
    if (!country?.trim()) errors.push('Country is required.');

    
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    
    const newAddress = new Address({
      userId,
      fullName: name.trim(),
      phone: number.trim(),
      addressLine1: addressone.trim(),
      addressLine2: addresstwo?.trim() || '',
      city: city.trim(),
      state: state.trim(),
      email: email.trim().toLowerCase(),
      country: country.trim(),
      createdAt: new Date()
    });

   
    await newAddress.save();

   
    return res.status(200).json({ 
      message: 'Address saved successfully',
      redirect: '/confirmOrder'
    });

  } catch (error) {
    console.error('Error saving address:', error);
    return res.status(500).json({ 
      errors: ['Failed to save address. Please try again.'] 
    });
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
      cartTotal=cartTotal*(18/100)+cartTotal+100

      
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

    
    if (action === 'cancel' && order.orderStatus === 'Cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    if (action === 'return' && order.orderStatus !== 'Delivered') {
      return res.status(400).json({ message: 'Only delivered orders can be returned' });
    }

    
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

      
      orderItem.quantity -= canceledItem.quantity;
      const itemRefund = canceledItem.quantity * orderItem.price;
      updatedItems.push({
        productId: orderItem.productId._id,
        quantity: canceledItem.quantity,
        price: orderItem.price,
      });

      totalRefund += itemRefund;
    }
    totalRefund=totalRefund+totalRefund*(18/100)
    console.log(".,.,.,..,.,..,..,.",totalRefund)

    
    if (order.couponApplied) {
      const coupon = await Coupon.findById(order.couponApplied);
      if (coupon) {
        const discount = coupon.offerType === 'percentage'
          ? (coupon.offerValue / 100) * totalRefund
          : Math.min(coupon.offerValue, totalRefund);

        totalRefund -= discount;
        totalRefund = Math.max(totalRefund, 0); 
      }
    }

    
    const cancelOrder = new CancelOrder({
      orderId: order._id,
      userId,
      canceledItems: updatedItems,
      totalRefund,
      reason: reason || '',
      action,
      paymentMethod: order.paymentMethod, 
    });

    console.log("Saving CancelOrder:", cancelOrder);

    await cancelOrder.save(); 

   
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

const getAllAvailableCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({
      isActive: true,
      isDeleted: false,
      expiredOn: { $gte: new Date() },
    });

    res.status(200).json({
      success: true,
      message: 'Available coupons fetched successfully.',
      coupons,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching available coupons.',
      error: error.message,
    });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId)
      .populate('items.productId', 'productName')
      .populate('couponApplied')
      .lean();
    
    if (!order) {
      return res.status(404).send('Order not found');
    }

    if (order.orderStatus !== 'Delivered') {
      return res.status(400).send('Invoice can only be downloaded for delivered orders.');
    }

    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      bufferPages: true
    });

    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 100;
    const leftMargin = 50;
    const rightMargin = pageWidth - 50;
    const rightColumnStart = pageWidth / 2 + 20;

    const fileName = `voltcraft-invoice-${orderId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    doc.pipe(res);

    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const gstRate = 18;
    const gstAmount = (gstRate / 100) * subtotal;
    const total=subtotal+gstAmount+100;
    const shippingAmount = 100; // Add shipping amount
    let discountAmount = 0;
    let discountText = "No Coupon Applied";
    
    if (order.couponApplied) {
      if (order.couponApplied.offerType === 'percentage') {
        discountAmount = (order.couponApplied.offerValue / 100) * total;
        discountText = `${order.couponApplied.offerValue}% Off (${order.couponApplied.couponCode})`;
      } else {
        discountAmount = order.couponApplied.offerValue;
        discountText = `₹${discountAmount} Off (${order.couponApplied.couponCode})`;
      }
    }

    // Header Section (Unchanged)
    doc
      .rect(0, 0, pageWidth, 160)
      .fill('#1a237e');

    doc
      .fontSize(32)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text('VOLT CRAFT', leftMargin, 50)
      .fontSize(13)
      .font('Helvetica')
      .text('Your Electronics Destination', leftMargin, 90)
      .text('www.voltcraft.com | support@voltcraft.com', leftMargin, 110);

    doc
      .rect(rightMargin - 190, 40, 170, 100)
      .fill('#303f9f');

    doc
      .fillColor('#ffffff')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('INVOICE', rightMargin - 170, 55)
      .fontSize(11)
      .font('Helvetica')
      .text(`Invoice No: ${orderId}`, rightMargin - 170, 100)
      .text(`Date: ${new Date(order.orderDate).toLocaleDateString()}`, rightMargin - 170, 150);

    // Address Section (Unchanged)
    doc.y = 190;
    const addressY = doc.y;

    doc
      .fillColor('#000000')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('BILL TO', leftMargin, addressY)
      .moveDown(0.5)
      .fontSize(11)
      .font('Helvetica');

    const billingDetails = [
      order.deliveryAddress.fullName,
      order.deliveryAddress.email,
      order.deliveryAddress.phone,
      order.deliveryAddress.addressLine1,
      `${order.deliveryAddress.city}, ${order.deliveryAddress.state}`,
      order.deliveryAddress.country
    ];

    billingDetails.forEach(detail => {
      doc.text(detail, leftMargin, doc.y + 3);
      doc.moveDown(0.5);
    });

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('SHIP TO', rightColumnStart, addressY)
      .moveDown(0.5)
      .fontSize(11)
      .font('Helvetica');

    const shippingDetails = [
      order.deliveryAddress.fullName,
      order.deliveryAddress.addressLine1,
      `${order.deliveryAddress.city}, ${order.deliveryAddress.state}`,
      order.deliveryAddress.country
    ];

    shippingDetails.forEach(detail => {
      doc.text(detail, rightColumnStart, doc.y + 3);
      doc.moveDown(0.5);
    });

    // Items Section (Unchanged)
    doc.y += 20;
    const itemStart = doc.y;
    const columnPositions = {
      item: leftMargin + 10,
      qty: pageWidth - 260,
      price: pageWidth - 180,
      total: pageWidth - 100
    };

    doc
      .rect(leftMargin, itemStart - 10, contentWidth, 30)
      .fill('#f5f5f5');

    doc
      .fillColor('#000000')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('ITEM', columnPositions.item, itemStart)
      .text('QTY', columnPositions.qty, itemStart, { width: 50, align: 'right' })
      .text('PRICE', columnPositions.price, itemStart, { width: 70, align: 'right' })
      .text('TOTAL', columnPositions.total, itemStart, { width: 80, align: 'right' });

    let currentY = itemStart + 40;
    order.items.forEach((item, index) => {
      if (index % 2 === 0) {
        doc
          .rect(leftMargin, currentY - 10, contentWidth, 30)
          .fill('#fafafa');
      }

      doc
        .fillColor('#000000')
        .fontSize(10)
        .font('Helvetica')
        .text(item.productId.productName, columnPositions.item, currentY, { width: 250 })
        .text(item.quantity.toString(), columnPositions.qty, currentY, { width: 50, align: 'right' })
        .text(`₹${item.price.toFixed(2)}`, columnPositions.price, currentY, { width: 70, align: 'right' })
        .text(`₹${(item.price * item.quantity).toFixed(2)}`, columnPositions.total, currentY, { width: 80, align: 'right' });

      currentY += 40;
    });

    // Summary Section
    currentY += 20;
    const summaryWidth = 250;
    const summaryX = rightMargin - summaryWidth;

    doc
      .rect(summaryX, currentY, summaryWidth, 200) // Adjusted height for shipping
      .fill('#f8f9fa');

    const summaryStartY = currentY + 15;
    const summaryLeftX = summaryX + 20;
    const summaryRightX = rightMargin - 20;

    doc
      .fillColor('#000000')
      .fontSize(11)
      .font('Helvetica');

    doc
      .text('Subtotal:', summaryLeftX, summaryStartY)
      .text(`₹${subtotal.toFixed(2)}`, summaryRightX - 80, summaryStartY, { width: 80, align: 'right' });

    doc
      .text('Discount:', summaryLeftX, summaryStartY + 25)
      .text(`₹${discountAmount.toFixed(2)}`, summaryRightX - 80, summaryStartY + 25, { width: 80, align: 'right' })
      .fontSize(9)
      .text(discountText, summaryLeftX, summaryStartY + 45, { width: 210 });

    doc
      .fontSize(11)
      .text(`GST (${gstRate}%):`, summaryLeftX, summaryStartY + 70)
      .text(`₹${gstAmount.toFixed(2)}`, summaryRightX - 80, summaryStartY + 70, { width: 80, align: 'right' });

    // Shipping Amount
    doc
      .text('Shipping:', summaryLeftX, summaryStartY + 95)
      .text(`₹${shippingAmount.toFixed(2)}`, summaryRightX - 80, summaryStartY + 95, { width: 80, align: 'right' });

    doc
      .rect(summaryX, summaryStartY + 120, summaryWidth, 65)
      .fill('#1a237e');

    doc
      .fillColor('#ffffff')
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('TOTAL AMOUNT:', summaryLeftX, summaryStartY + 140)
      .fontSize(16)
      .text(
        `₹${(subtotal - discountAmount + gstAmount + shippingAmount).toFixed(2)}`,
        summaryRightX - 100,
        summaryStartY + 140,
        { width: 100, align: 'right' }
      );

    doc
      .rect(0, doc.page.height - 40, pageWidth, 40)
      .fill('#f5f5f5');

    doc
      .fillColor('#666666')
      .fontSize(9)
      .font('Helvetica')
      .text(
        'Volt Craft Electronics Pvt. Ltd. | GST: XXXXXXXXXXXX | support@voltcraft.com | +91 XXXXXXXXXX',
        0,
        doc.page.height - 25,
        { align: 'center' }
      );

    doc.end();
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).send('Unable to generate invoice');
  }
};


module.exports = {
  placeOrder,
  orderSuccess,
  orderDetails,
  myOrder,
  addressConfirm,
  applyCoupon,
  cancelOrder,
  returnOrder,
  getAllAvailableCoupons,
  downloadInvoice
};

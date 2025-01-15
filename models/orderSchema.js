const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deliveryAddress: {
    fullName: {
      type: String,
      required: true,
  },
  phone: {
      type: String,
      required: true,
  },
  addressLine1: {
      type: String,
      required: true,
  },
  addressLine2: {
      type: String,
  },
  city: {
      type: String,
      required: true,
  },
  state: {
      type: String,
      required: true,
  },
  email: {
      type: String,
      required: true,
  },
  country: {
      type: String,
      required: true,
  }
  },
   
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }
  ],
  totalAmount: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ['Credit Card', 'Debit Card', 'paypal', 'cod','wallet'],
    required: true
  },
  orderStatus: {
    type: String,
    enum: ['Ordered', 'Shipped', 'Out For Delivery', 'Delivered', 'Cancelled','Returned','Pending','Approved','Failed','payment-Retry'],
    default: 'Ordered'
  },
  orderDate: { type: Date, default: Date.now },
  couponApplied: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },

cancelOrder: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'CancelOrder',
  default: null
}
}, { timestamps: true });

orderSchema.pre('find', function() {
  this.populate('cancelOrder');
});

orderSchema.pre('findOne', function() {
  this.populate('cancelOrder');
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;

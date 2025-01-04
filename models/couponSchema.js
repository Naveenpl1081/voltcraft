const mongoose = require('mongoose');

const couponSchema = mongoose.Schema({
  couponName: {
      type: String,
      required: true,
      unique: true
  },
  couponCode: {
      type: String,
      required: true,
      unique: true
  },
  offerType: {
      type: String,
      enum: ['percentage', 'flat'],
      required: true
  },
  offerValue: {
      type: Number,
      required: true
  },
  minimumPrice: {
      type: Number,
      required: true
  },
  createdOn: {
      type: Date,
      default: Date.now,
      required: true
  },
  expiredOn: {
      type: Date,
      required: true
  },
  isActive: {
      type: Boolean,
      default: true
  },
  usageLimit: {
      type: Number,
      default: null
  },
  usagePerUserLimit: {
      type: Number,
      default: 1
  },
  userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
  },
  couponUsed: {
      type: Number,
      default: 0
  },
  description:{
    type:String,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false // Default is not deleted
}
});
const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
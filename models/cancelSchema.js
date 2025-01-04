const mongoose = require('mongoose');

const cancelSchema = mongoose.Schema(
    {
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        canceledItems: [
            {
                productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
                quantity: { type: Number, required: true },
                price: { type: Number, required: true },
            },
        ],
        totalRefund: { type: Number, required: true },
        refundStatus: { type: String, default: '' }, 
        reason: { type: String, default: '' },
        action: { type: String, enum: ['cancel', 'return'], required: true },
        paymentMethod: { 
            type: String, 
            enum: ['Credit Card', 'Debit Card', 'paypal', 'cod'], 
            required: true,
            default: 'cod', // Set a default if applicable
        },
        cancelDate: { type: Date, default: Date.now },
        status: { 
            type: String, 
            enum: ['Pending', 'Approved', 'Rejected'], 
            default: 'Pending' 
        },
        

    },
    { timestamps: true }
);

const CancelOrder = mongoose.model('CancelOrder', cancelSchema);
module.exports = CancelOrder;

  

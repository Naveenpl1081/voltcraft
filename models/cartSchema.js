const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            name: { type: String, required: true },
            price: { type: Number, required: true },
            quantity: { type: Number, required: true },
            totalPrice: { type: Number, required: true }
        },
    ],
    totalPrice: { type: Number, default: 0 }  
});


cartSchema.methods.calculateTotalPrice = function () {
    let cartTotalPrice = 0;
console.log("hello")
    this.items.forEach(item => {
        // Calculate and update total price for each item
        item.totalPrice = item.price * item.quantity;

        // Add the item totalPrice to the cart's total price
        cartTotalPrice += item.totalPrice;
    });

    // Update the cart's total price
    this.totalPrice = cartTotalPrice;

};


cartSchema.pre('save', function(next) {
    this.calculateTotalPrice();  
    next();
});


cartSchema.methods.updateCart = function() {
    console.log("kj")
    this.calculateTotalPrice();
    return this.save();
    
};

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;

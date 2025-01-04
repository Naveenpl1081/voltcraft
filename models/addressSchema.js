const mongoose = require('mongoose');


const AddressSchema = new mongoose.Schema({
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
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    userId :{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isDeleted: {
        type: Boolean, 
        default: false 
       }
});


AddressSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});


const Address = mongoose.model('Address', AddressSchema);

module.exports = Address;

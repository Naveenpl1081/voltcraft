const mongoose = require("mongoose")
const {Schema}=mongoose;


const userSchema=new Schema({
    name:{
        type:String,
        requierd:true
    },
    email:{
        type:String,
        required:true,
    },
    couponUsed: [{ // Add this field to track used coupons
        type: Schema.Types.ObjectId,
        ref: "Coupon"
    }],
    
    phone:{
        type:String,
        required:false,
    },
    googleId:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
        required:false
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },cart:[{
        type:Schema.Types.ObjectId,
        ref:"cart",
    }],
    wallet:[{
        type:Schema.Types.ObjectId,
        ref:"wallet"
    }],
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"order"
    }],
    createdOn:{
        type:Date,
        default:Date.now
    },
    
    redeemed:{
        type:Boolean
    },
    referralCode: { 
        type: String, 
        unique: true 
    },
    redeemedUserse:[{
        type:Schema.Types.ObjectId,
        ref:"user"
    }],
    searchHistory:[{
        category:{
            type:Schema.Types.ObjectId,
            ref:"Category",
        },
        brand:{
            type:String
        },
        searchOn:{
            type:Date,
            default:Date.now
        }
        
    }],
    addresses: [{
        type: Schema.Types.ObjectId,
        ref: "Address"
    }]
})


const User=mongoose.model("User",userSchema)

module.exports=User




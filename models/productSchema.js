const mongoose=require("mongoose")
const{Schema}=mongoose



const productSchema = new Schema({
    productName: { 
        type: String,
        required: true 
    },
    description: { 
        type: String,  
    },
    category: { 
        type: Schema.Types.ObjectId, 
        ref: "Category", 
        required: true 
    },
    regularPrice: { 
        type: Number, 
        required: true 
    },
    salePrice: { 
        type: Number,
        required: true, 
        
    },
    quantity: { 
        type: Number, 
        required: true 
    },
    color: { 
        type: String, 
        required: true 
    },
    productImage: { 
        type: [String], 
        required: true },
    isBlocked: {
        type: Boolean,
        required: true,
        default: false
    },
    status: { 
        type: String, 
        enum: ["Available", "Out of Stock", "Discontinued"], default: "Available" },
}, { timestamps: true });



productSchema.pre("save", function (next) {
    if (this.quantity === 0) {
      this.status = "Out of Stock";
    } else if (this.quantity > 0) {
      this.status = "Available";
    }
  
    next();
  });
  
  
  productSchema.pre("findOneAndUpdate", function (next) {
    const update = this.getUpdate();
  
    if (update.quantity !== undefined) {
      if (update.quantity === 0) {
        update.status = "Out of Stock";
      } else if (update.quantity > 0) {
        update.status = "Available";
      }
    }
  
    next();
  });

const Product = mongoose.model("Product", productSchema);
module.exports = Product;

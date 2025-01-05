const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema')
const Product = require('../../models/productSchema');


const loadCart = async (req, res, next) => {
    try {
        console.log("Rendering the cart page");
        const userId = req.session.userId;

        console.log("User ID:", userId);

       
        let cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            select: 'productName salePrice productImage', 
        });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
            await cart.save();
            console.log("Created new empty cart:", cart);
        }

        console.log("Cart:", cart);
        return res.render('cartPage', { cart , userId});
    } catch (error) {
        console.error(error.message);
        next(error); 
    }
};


const updateQuantity = async (req, res) => {
  
    const { productId } = req.params;
    const { quantity } = req.body;

    try {
        // Fetch the product to check stock availability
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found', success: false });
        }

        // Check if the requested quantity exceeds available stock
        if (quantity > product.quantity) {
            return res.status(400).json({ 
                message: `Only ${product.quantity} item(s) available in stock.`,
                success: false 
            });
        }

        // Find the cart for the current user
        const cart = await Cart.findOne({ userId: req.session.userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found', success: false });
        }

        // Update the specific item's quantity and total price
        let itemUpdated = false;
        cart.items.forEach(item => {
            if (item.productId.equals(productId)) {
                item.quantity = quantity;
                item.totalPrice = item.price * quantity; // Update item-level total price
                itemUpdated = true;
            }
        });

        if (!itemUpdated) {
            return res.status(404).json({ message: 'Product not found in cart', success: false });
        }

        // Recalculate the total price for the entire cart
        cart.calculateTotalPrice();

        // Save the updated cart
        await cart.save();

        res.status(200).json({ 
            success: true,
            message: 'Quantity updated successfully.',
            cart 
        });

    } catch (error) {
        console.error("Error updating quantity:", error);
        res.status(500).json({ message: 'Server error', success: false });
    }
};

const addToCart = async (req, res) => {
    try {
        console.log("Add to Cart API Called");

        const { quantity } = req.body; // Quantity from the front-end input
        const { id } = req.params; // Product ID from the URL

        console.log("Quantity:", quantity);
        console.log("Product ID:", id);

        // Parse and validate quantity
        const parsedQuantity = parseInt(quantity, 10);
        if (!parsedQuantity || isNaN(parsedQuantity) || parsedQuantity <= 0) {
            return res.status(400).json({ message: "Invalid quantity" });
        }

        // Find the product
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        console.log("Product found:", product);

        // Find or create the user's cart
        let userCart = await Cart.findOne({ userId: req.session.userId });
        if (!userCart) {
            userCart = new Cart({ userId: req.session.userId, items: [], totalPrice: 0 });
        }

        // Check if the product already exists in the cart
        const existingProduct = userCart.items.find(
            item => item.productId.toString() === product._id.toString()
        );

        let updatedQuantity = parsedQuantity;

        if (existingProduct) {
            // Calculate the updated quantity
            updatedQuantity += existingProduct.quantity;

            // Check if the updated quantity exceeds available stock
            if (updatedQuantity > product.quantity) {
                return res.status(400).json({
                    message: `Cannot add more than available stock. Available: ${product.quantity}, Requested: ${updatedQuantity}`,
                });
            }

            // Update the quantity and total price for the existing product
            existingProduct.quantity = updatedQuantity;
            existingProduct.totalPrice = existingProduct.quantity * product.salePrice;
            console.log("Updated existing product in cart:", existingProduct);
        } else {
            // Check if the requested quantity exceeds available stock
            if (parsedQuantity > product.quantity) {
                return res.status(400).json({
                    message: `Cannot add more than available stock. Available: ${product.quantity}, Requested: ${parsedQuantity}`,
                });
            }

            // Add the new product to the cart
            userCart.items.push({
                productId: product._id,
                name: product.productName,
                price: product.salePrice,
                quantity: parsedQuantity,
                totalPrice: product.salePrice * parsedQuantity,
            });
            console.log("Added new product to cart");
        }

        // Recalculate the total cart price using the schema method
        await userCart.updateCart();

        console.log("Updated Cart with Total Price:", userCart);

        // Return a success response
        return res.status(200).json({ message: "Cart updated successfully", cart: userCart });
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



const addToCarts = async (req, res) => {
    try {
        console.log("Add to Cart API Calleddddddddddddd");

        
        const { quantity } = req.body;
        const { id } = req.params;
        

        
        const parsedQuantity = parseInt(quantity, 10);
        if (!parsedQuantity || isNaN(parsedQuantity) || parsedQuantity <= 0) {
            return res.status(400).json({ message: "Invalid quantity" });
        }

       
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        
        let userCart = await Cart.findOne({ userId: req.session.userId });
        if (!userCart) {
            userCart = new Cart({ userId: req.session.userId, items: [], totalPrice: 0 });
        }

       
        const existingProduct = userCart.items.find(
            item => item.productId.toString() === product._id.toString()
        );

        if (existingProduct) {
            return res.status(200).json({ message: "Product already in cart" });
        }

        
        userCart.items.push({
            productId: product._id,
            name: product.productName,
            price: product.salePrice,
            quantity: parsedQuantity,
            totalPrice: product.salePrice * parsedQuantity,
        });

        
        userCart.totalPrice = userCart.items.reduce(
            (sum, item) => sum + item.totalPrice,
            0
        );

        
        await userCart.save();
        console.log("Updated Cart with Total Price:", userCart);

        res.status(200).json({ message: "Item added to cart successfully" });
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



const updateQuantityy = async (req, res) => {
    const { productId } = req.params;
    const { quantity } = req.body; // The quantity to set in the cart
  
    try {
      // Find the product in the database
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found', success: false });
      }
  
      // Find the user's cart
      const cart = await Cart.findOne({ userId: req.session.userId });
      if (!cart) {
        return res.status(404).json({ message: 'Cart not found', success: false });
      }
  
      // Find the cart item for the product
      const cartItem = cart.items.find(item => item.productId.equals(productId));
      if (!cartItem) {
        return res.status(404).json({
          message: 'Product not found in the cart.',
          success: false,
        });
      }
  
      // Current quantity of the product in the cart
      const currentCartQuantity = cartItem.quantity;
  
      // Calculate the maximum quantity that can be added
      const maxAddableQuantity = product.quantity - currentCartQuantity;
  
      // Ensure the new quantity does not exceed the max addable quantity
      if (quantity > maxAddableQuantity) {
        return res.status(400).json({
          message: `Cannot increase quantity. Only ${maxAddableQuantity} item(s) can be added to the cart.`,
          success: false,
        });
      }
  
      // Ensure the quantity is not less than 1
      if (quantity < 1) {
        return res.status(400).json({
          message: 'Quantity cannot be less than 1.',
          success: false,
        });
      }
  
      // Update the cart item with the new quantity
      cartItem.quantity = quantity;
  
      // Save the cart
    //   await cart.save();
  
      // Send success response
      res.status(200).json({
        success: true,
        message: 'Quantity updated successfully.',
        updatedQuantity: cartItem.quantity,
      });
    } catch (error) {
      console.error('Error updating quantity:', error);
      res.status(500).json({ message: 'Server error', success: false });
    }
  };
  
  const getCartStock = async (req, res) => {
    try {
        const { productId } = req.params; // Extract productId from the request params
        const userId = req.session.userId; // Get the userId from the session

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Find the user's cart
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        // Find the specific product in the cart
        const cartItem = cart.items.find(item => item.productId.equals(productId));
        if (!cartItem) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found in the cart',
                cartQuantity: 0, // Return 0 if the product is not in the cart
            });
        }

        // Return the current quantity of the product in the cart
        res.status(200).json({
            success: true,
            cartQuantity: cartItem.quantity,
        });
    } catch (error) {
        console.error('Error fetching cart stock:', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

  
  
  
const confirmOrder = async (req, res) => {
    try {
        const userId = req.session.userId;

        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'User ID is required' 
            });
        }

        
        const userCart = await Cart.findOne({ userId })
            .populate('items.productId', 'productName productImage salePrice')
            .lean();

        if (!userCart || userCart.items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Your cart is empty. Please add items before proceeding.' 
            });
        }

        
        return res.json({ 
            success: true,
            redirectUrl: '/confirmOrder' 
        });

    } catch (error) {
        console.error('Error in confirmOrder controller:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error.message 
        });
    }
};

const removeCartItem = async (req, res) => {
    try {
        const { productId } = req.params;  
        const userId = req.session.userId;  

        console.log("..",productId)

        if (!userId) {
            return res.status(400).json({ message: 'User not logged in' });
        }

        
        const cart = await Cart.findOne({ userId: userId });

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        
        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

       
        cart.items.splice(itemIndex, 1);

        
        cart.calculateTotalPrice(); 

        
        await cart.save();

s
        console.log(cart+"======================================")

        
        return res.json({ removed: true, cart });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const renderConfirmOrderPage = async (req, res) => {
    try {
        const userId = req.session.userId; 

        const userCart = await Cart.findOne({ userId })
            .populate('items.productId', 'productName productImage salePrice')
            .lean();

        const userAddress = await Address.find({ userId }).lean();

        return res.render("confirmOrder", {
            cart: userCart,
            userAddress,
            title: "Confirm Order"
        });
    } catch (error) {
        console.error('Error rendering confirm order page:', error);
        return res.status(500).render('error', { 
            message: 'Unable to load confirm order page' 
        });
    }
};

module.exports={
    loadCart,
    addToCart,
    updateQuantityy,
    confirmOrder,
    addToCarts,
    removeCartItem,
    renderConfirmOrderPage,
    updateQuantity,
    getCartStock
}
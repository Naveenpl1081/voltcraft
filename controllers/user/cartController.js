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
        
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found', success: false });
        }

        
        if (quantity > product.quantity) {
            return res.status(400).json({ 
                message: `Only ${product.quantity} item(s) available in stock.`,
                success: false 
            });
        }

        
        const cart = await Cart.findOne({ userId: req.session.userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found', success: false });
        }

        
        let itemUpdated = false;
        cart.items.forEach(item => {
            if (item.productId.equals(productId)) {
                item.quantity = quantity;
                item.totalPrice = item.price * quantity; 
                itemUpdated = true;
            }
        });

        if (!itemUpdated) {
            return res.status(404).json({ message: 'Product not found in cart', success: false });
        }

       
        cart.calculateTotalPrice();

        
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

        const { quantity } = req.body; 
        const { id } = req.params; 

        console.log("Quantity:", quantity);
        console.log("Product ID:", id);

       
        const parsedQuantity = parseInt(quantity, 10);
        if (!parsedQuantity || isNaN(parsedQuantity) || parsedQuantity <= 0) {
            return res.status(400).json({ message: "Invalid quantity" });
        }

       
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        console.log("Product found:", product);

        
        let userCart = await Cart.findOne({ userId: req.session.userId });
        if (!userCart) {
            userCart = new Cart({ userId: req.session.userId, items: [], totalPrice: 0 });
        }

       
        const existingProduct = userCart.items.find(
            item => item.productId.toString() === product._id.toString()
        );

        let updatedQuantity = parsedQuantity;

        if (existingProduct) {
            
            updatedQuantity += existingProduct.quantity;

            
            if (updatedQuantity > product.quantity) {
                return res.status(400).json({
                    message: `Cannot add more than available stock. Available: ${product.quantity}, Requested: ${updatedQuantity}`,
                });
            }

            
            existingProduct.quantity = updatedQuantity;
            existingProduct.totalPrice = existingProduct.quantity * product.salePrice;
            console.log("Updated existing product in cart:", existingProduct);
        } else {
            
            if (parsedQuantity > product.quantity) {
                return res.status(400).json({
                    message: `Cannot add more than available stock. Available: ${product.quantity}, Requested: ${parsedQuantity}`,
                });
            }

            
            userCart.items.push({
                productId: product._id,
                name: product.productName,
                price: product.salePrice,
                quantity: parsedQuantity,
                totalPrice: product.salePrice * parsedQuantity,
            });
            console.log("Added new product to cart");
        }

        
        await userCart.updateCart();

        console.log("Updated Cart with Total Price:", userCart);

        
        return res.status(200).json({ message: "Cart updated successfully", cart: userCart });
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



const addToCarts = async (req, res) => {
    try {
        console.log("Add to Cart API Called");

        const { quantity } = req.body; 
        const { id } = req.params; 

        console.log("Quantity:", quantity);
        console.log("Product ID:", id);

       
        const parsedQuantity = parseInt(quantity, 10);
        if (!parsedQuantity || isNaN(parsedQuantity) || parsedQuantity <= 0) {
            return res.status(400).json({ message: "Invalid quantity. Please enter a valid number." });
        }

       
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found. It might have been removed or is unavailable." });
        }

        console.log("Product found:", product);

       
        let userCart = await Cart.findOne({ userId: req.session.userId });
        if (!userCart) {
            userCart = new Cart({ userId: req.session.userId, items: [], totalPrice: 0 });
        }

        
        const existingProduct = userCart.items.find(
            item => item.productId.toString() === product._id.toString()
        );

        let updatedQuantity = parsedQuantity;

        if (existingProduct) {
           
            updatedQuantity += existingProduct.quantity;

            
            if (updatedQuantity > product.quantity) {
                return res.status(400).json({
                    message: `Cannot add more than available stock. Available: ${product.quantity}, Requested: ${updatedQuantity}`,
                });
            }

            
            existingProduct.quantity = updatedQuantity;
            existingProduct.totalPrice = existingProduct.quantity * product.salePrice;
            console.log("Updated existing product in cart:", existingProduct);
        } else {
            
            if (parsedQuantity > product.quantity) {
                return res.status(400).json({
                    message: `Cannot add more than available stock. Available: ${product.quantity}, Requested: ${parsedQuantity}`,
                });
            }

            
            userCart.items.push({
                productId: product._id,
                name: product.productName,
                price: product.salePrice,
                quantity: parsedQuantity,
                totalPrice: product.salePrice * parsedQuantity,
            });
            console.log("Added new product to cart");
        }

        
        await userCart.updateCart();

        console.log("Updated Cart with Total Price:", userCart);

        
        return res.status(200).json({ message: "Cart updated successfully", cart: userCart });
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({ message: "Internal Server Error. Please try again later." });
    }
};



const updateQuantityy = async (req, res) => {
    const { productId } = req.params;
    const { quantity } = req.body; 
  
    try {
      
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found', success: false });
      }
  
      
      const cart = await Cart.findOne({ userId: req.session.userId });
      if (!cart) {
        return res.status(404).json({ message: 'Cart not found', success: false });
      }
  
      
      const cartItem = cart.items.find(item => item.productId.equals(productId));
      if (!cartItem) {
        return res.status(404).json({
          message: 'Product not found in the cart.',
          success: false,
        });
      }
  
      
      const currentCartQuantity = cartItem.quantity;
  
      
      const maxAddableQuantity = product.quantity - currentCartQuantity;
  
     
      if (quantity > maxAddableQuantity) {
        return res.status(400).json({
          message: `Cannot increase quantity. Only ${maxAddableQuantity} item(s) can be added to the cart.`,
          success: false,
        });
      }
  
      
      if (quantity < 1) {
        return res.status(400).json({
          message: 'Quantity cannot be less than 1.',
          success: false,
        });
      }
  
      
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
        const { productId } = req.params; 
        const userId = req.session.userId; 
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

       
        const cartItem = cart.items.find(item => item.productId.equals(productId));
        if (!cartItem) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found in the cart',
                cartQuantity: 0, 
            });
        }

        
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
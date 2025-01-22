const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema')
const Product = require('../../models/productSchema');
const Wishlist = require('../../models/wishlistSchema');


const wishlist = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        let wishlist = await Wishlist.findOne({ userId }) 
            .populate({
                path: 'products.productId', 
                select: 'productName salePrice productImage status', 
            });

        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [] }); 
            await wishlist.save(); // 
            console.log("Created new empty wishlist:", wishlist);
        }

        res.render('wishlistPage', { user: userId, wishlist: wishlist });

    } catch (error) {
        console.error('Error loading wishlist page:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.userId;

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [] });
        }

        const productExists = wishlist.products.some(item => item.productId.toString() === productId);
        if (productExists) {
            return res.status(409).json({ alreadyExists: true });
        }

        if (product.stock <= 0) {
            return res.status(400).json({ outOfStock: true });
        }

        wishlist.products.push({ productId });
        await wishlist.save();

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params; 
        const user = req.session.userId; 

        console.log("User:", user);
        console.log("Product ID to remove:", productId);

        
        const updatedWishlist = await Wishlist.findOneAndUpdate(
            { userId: user },
            { $pull: { products: { productId } } }, 
            { new: true }
        );

        if (updatedWishlist) {
            console.log(`Product with productId ${productId} removed from wishlist.`);
            res.status(200).json({ removed: true });
        } else {
            console.log(`Wishlist not found or product not in wishlist.`);
            res.status(404).json({ success: false, message: 'Product not found in wishlist.' });
        }
    } catch (error) {
        console.error('Error deleting product from wishlist:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports={
    wishlist,
    addToWishlist,
    removeFromWishlist
}
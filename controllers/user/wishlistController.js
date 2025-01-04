const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema')
const Product = require('../../models/productSchema');
const Wishlist = require('../../models/wishlistSchema');


const wishlist = async (req, res) => {
    try {
        const userId = req.session.userId;
        console.log("User ID:", userId);

       
        const wishlist = await Wishlist.findOne({ userId })
            .populate({
                path: 'products.productId', 
                select: 'productName salePrice productImage', 
            });
            const products=await Product.find()

        console.log('Wishlist:', wishlist,products);

        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found' });
        }

        res.render('wishlistPage', { user: userId, wishlist: wishlist });

    } catch (error) {
        console.error('Error loading wishlist page:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};




const addToWishlist = async (req, res) => {
    try {
        console.log('Adding to wishlist starts here');
        console.log(req.body);

        const { productId } = req.body;
        const userId = req.session.userId;

        console.log("//",userId)

        
        const wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            console.log('Wishlist not found for user');
            return res.status(404).json({ error: 'Wishlist not found' });
        }

        
        const existingWishlistItem = wishlist.products.find(item => item.productId.toString() === productId);
        console.log("existing", existingWishlistItem);
        if (existingWishlistItem) {
            console.log('Product already exists in the wishlist');
            return res.json({ alreadyExists: true });
        } else {
            const product = await Product.findById(productId);
            if (!product || product.quantity === 0) {
                console.log('Product is out of stock');
                return res.json({ outOfStock: true });
            }

            
            wishlist.products.push({ productId, addedAt: Date.now() });
            await wishlist.save();

            console.log('Product added to wishlist successfully');
            return res.json({ success: true });
        }
    } catch (error) {
        console.log('Error adding to wishlist:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
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
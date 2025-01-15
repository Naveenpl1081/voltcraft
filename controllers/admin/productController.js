const Product=require("../../models/productSchema")
const Category=require("../../models/categorySchema")
const User=require("../../models/userSchema")
const fs=require("fs");
const path=require("path");
const sharp=require("sharp");
const { ObjectId } = require("mongodb");
const mongoose = require('mongoose')




const getProductAddPage = async (req, res) => {
    try {
        const category = await Category.find({ isListed: true });
        res.render("addProduct", { cat: category });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).send("Internal Server Error");
    }
};




const addProduct = async (req, res) => {
    try {
        const details = req.body;
        const files = req.files;

        console.log("Incoming request body:", details, "Files:", files);

        // Check if at least 4 images are uploaded
        if (!files || files.length < 4) {
            return res.status(400).json({ success: false, message: 'Please upload at least 4 images.' });
        }

        // Validate price
        const price = parseFloat(details.price);
        if (isNaN(price) || price < 0) {
            return res.status(400).json({ success: false, message: 'Price must be a non-negative number.' });
        }

        // Validate sale price
        const sPrice = parseFloat(details.sPrice );
        if (isNaN(sPrice) || sPrice < 0) {
            return res.status(400).json({ success: false, message: 'Sale Price must be a non-negative number.' });
        }

        // Validate quantity
        const quantity = parseInt(details.quantity);
        if (isNaN(quantity) || quantity < 0) {
            return res.status(400).json({ success: false, message: 'Quantity must be a non-negative number.' });
        }

        // Validate category
        if (!details.categoryId) {
            return res.status(400).json({ success: false, message: 'Category is required.' });
        }

        // Map uploaded images
        const images = files.map(file => file.filename);

        // Create product object
        const product = new Product({
            productName: details.productName,
            description: details.description,
            brand: details.brand || "Unknown",
            category: details.categoryId,
            regularPrice: price,
            salePrice: sPrice,
            quantity,
            color: details.color,
            productImage: images,
            status: "Available"
        });

        // Save product to database
        const savedProduct = await product.save();
        res.status(200).json({ success: true, message: 'Product added successfully.', product: savedProduct });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};


const loadProduct = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 10; 
        const skip = (page - 1) * limit;

        const totalProducts = await Product.countDocuments(); 
        const products = await Product.find({})
            .populate('category')
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalProducts / limit);
        console.log("/////",products)

        res.render('allProduct', {
            products,
            currentPage: page,
            totalPages,
            limit,
        });
    } catch (error) {
        console.log('Error loading product page:', error);
        res.status(500).send('Internal Server Error');
    }
};





const loadEditProduct = async (req, res) => {
    try {
        console.log('product editing page loading');
        const id = req.query.id

        console.log(req.query)
        console.log("id", id);

        const proData = await Product.findById({ _id: id })
        console.log("product",proData)
        const categories = await Category.find()
        const selectedCategory = await Category.findById({ _id: proData.category })
        console.log("sele",selectedCategory)
        console.log("cattt",categories);

        console.log(proData);
        if (proData) {
            console.log('reached here');
            res.render('editProduct', { product: proData,  categories,selectedCategory })
        } else {
            res.redirect('/admin/allProduct')
        }
    } catch (error) {
        console.log('error editing product');
        console.log(error);
    }
}



const editProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const details = req.body;
        const files = req.files;

        const catId = new ObjectId(details.categoryId);

        
        const categoryExists = await Category.findById(catId);
        if (!categoryExists || categoryExists.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Category not found or has been deleted',
            });
        }

        const price = parseFloat(details.price);
        const sPrice = parseFloat(details.sPrice);
        const quantity = parseInt(details.quantity);

        const updateData = {
            productName: details.productName,
            regularPrice: price,
            salePrice: sPrice,
            color: details.color,
            quantity,
            description: details.description,
            category: catId, 
            visibility: details.visibility,
        };

        if (files && files.length > 0) {
            const newImages = files.map(file => file.filename);
            updateData.productImage = newImages;
        }

        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        const populatedProduct = await Product.findById(id).populate('category');

        res.json({
            success: true,
            message: 'Product updated successfully',
            product: populatedProduct,
            redirectUrl: '/admin/allProduct',
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while updating the product',
        });
    }
};



const toggleBlockUnblockProduct = async (req, res) => {
    try {
        const { productId } = req.params; 
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        
        product.isBlocked = !product.isBlocked;
        await product.save();

        res.json({ success: true, message: `Product ${product.is_blocked ? 'blocked' : 'unblocked'} successfully` });
    } catch (error) {
        console.error('Error toggling block/unblock:', error);
        res.status(500).json({ success: false, message: 'An error occurred while toggling the product status' });
    }
};




const deleteProduct = async (req, res) => {
    const productId = req.params.id;
    console.log("idddddd",productId);

    try {
        
        const result = await Product.findByIdAndUpdate({_id:productId}, { $set:{isBlocked: true} });
        console.log("resss",result);

        if (result) {
            return res.status(200).json({ success: true, message: 'product soft deleted successfully' });
        } else {
            return res.status(404).json({ success: false, error: 'product not found' });
        }
    } catch (error) {
        console.error('Error soft deleting product:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

const restoreProduct = async (req, res) => {
    const productId = req.params.id;


    try {
        const result = await Product.findByIdAndUpdate({_id:productId}, {$set:{isBlocked: false} });

        if (result) {
            return res.status(200).json({ success: true, message: "product restored successfully" });
        } else {
            return res.status(404).json({ success: false, error: "product not found" });
        }
    } catch (error) {
        console.error("Error restoring product:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};


module.exports={
    getProductAddPage,
    addProduct,
    loadProduct,
    loadEditProduct,
    editProduct,
    deleteProduct,
    toggleBlockUnblockProduct,
    restoreProduct,
   
    
    
}

const Offer=require("../../models/offerSchema")
const Product=require("../../models/productSchema")
const Category=require("../../models/categorySchema")
const mongoose=require("mongoose");
const moment = require('moment')

const offerPage = async (req, res) => {
    try {
        console.log('entered offer page');

        // Fetch offers with populated productId and categoryId
        const offers = await Offer.find({})
            .populate('productId')  // Populate productId to fetch product details
            .populate('categoryId'); // Populate categoryId to fetch category details

        // Format dates and add productNames to the offer object
        const formattedOffers = offers.map(item => {
            const formattedStartDate = moment(item.startDate).format('DD-MM-YYYY');
            const formattedEndDate = moment(item.endDate).format('DD-MM-YYYY');

            // Extract product names from the populated productId array
            const productNames = item.productId.map(product => product.productName).join(', ');
            const categoryName=item.categoryId.map(category =>category.name ).join(', ')
            console.log("catname",categoryName)

            return {
                ...item.toObject(),
                formattedStartDate,
                formattedEndDate,
                productNames: productNames || 'N/A', // Join product names if multiple products exist
                categoryName:categoryName ||'N/A',
            };
        });

        res.render('allOffer', { offers: formattedOffers });
    } catch (error) {
        console.log('Error in loading offer page:', error);
        res.status(500).send('Internal Server Error');
    }
};


const loadAddOffer = async (req, res) => {
    try {
        console.log('entering load add offer page');

        const products = await Product.find({})

        const categories = await Category.find({})


        res.render('addOffer', { products: products, categories: categories })
    } catch (error) {
        console.log('error in loading the add offer page');
    }
}

const addOffer = async (req, res) => {
    try {
        console.log('Adding offer started');
        const { offerName, discount, startDate, endDate, offerType, productId, categoryId } = req.body;

        // Enhanced validation helper
        const validationErrors = [];
        const addError = (message) => validationErrors.push(message);

        // Required fields validation with specific messages
        const requiredFields = {
            offerName: 'Offer name',
            discount: 'Discount amount',
            startDate: 'Start date',
            endDate: 'End date',
            offerType: 'Offer type'
        };

        Object.entries(requiredFields).forEach(([field, label]) => {
            if (!req.body[field]) addError(`${label} is required`);
        });

        if (validationErrors.length) {
            return res.status(400).json({
                success: false,
                errorMessage: validationErrors.join(', ')
            });
        }

        // Enhanced offer name validation
        if (!/^[a-zA-Z0-9\s-]{3,50}$/.test(offerName.trim())) {
            return res.status(400).json({
                success: false,
                errorMessage: 'Offer name must be 3-50 characters long and contain only letters, numbers, spaces, and hyphens'
            });
        }

        // Enhanced discount validation
        const numericDiscount = parseFloat(discount);
        if (isNaN(numericDiscount) || numericDiscount <= 0 || numericDiscount > 50000) {
            return res.status(400).json({
                success: false,
                errorMessage: 'Discount must be between 0 and ₹50,000'
            });
        }

        // Enhanced date validation
        const start = new Date(startDate);
        const end = new Date(endDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                errorMessage: 'Invalid date format'
            });
        }

        if (start < now) {
            return res.status(400).json({
                success: false,
                errorMessage: 'Start date cannot be in the past'
            });
        }

        if (start >= end) {
            return res.status(400).json({
                success: false,
                errorMessage: 'End date must be after start date'
            });
        }

        // Check maximum offer duration (6 months)
        const maxEndDate = new Date(start);
        maxEndDate.setMonth(maxEndDate.getMonth() + 6);
        if (end > maxEndDate) {
            return res.status(400).json({
                success: false,
                errorMessage: 'Offer duration cannot exceed 6 months'
            });
        }

        // Validate offer type
        const validOfferTypes = ['Product', 'Category', 'Referral'];
        if (!validOfferTypes.includes(offerType)) {
            return res.status(400).json({
                success: false,
                errorMessage: 'Invalid offer type'
            });
        }

        // Create new offer instance
        const newOffer = new Offer({
            offerName: offerName.trim(),
            discount: numericDiscount,
            startDate: start,
            endDate: end,
            offerType,
            createdAt: new Date()
        });

        // Process Product offer
        if (offerType === 'Product') {
            if (!productId) {
                return res.status(400).json({
                    success: false,
                    errorMessage: 'Product ID is required for Product offers'
                });
            }

            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    errorMessage: 'Product not found'
                });
            }

            // Check for existing active offers on the product
            const existingOffer = await Offer.findOne({
                productId,
                endDate: { $gt: now },
                isActive: true
            });

            if (existingOffer) {
                return res.status(400).json({
                    success: false,
                    errorMessage: 'Product already has an active offer'
                });
            }

            const discountedPrice = product.salePrice - numericDiscount;
            if (discountedPrice < 0) {
                return res.status(400).json({
                    success: false,
                    errorMessage: `Discount exceeds product sale price of ₹${product.salePrice}`
                });
            }

            // Update product with transaction
            const session = await mongoose.startSession();
            try {
                await session.withTransaction(async () => {
                    await Product.findByIdAndUpdate(
                        productId,
                        {
                            $set: {
                                salePrice: discountedPrice,
                                productOfferId: newOffer._id,
                                productDiscount: numericDiscount,
                            }
                        },
                        { new: true, session }
                    );
                    newOffer.productId = productId;
                    await newOffer.save({ session });
                });
            } finally {
                await session.endSession();
            }
        }
        // Process Category offer
        else if (offerType === 'Category') {
            if (!categoryId) {
                return res.status(400).json({
                    success: false,
                    errorMessage: 'Category ID is required for Category offers'
                });
            }

            // Check if category exists
            const category = await Category.findById(categoryId);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    errorMessage: 'Category not found'
                });
            }

            // Check for existing active offers on the category
            const existingOffer = await Offer.findOne({
                categoryId,
                endDate: { $gt: now },
                isActive: true
            });

            if (existingOffer) {
                return res.status(400).json({
                    success: false,
                    errorMessage: 'Category already has an active offer'
                });
            }

            const categoryProducts = await Product.find({ category: categoryId });
            if (!categoryProducts.length) {
                return res.status(404).json({
                    success: false,
                    errorMessage: 'No products found in this category'
                });
            }

            // Update category products with transaction
            const session = await mongoose.startSession();
            try {
                await session.withTransaction(async () => {
                    for (const product of categoryProducts) {
                        const discountedPrice = product.salePrice - numericDiscount;
                        if (discountedPrice >= 0) {
                            await Product.findByIdAndUpdate(
                                product._id,
                                {
                                    $set: {
                                        salePrice: discountedPrice,
                                        categoryOfferId: newOffer._id,
                                        categoryDiscount: numericDiscount,
                                    }
                                },
                                { session }
                            );
                        } else {
                            console.warn(`Skipping product ${product._id} - discount exceeds price`);
                        }
                    }
                    newOffer.categoryId = categoryId;
                    await newOffer.save({ session });
                });
            } finally {
                await session.endSession();
            }
        }
        // Process Referral offer
        else if (offerType === 'Referral') {
            await newOffer.save();
        }

        console.log('Offer saved successfully:', newOffer);
        return res.status(201).json({
            success: true,
            message: 'Offer added successfully',
            offer: newOffer
        });

    } catch (error) {
        console.error('Error adding offer:', error);
        return res.status(500).json({
            success: false,
            errorMessage: 'An error occurred while adding the offer. Please try again.'
        });
    }
};


const loadEditOffer = async (req, res) => {
    try {
        console.log('starting to laod the edit offer page');

        const id = req.query.id
        console.log("id", id);

        const products = await Product.find({})

        const categories = await Category.find({})

        const offer = await Offer.findOne({ _id: id })

        console.log('offer', offer);

        res.render('editOffer', { products: products, offer: offer, categories: categories })

    } catch (error) {
        console.log('error loading edit offer page', error)
    }
}

const editOffer = async (req, res) => {
    try {
        console.log('Starting to edit offer');

        const { id, offerName, discount, startDate, endDate, offerType, productId, categoryId } = req.body;

        // Validate required fields
        if (!id || !offerName || !discount || !startDate || !endDate || !offerType) {
            return res.status(400).json({ success: false, errorMessage: 'All fields are required' });
        }

        // Validate offer name
        if (offerName.trim().length < 3) {
            return res.status(400).json({ success: false, errorMessage: 'Offer name must be at least 3 characters long' });
        }

        // Validate discount
        if (isNaN(discount) || discount <= 0) {
            return res.status(400).json({ success: false, errorMessage: 'Discount must be a positive number' });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ success: false, errorMessage: 'Invalid date format' });
        }

        if (start >= end) {
            return res.status(400).json({ success: false, errorMessage: 'Start date must be before end date' });
        }

        // Validate offer type
        if (!['Product', 'Category', 'Referral'].includes(offerType)) {
            return res.status(400).json({ success: false, errorMessage: 'Invalid offer type' });
        }

        const updatedOffer = { offerName, discount, startDate, endDate, offerType };

        if (offerType === 'Product') {
            console.log('Processing product offer');
            if (!productId) {
                return res.status(400).json({ success: false, errorMessage: 'Product ID is required for Product offers' });
            }

            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ success: false, errorMessage: 'Product not found' });
            }

            // If the offer is being changed, we need to revert the old discount
            if (product.productOfferId && product.productOfferId !== id) {
                const oldOffer = await Offer.findById(product.productOfferId);
                if (oldOffer && oldOffer.offerType === 'Product') {
                    const oldProduct = await Product.findById(product.productOfferId);
                    if (oldProduct) {
                        // Restore the old sale price
                        await Product.findByIdAndUpdate(
                            product._id,
                            { $set: { salePrice: oldProduct.salePrice } },
                            { new: true }
                        );
                        console.log(`Restored old price for product ${product._id}`);
                    }
                }
            }

            const discountedPrice = product.salePrice - discount;
            if (discountedPrice < 0) {
                return res.status(400).json({ success: false, errorMessage: 'Discount exceeds product sale price' });
            }

            await Product.findByIdAndUpdate(
                productId,
                {
                    $set: {
                        salePrice: discountedPrice,
                        productOfferId: id,
                        productDiscount: discount,
                    },
                },
                { new: true }
            );

            updatedOffer.productId = productId;
        } else if (offerType === 'Category') {
            console.log('Processing category offer');
            if (!categoryId) {
                return res.status(400).json({ success: false, errorMessage: 'Category ID is required for Category offers' });
            }

            const categoryProducts = await Product.find({ category: categoryId });
            if (!categoryProducts.length) {
                return res.status(404).json({ success: false, errorMessage: 'No products found for the category' });
            }

            for (const product of categoryProducts) {
                const discountedPrice = product.salePrice - discount;

                if (discountedPrice < 0) {
                    console.warn(`Skipping product ${product._id} due to excessive discount`);
                    continue;
                }

                await Product.findByIdAndUpdate(
                    product._id,
                    {
                        $set: {
                            salePrice: discountedPrice,
                            categoryOfferId: id,
                            categoryDiscount: discount,
                        },
                    },
                    { new: true }
                );

                console.log(`Product ${product._id} sale price updated to ${discountedPrice}`);
            }

            updatedOffer.categoryId = categoryId;
        }

        // Update the offer
        await Offer.findByIdAndUpdate(id, updatedOffer, { new: true });
        console.log('Offer updated successfully:', updatedOffer);

        res.redirect('/admin/offer');
    } catch (error) {
        console.error('Error editing offer:', error);
        res.status(500).json({ success: false, errorMessage: 'Error editing offer: ' + error.message });
    }
};


const deleteOffer = async (req, res) => {
    try {
        console.log('Entered deleting');
        const { offerId } = req.body;

        // Find the offer to delete
        const offer = await Offer.findById(offerId);

        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found" });
        }

        // Check if offer type is Product or Category
        if (offer.offerType === 'Product') {
            // If offer is for a product, update the product
            const product = await Product.findById(offer.productId);
            if (product) {
                await Product.findByIdAndUpdate(
                    offer.productId,
                    {
                        $unset: {
                            productOfferId: 1, // Remove the reference to offer
                            productDiscount: 1, // Remove the discount
                        },
                        $set: { salePrice: product.regularPrice } // Reset sale price to regular price
                    },
                    { new: true }
                );
            }
        } else if (offer.offerType === 'Category') {
            // If offer is for a category, update all products in that category
            const catProducts = await Product.find({ category: offer.categoryId });
            for (const product of catProducts) {
                await Product.findByIdAndUpdate(
                    product._id,
                    {
                        $unset: {
                            categoryOfferId: 1, // Remove the reference to offer
                            categoryDiscount: 1, // Remove the discount
                        },
                        $set: { salePrice: product.regularPrice } // Reset sale price to regular price
                    },
                    { new: true }
                );
            }
        }

        // Delete the offer from the database
        await Offer.deleteOne({ _id: offerId });

        res.status(200).json({ success: true, message: "Offer deleted successfully" });
    } catch (error) {
        console.log('Error in deleting the offer:', error);
        res.status(500).json({ success: false, message: "Error deleting offer: " + error.message });
    }
};

module.exports={
    offerPage,
    loadAddOffer,
    addOffer,
    loadEditOffer,
    editOffer,
    deleteOffer
}


const Coupon=require('../../models/couponSchema')
const mongoose = require('mongoose');

const loadCouponPage = async (req, res) => {
    try {
        
        const coupons = await Coupon.find({});
        console.log("coupon",coupons)

       
        res.render('couponPage', { coupons });
    } catch (error) {
        console.error('Error loading coupon page:', error);
        res.status(500).send('Error loading coupon page');
    }
};

const addCouponPage=async(req,res)=>{
    try {
        res.render('addCoupon')
    } catch (error) {
        
    }
}

const addCoupon = async (req, res) => {
    try {
        const {
            couponName,
            couponCode,
            offerType,
            offerValue,
            minimumPrice,
            expiryDate,
            isActive,
            usageLimit,
            usagePerUserLimit,
            description,
        } = req.body;
         console.log(".,",expiryDate)
        
        if (!couponName || !couponCode || !offerType || !offerValue || !minimumPrice || !expiryDate) {
            return res.status(400).json({ message: 'All fields are required. Please check again!' });
        }

        
        if (!couponName.trim()) {
            return res.status(400).json({ message: 'Coupon name cannot be empty.' });
        }

        

        
        const existingCoupon = await Coupon.findOne({ $or: [{ couponName }, { couponCode }] });
        if (existingCoupon) {
            return res.status(400).json({ message: 'Coupon with the same name or code already exists.' });
        }

        
        const isActiveValue = isActive === 'on' ? true : false;

        
        const newCoupon = new Coupon({
            couponName,
            couponCode,
            offerType,
            offerValue,
            minimumPrice,
            expiredOn: expiryDate,
            isActive: isActiveValue,
            usageLimit: usageLimit || null, 
            usagePerUserLimit,
            description,
        });

        await newCoupon.save();
        return res.status(201).json({ message: `Coupon ${couponName} has been added successfully.` });
    } catch (error) {
        console.error('Error:', error.message);
        return res.status(500).json({ message: 'An error occurred while adding the coupon.' });
    }
};



const softDeleteCoupon = async (req, res) => {
    try {
        const { couponId } = req.body;

        if (!couponId || !mongoose.Types.ObjectId.isValid(couponId)) {
            return res.status(400).json({ success: false, message: "Valid Coupon ID is required" });
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            { isDeleted: true },
            { new: true }
        );

        if (!updatedCoupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        res.status(200).json({ success: true, message: "Coupon soft deleted successfully" });
    } catch (error) {
        console.error("Error soft deleting coupon:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const restoreCoupon = async (req, res) => {
    try {
        const { couponId } = req.body;

        if (!couponId || !mongoose.Types.ObjectId.isValid(couponId)) {
            return res.status(400).json({ success: false, message: "Valid Coupon ID is required" });
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            { isDeleted: false },
            { new: true }
        );

        if (!updatedCoupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        res.status(200).json({ success: true, message: "Coupon restored successfully" });
    } catch (error) {
        console.error("Error restoring coupon:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const loadEditCoupon = async (req, res) => {
    try {
        console.log('Loading edit coupon page');

        const id = req.query.id;
        console.log("Coupon ID:", id);

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.log('Invalid Coupon ID');
            return res.status(400).render('editCoupon', {
                errorMessage: 'Invalid coupon ID',
                coupons: null,
            });
        }

        const couponData = await Coupon.findOne({ _id: id });

        if (!couponData) {
            console.log('No coupon found with the provided ID');
            return res.status(404).render('editCoupon', {
                errorMessage: 'Coupon not found',
                coupons: null,
            });
        }

        console.log('Coupon Data:', couponData);

        res.render('editCoupon', { coupons: couponData });
    } catch (error) {
        console.error('Error loading the edit coupon page:', error);
        res.status(500).render('editCoupon', {
            errorMessage: 'An error occurred while loading the coupon. Please try again later.',
            coupons: null,
        });
    }
};
const editCoupon = async (req, res) => {
    try {
        console.log('Editing coupon');

        const details = req.body;
        console.log('Details:', details);

        const id = details.id;
        console.log('Coupon ID:', id);

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).render('editCoupon', {
                errorMessage: "Invalid coupon ID",
                coupons: details
            });
        }

        const expiryDate = new Date(details.expireDate);
        if (isNaN(expiryDate.getTime())) {
            return res.status(400).render('editCoupon', {
                errorMessage: "Invalid expiry date format",
                coupons: details
            });
        }

        const currentDate = new Date();
        if (expiryDate <= currentDate) {
            return res.status(400).render('editCoupon', {
                errorMessage: "Expiry date must be in the future",
                coupons: details
            });
        }

        const couponData = await Coupon.findByIdAndUpdate(
            id,
            {
                couponCode: details.couponCode,
                offerValue: details.discountAmount,
                minimumPrice: details.minimumAmount,
                description: details.description,
                expiredOn: expiryDate
            },
            { new: true }
        );

        if (couponData) {
            res.redirect('/admin/coupon');
        } else {
            console.log('Coupon update failed');
            res.status(404).render('editCoupon', {
                errorMessage: "Coupon update failed",
                coupons: details
            });
        }
    } catch (error) {
        console.log('Error editing coupon:', error);
        res.status(500).render('editCoupon', {
            errorMessage: "Internal server error",
            coupons: req.body
        });
    }
};





module.exports={
    loadCouponPage,
    addCouponPage,
    addCoupon,
    softDeleteCoupon,
    restoreCoupon,
    loadEditCoupon,
    editCoupon
    
 
}
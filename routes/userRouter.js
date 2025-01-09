const express=require("express");
const passport = require("passport");
const router=express.Router();
const userController=require("../controllers/user/userController")
const cartController=require("../controllers/user/cartController")
const orderController=require("../controllers/user/orderController")
const wishlistController=require("../controllers/user/wishlistController")
const walletController=require("../controllers/user/walletController")
const auth=require("../middleware/userAuth");
const { createPayPalPayment, paypalSuccess,paypalCancel,orderCancelled } = require("../controllers/user/paypalControlle");





router.get("/",auth.ifLogged,userController.loadHomePage)
router.get('/signup',auth.ifLogged,userController.signupPage)
router.post('/signup',userController.signup)
router.get('/verify-otp',auth.ifLogged,userController.getOtp)
router.post("/verify-otp",userController.verifyotp)
router.get("/homePage",userController.homePage)
router.post('/resend-otp',userController.resendOtp)
router.get('/login',auth.ifLogged,userController.loadLogin)
router.post('/login',userController.login)
router.get('/logout',userController.logout)

router.get('/product/:id',auth.ifLogout, userController.getProductDetails)

router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);


router.post("/viewAllProduct",userController.viewAllProduct)
router.get('/viewAllProductPage',auth.ifLogout, userController.viewAllProductsPage);

router.get("/productss",auth.ifLogout,userController.getAllProducts)
router.get('/search', auth.ifLogout,userController.searchProducts);

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/signup' }),
    (req, res) => {
        req.session.userId = req.user._id;
        req.session.isAuth=true;
        res.redirect('/homepage');
    }
);


router.get('/findbycat',auth.ifLogout,userController.findbycategory)
router.get('/profile',auth.ifLogout,userController.loadUserProfile)
router.post('/updateProfile', userController.updateUserProfile)
router.get("/addressbook",auth.ifLogout,userController.loadAddressBook)
router.get("/newPassword",auth.ifLogout,userController.loadNewPassword)
router.post("/changePass",userController.changePassValid)
router.post("/addressverify",userController.addressverify)
router.get("/addressverifyy",userController.addressverifyy)
router.delete('/deleteAddress/:id', userController.deleteAddress);
router.get("/editAddress",auth.ifLogout,userController.getEditPage)
router.post("/updateAddress",userController.editAddress)


router.get("/cart",auth.ifLogout,cartController.loadCart)
router.post('/updateCartQuantity/:productId',cartController.updateQuantity);
router.post("/addToCart/:id",cartController.addToCart)
router.post("/addToCarts/:id",cartController.addToCarts)
router.delete("/removeCartItem/:productId", cartController.removeCartItem);
router.post('/updateCartQuantityy/:productId', cartController.updateQuantityy);
router.get('/getCartStock/:productId',cartController. getCartStock);
// router.post('/updateQuantity/:id', cartController.updateQuantity);
router.post("/confirmOrder",cartController.confirmOrder)
router.get('/confirmOrder',auth.ifLogout, cartController.renderConfirmOrderPage);



router.post("/placeOrder",orderController.placeOrder)
router.get("/orderSuccess",auth.ifLogout,orderController.orderSuccess)
router.get("/orderdetails/:orderId", auth.ifLogout,orderController.orderDetails);
router.get("/myorder",auth.ifLogout,orderController.myOrder)
router.post("/addressConfirm",orderController.addressConfirm)


router.post("/applycoupon",orderController.applyCoupon)
router.get('/coupons', orderController.getAllAvailableCoupons);


router.post("/createPayPalPayment",createPayPalPayment)
router.get('/paypalSuccess', paypalSuccess)
router.get("/paypalCancel", paypalCancel); 
router.get("/paymentCancelled",orderCancelled)



router.get('/wishlist',auth.ifLogout,wishlistController.wishlist)
router.post("/addToWishlist",wishlistController.addToWishlist)
router.delete('/removeFromWishlist/:productId', wishlistController.removeFromWishlist);

router.get("/wallet",walletController.walletPage)
router.put('/cancel/:orderId', orderController.cancelOrder);
router.put('/return/:orderId', orderController.returnOrder);

router.get('/invoice/:orderId', orderController.downloadInvoice);







module.exports = router
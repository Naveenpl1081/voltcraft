const express=require("express")
const router=express.Router()
const adminController=require("../controllers/admin/adminController")
const customerController=require("../controllers/admin/customerController")
const categoryController=require("../controllers/admin/categoryController")
const productController=require("../controllers/admin/productController")
const orderController=require("../controllers/admin/orderController")
const couponController=require("../controllers/admin/couponController")
const salesController=require("../controllers/admin/salesController")
const offerController=require("../controllers/admin/offerController")
const multer = require('multer');
const path = require('path')
const auth=require("../middleware/adminAuth")




// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../public/uploads")); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });




router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login)
router.get('/',auth.ifLogout,adminController.loadDashboard)
router.get("/logout",auth.ifLogout,adminController.logout)
router.get("/users",auth.ifLogout,customerController.customerInfo)
router.get('/dashboard',auth.ifLogout,adminController.loadDashboard)
router.post('/blockAndUnblock/:id', customerController.userBlock);



router.get("/categoryInfo",auth.ifLogout,categoryController.categoryInfo)
router.post('/addcategory', categoryController.addCategory)
router.get('/addCategory',auth.ifLogout,categoryController.getCategory)
router.delete('/deleteCategory/:id', categoryController.deleteCategory);
router.patch('/restoreCategory/:id', categoryController.restoreCategory);
router.get('/editCategory',auth.ifLogout,categoryController.editCategory)
router.post('/editCategory',categoryController.editCat)
// router.patch('/catblock/:cat_id', categoryController.catBlock);



router.get("/addProduct",auth.ifLogout,productController.getProductAddPage)
router.post('/addProduct', upload.array('cropImages', 4),productController.addProduct);
router.get("/allProduct",auth.ifLogout,productController.loadProduct)
router.post('/deleteProduct/:id', productController.deleteProduct);
router.post('/restoreProduct/:id', productController.restoreProduct);
router.get('/editProduct',auth.ifLogout,productController.loadEditProduct)
router.post('/editProduct/:id', upload.array('cropImages', 4), productController.editProduct);
// router.post('/blockProduct/:productId', productController.toggleBlockUnblockProduct);



router.get("/orders",auth.ifLogout,orderController.loadOrder)
router.get('/singleorderview/:orderId', auth.ifLogout,orderController.singleOrder);
router.post("/changeStatus",orderController.changeStatus)



router.get('/coupon',auth.ifLogout,couponController.loadCouponPage)
router.get('/addcoupon',auth.ifLogout,couponController.addCouponPage)
router.post('/addCoupon',couponController.addCoupon)
router.post('/softdeletecoupon',couponController.softDeleteCoupon)
router.post('/restorecoupon', couponController.restoreCoupon);
router.get('/editcoupon',couponController.loadEditCoupon)
router.post('/editcoupon',couponController.editCoupon)

router.get('/offer',offerController.offerPage)
router.get('/addoffer',offerController.loadAddOffer)
router.post('/addoffer',offerController.addOffer)
router.get('/editOffer',offerController.loadEditOffer)
router.post('/editOffer',offerController.editOffer)
router.post('/deleteoffer',offerController.deleteOffer)


router.get('/salesreport',salesController.loadSalesReport)
router.get("/salesDaily",salesController.dailySalesReport)
router.get('/salesWeekly',salesController.generateWeeklyReport)
router.get('/salesMonthly',salesController.generateMonthlyReport)
router.get('/salesYearly',salesController.generateYearlyReport)
router.get('/customDateReport',salesController.generateCustomDateReport)



router.get('/cancelPage',orderController.loadCancelPage)

router.put('/approve/:orderId', orderController.approveOrder);
router.put('/reject/:orderId', orderController.rejectOrder);


router.post('/graph',salesController.graphData)


module.exports=router
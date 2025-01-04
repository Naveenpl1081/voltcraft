const User=require("../../models/userSchema")
const mongoose=require("mongoose");
const Order=require("../../models/orderSchema")
const Category=require("../../models/categorySchema");
const Product=require("../../models/productSchema")

const bcrypt=require("bcrypt");




const loadLogin=(req,res)=>{
    if (req.session.admin) {
        return res.redirect("/admin/dashboard");
    }
    res.render("adminlogin", { message: null });
}

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('username:', username);
        console.log('password:', password);

        const admin = await User.findOne({ email: username, isAdmin: true });
        console.log(admin);

        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password); // Use await here
            if (passwordMatch) {
                req.session.admin = true;
                return res.redirect("/admin/dashboard");
            } else {
                console.log("Incorrect password");
                return res.render("adminlogin", { message: "Incorrect password. Please try again." }); // Show message on failed login
            }
        } else {
            console.log("Admin not found");
            return res.render("adminlogin", { message: "Admin not found. Please check your credentials." }); // Show message if admin is not found
        }
    } catch (error) {
        console.log("Login error", error);
        return res.redirect("/pageerror");
    }
};





const verifyLogin = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      console.log(email, password);
  
      const adminData = await Admin.findOne({ email: email });
  
      if (adminData) {
        console.log('Stored Password:', adminData); 
        const passwordMatch = await bcrypt.compare(password, adminData.password);
  
        console.log('Password Match:', passwordMatch); 
  
        if (passwordMatch) {
          res.set('Cache-control', 'no-store');
          req.session.admin_id = adminData._id
          return res.redirect('/admin/dashboard'); 
        } else {
          req.session.loginError = 'Invalid password';
          console.log('Password does not match');
          return res.redirect('/admin/login');
        }
      } else {
        req.session.loginError = 'Invalid Email Id';
        console.log('Email does not match');
        return res.redirect('/admin/login');
      }
    } catch (error) {
      console.log('Failed to connect to dashboard', error);
      req.session.loginError = 'Failed to connect to dashboard';
      return res.redirect('/admin/login');
    }
  }

  const loadDashboard = async (req, res) => {
    try {
        // Fetch required data
        const deliveredOrders = await Order.find({ orderStatus: 'Delivered' });
        const categories = await Category.find({});
        const products = await Product.find({});

        // Calculate total revenue
        const totalRevenue = deliveredOrders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);

        // Calculate total orders
        const totalOrders = deliveredOrders.length;

        // Calculate monthly earnings
        const monthlyEarnings = {};
        deliveredOrders.forEach(order => {
            if (order.createdAt) {
                const orderDate = new Date(order.createdAt);
                const monthYear = `${orderDate.getMonth() + 1}-${orderDate.getFullYear()}`;
                if (!monthlyEarnings[monthYear]) {
                    monthlyEarnings[monthYear] = 0;
                }
                monthlyEarnings[monthYear] += order.totalAmount || 0;
            } else {
                console.warn('Order missing createdAt:', order);
            }
        });

        // Retrieve current month's earnings
        const now = new Date();
        const currentMonthYear = `${now.getMonth() + 1}-${now.getFullYear()}`;
        const currentMonthEarnings = monthlyEarnings[currentMonthYear] || 0;

        // Debugging logs
        console.log('Delivered Orders:', deliveredOrders);
        console.log('Monthly Earnings:', monthlyEarnings);
        console.log('Current Month Earnings:', currentMonthEarnings);
        console.log('Total Revenue:', totalRevenue);
        console.log('Total Orders:', totalOrders);

        // Render dashboard
        res.render('dashboard', {
            orders: deliveredOrders,
            categories,
            products,
            totalRevenue,
            totalOrders,
            monthlyEarning: currentMonthEarnings, // Ensure consistency with EJS file
        });
    } catch (error) {
        console.error('Error rendering dashboards:', error);
        res.status(500).send('Error loading dashboard');
    }
};






const logout=async(req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
                console.log("error destroying session",err)
                return res.redirect("/pageerror")
            }
            res.redirect("/admin/login")
        })
    } catch (error) {
        console.log("unexpected error during logout",error)
    }
}

module.exports={
    loadLogin,
    login,
    loadDashboard,
    logout
}
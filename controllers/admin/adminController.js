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
            const passwordMatch = await bcrypt.compare(password, admin.password); 
            if (passwordMatch) {
              console.log("hello")
                req.session.admin = true;
                return res.redirect("/admin/dashboard");
            } else {
                console.log("Incorrect password");
                return res.render("adminlogin", { message: "Incorrect password. Please try again." }); 
            }
        } else {
            console.log("Admin not found");
            return res.render("adminlogin", { message: "Admin not found. Please check your credentials." }); 
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




  
  const calculateTimeBasedData = async (orders, period) => {
    const result = {};
    const now = new Date();
  
    orders.forEach(order => {
      if (!order.createdAt) return;
      const orderDate = new Date(order.createdAt);
      let key;
  
      switch (period) {
        case 'daily':
          key = orderDate.toISOString().split('T')[0];
          break;
        case 'weekly':
          // Get the Monday of the week
          const day = orderDate.getDay();
          const diff = orderDate.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(orderDate.setDate(diff));
          key = monday.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'yearly':
          key = orderDate.getFullYear().toString();
          break;
      }
  
      if (!result[key]) {
        result[key] = {
          revenue: 0,
          orders: 0,
          items: 0
        };
      }
  
      result[key].revenue += order.totalAmount || 0;
      result[key].orders += 1;
      result[key].items += order.items.length;
    });
  
    return result;
  };
  
  const calculateChartData = async () => {
    try {
      const categories = await Category.find({ isDeleted: false });
      const deliveredOrders = await Order.find({ 
        orderStatus: 'Delivered',
        createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } // Last 365 days
      }).populate({
        path: 'items.productId',
        select: 'category price',
        populate: {
          path: 'category',
          model: 'Category'
        }
      });
  
      
      const salesByCategory = categories.reduce((acc, category) => {
        acc[category.name] = 0;
        return acc;
      }, {});
  
      deliveredOrders.forEach(order => {
        order.items.forEach(item => {
          if (item.productId?.category?.name) {
            salesByCategory[item.productId.category.name] += item.price * item.quantity;
          }
        });
      });
  
      
      const dailyData = await calculateTimeBasedData(deliveredOrders, 'daily');
      const weeklyData = await calculateTimeBasedData(deliveredOrders, 'weekly');
      const monthlyData = await calculateTimeBasedData(deliveredOrders, 'monthly');
      const yearlyData = await calculateTimeBasedData(deliveredOrders, 'yearly');
  
      return {
        categoryData: {
          labels: Object.keys(salesByCategory),
          data: Object.values(salesByCategory)
        },
        timeBasedData: {
          daily: dailyData,
          weekly: weeklyData,
          monthly: monthlyData,
          yearly: yearlyData
        }
      };
    } catch (error) {
      console.error('Error calculating chart data:', error);
      throw error;
    }
  };
  
  const loadDashboard = async (req, res) => {
    try {
        const { categoryData, timeBasedData } = await calculateChartData();
        
        
        const categories = await Category.find({ isDeleted: false });  
        const products = await Product.find({ isBlocked: false });  
        console.log("helloooo",products)

   
        const deliveredOrders = await Order.find({ orderStatus: 'Delivered' }).populate('items.productId'); 
        const totalRevenue = deliveredOrders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);
        const totalOrders = deliveredOrders.length;

        
        const productSales = {};
        deliveredOrders.forEach(order => {
            order.items.forEach(item => {
                if (!productSales[item.productId._id]) {  
                    productSales[item.productId._id] = 0;
                }
                productSales[item.productId._id] += item.quantity;
            });
        });

        const sortedProducts = Object.entries(productSales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        const bestSellingProducts = {
            labels: sortedProducts.map(([productId]) => {
                const product = products.find(p => p._id.toString() === productId.toString());
                return product ? product.productName : 'Unknown Product';  
            }),
            data: sortedProducts.map(([_, quantity]) => quantity)
        };

        
        const categorySales = {};
        deliveredOrders.forEach(order => {
            order.items.forEach(item => {
                const product = item.productId; 
                if (product) {
                    const categoryId = product.category.toString();
                    if (!categorySales[categoryId]) {
                        categorySales[categoryId] = 0;
                    }
                    categorySales[categoryId] += item.quantity;
                }
            });
        });
        console.log("best",bestSellingProducts)

        const sortedCategories = Object.entries(categorySales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2);
        const bestSellingCategories = {
            labels: sortedCategories.map(([categoryId]) => {
                const category = categories.find(c => c._id.toString() === categoryId);
                return category ? category.name : 'Unknown Category';
            }),
            data: sortedCategories.map(([_, quantity]) => quantity)
        };

        
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthlyEarning = Object.values(timeBasedData.monthly[currentMonth] || { revenue: 0 })[0];

        res.render('dashboard', {
            categories,
            products,
            totalRevenue,
            totalOrders,
            monthlyEarning,
            chartLabels: categoryData.labels,
            chartData: categoryData.data,
            timeBasedData,
            currentPeriod: {
                daily: now.toISOString().split('T')[0],
                weekly: (() => {
                    const day = now.getDay();
                    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                    return new Date(now.setDate(diff)).toISOString().split('T')[0];
                })(),
                monthly: currentMonth,
                yearly: now.getFullYear().toString()
            },
            bestSellingProducts,
            bestSellingCategories
        });
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        res.status(500).send('Error loading dashboard');
    }
};


  
  module.exports = {
    loadDashboard
  };




const logout=async(req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
                console.log("error destroying session",err)
                return res.redirect("/pageerror")
            }
            console.log("session des")
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
    logout,
   
}
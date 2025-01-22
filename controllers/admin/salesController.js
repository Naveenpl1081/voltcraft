
const Orders=require("../../models/orderSchema")
const User=require("../../models/userSchema")
const moment = require('moment')
const PDFDocument = require('pdfkit');

const loadSalesReport = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = 10; 
        const skip = (page - 1) * limit; 

        const totalOrders = await Orders.countDocuments(); 
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Orders.find({})
            .populate('userId')
            .populate('deliveryAddress')
            .populate({ path: 'items.productId', model: 'Product' }) 
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit);

        const formattedOrders = orders.map(order => {
            const date = new Date(order.createdAt);
            const formattedDate = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
            return {
                ...order.toObject(),
                formattedCreatedAt: formattedDate,
            };
        });

        res.render('salesReport', {
            orderDetails: formattedOrders,
            currentPage: page,
            totalPages,
        });
    } catch (error) {
        console.error('Error loading sales report page:', error);
        res.status(500).send('Error loading sales report page');
    }
};



const dailySalesReport = async (req, res) => {
    try {
        const startDate = moment().startOf('day');
        const endDate = moment().endOf('day');

        
        const report = await Orders.find({
            createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() }
        })
        .populate('userId', 'name email')
        .populate('couponApplied')
        .populate('items.productId')
        .sort({ createdAt: -1 });

       
        const metrics = {
            totalAmount: 0,
            totalOrders: report.length,
            totalItems: 0,
            totalCouponAmount: 0,
            couponsUsed: 0,
            paymentMethods: {},
            orderStatuses: {}
        };

        
        report.forEach(order => {
           
            metrics.totalAmount += order.totalAmount || 0;

           
            metrics.totalItems += order.items.reduce((sum, item) => sum + item.quantity, 0);

            
            metrics.paymentMethods[order.paymentMethod] = 
                (metrics.paymentMethods[order.paymentMethod] || 0) + 1;

            
            metrics.orderStatuses[order.orderStatus] = 
                (metrics.orderStatuses[order.orderStatus] || 0) + 1;

           
            if (order.couponApplied) {
                const couponAmount = calculateCouponDiscount(order);
                metrics.totalCouponAmount += couponAmount;
                metrics.couponsUsed++;
            }
        });

        
        metrics.avgOrderValue = metrics.totalAmount / metrics.totalOrders || 0;
        metrics.avgItemsPerOrder = metrics.totalItems / metrics.totalOrders || 0;
        metrics.couponUsageRate = (metrics.couponsUsed / metrics.totalOrders * 100) || 0;

        
        const chartData = {
            paymentMethodLabels: Object.keys(metrics.paymentMethods),
            paymentMethodData: Object.values(metrics.paymentMethods),
            orderStatusLabels: Object.keys(metrics.orderStatuses),
            orderStatusData: Object.values(metrics.orderStatuses)
        };

        
        const getStatusColor = (status) => {
            const colors = {
                'Ordered': 'primary',
                'Shipped': 'info',
                'Out For Delivery': 'warning',
                'Delivered': 'success',
                'Cancelled': 'danger',
                'Returned': 'secondary',
                'Pending': 'warning',
                'Approved': 'success',
                'Failed': 'danger',
                'payment-Retry': 'warning'
            };
            return colors[status] || 'secondary';
        };

        
        res.render('reports', {
            report,
            metrics,
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD'),
            getStatusColor,
            getCouponAmount: calculateCouponDiscount,
            ...chartData 
        });

    } catch (error) {
        console.error('Error generating daily sales report:', error);
        res.status(500).send('Error generating daily sales report');
    }
};



const generateWeeklyReport = async (req, res) => {
    try {
        const startDate = moment().startOf('week');
        const endDate = moment().endOf('week');

        
        const report = await Orders.find({
            createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() }
        })
            .populate('userId', 'name email')
            .populate('couponApplied')
            .populate('items.productId')
            .sort({ createdAt: -1 });

       
        const metrics = {
            totalAmount: 0,
            totalOrders: report.length,
            totalItems: 0,
            totalCouponAmount: 0,
            couponsUsed: 0,
            paymentMethods: {},
            orderStatuses: {}
        };

        
        report.forEach(order => {
            metrics.totalAmount += order.totalAmount || 0;

            metrics.totalItems += order.items.reduce((sum, item) => sum + item.quantity, 0);

            metrics.paymentMethods[order.paymentMethod] =
                (metrics.paymentMethods[order.paymentMethod] || 0) + 1;

            metrics.orderStatuses[order.orderStatus] =
                (metrics.orderStatuses[order.orderStatus] || 0) + 1;

            if (order.couponApplied) {
                const couponAmount = calculateCouponDiscount(order);
                metrics.totalCouponAmount += couponAmount;
                metrics.couponsUsed++;
            }
        });

        
        metrics.avgOrderValue = metrics.totalAmount / metrics.totalOrders || 0;
        metrics.avgItemsPerOrder = metrics.totalItems / metrics.totalOrders || 0;
        metrics.couponUsageRate = (metrics.couponsUsed / metrics.totalOrders * 100) || 0;

        
        const chartData = {
            paymentMethodLabels: Object.keys(metrics.paymentMethods),
            paymentMethodData: Object.values(metrics.paymentMethods),
            orderStatusLabels: Object.keys(metrics.orderStatuses),
            orderStatusData: Object.values(metrics.orderStatuses)
        };

        // Helper function for status colors
        const getStatusColor = (status) => {
            const colors = {
                'Ordered': 'primary',
                'Shipped': 'info',
                'Out For Delivery': 'warning',
                'Delivered': 'success',
                'Cancelled': 'danger',
                'Returned': 'secondary',
                'Pending': 'warning',
                'Approved': 'success',
                'Failed': 'danger',
                'payment-Retry': 'warning'
            };
            return colors[status] || 'secondary';
        };

        // Render the weekly report
        res.render('reports', {
            report,
            metrics,
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD'),
            getStatusColor,
            getCouponAmount: calculateCouponDiscount,
            ...chartData
        });
    } catch (error) {
        console.error('Error generating weekly report:', error);
        res.status(500).send('Error generating weekly report');
    }
};



const generateMonthlyReport = async (req, res) => {
    try {
        const startDate = moment().startOf('month');
        const endDate = moment().endOf('month');

        // Fetch orders for the week
        const report = await Orders.find({
            createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() }
        })
            .populate('userId', 'name email')
            .populate('couponApplied')
            .populate('items.productId')
            .sort({ createdAt: -1 });

        // Initialize metrics
        const metrics = {
            totalAmount: 0,
            totalOrders: report.length,
            totalItems: 0,
            totalCouponAmount: 0,
            couponsUsed: 0,
            paymentMethods: {},
            orderStatuses: {}
        };

        // Calculate metrics
        report.forEach(order => {
            metrics.totalAmount += order.totalAmount || 0;

            metrics.totalItems += order.items.reduce((sum, item) => sum + item.quantity, 0);

            metrics.paymentMethods[order.paymentMethod] =
                (metrics.paymentMethods[order.paymentMethod] || 0) + 1;

            metrics.orderStatuses[order.orderStatus] =
                (metrics.orderStatuses[order.orderStatus] || 0) + 1;

            if (order.couponApplied) {
                const couponAmount = calculateCouponDiscount(order);
                metrics.totalCouponAmount += couponAmount;
                metrics.couponsUsed++;
            }
        });

        // Calculate averages
        metrics.avgOrderValue = metrics.totalAmount / metrics.totalOrders || 0;
        metrics.avgItemsPerOrder = metrics.totalItems / metrics.totalOrders || 0;
        metrics.couponUsageRate = (metrics.couponsUsed / metrics.totalOrders * 100) || 0;

        // Prepare chart data
        const chartData = {
            paymentMethodLabels: Object.keys(metrics.paymentMethods),
            paymentMethodData: Object.values(metrics.paymentMethods),
            orderStatusLabels: Object.keys(metrics.orderStatuses),
            orderStatusData: Object.values(metrics.orderStatuses)
        };

        // Helper function for status colors
        const getStatusColor = (status) => {
            const colors = {
                'Ordered': 'primary',
                'Shipped': 'info',
                'Out For Delivery': 'warning',
                'Delivered': 'success',
                'Cancelled': 'danger',
                'Returned': 'secondary',
                'Pending': 'warning',
                'Approved': 'success',
                'Failed': 'danger',
                'payment-Retry': 'warning'
            };
            return colors[status] || 'secondary';
        };

        // Render the weekly report
        res.render('reports', {
            report,
            metrics,
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD'),
            getStatusColor,
            getCouponAmount: calculateCouponDiscount,
            ...chartData
        });
    } catch (error) {
        console.error('Error generating weekly report:', error);
        res.status(500).send('Error generating weekly report');
    }
};




const generateYearlyReport = async (req, res) => {
    try {
        const startDate = moment().startOf('year');
        const endDate = moment().endOf('year');

        // Fetch orders for the week
        const report = await Orders.find({
            createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() }
        })
            .populate('userId', 'name email')
            .populate('couponApplied')
            .populate('items.productId')
            .sort({ createdAt: -1 });

        // Initialize metrics
        const metrics = {
            totalAmount: 0,
            totalOrders: report.length,
            totalItems: 0,
            totalCouponAmount: 0,
            couponsUsed: 0,
            paymentMethods: {},
            orderStatuses: {}
        };

        // Calculate metrics
        report.forEach(order => {
            metrics.totalAmount += order.totalAmount || 0;

            metrics.totalItems += order.items.reduce((sum, item) => sum + item.quantity, 0);

            metrics.paymentMethods[order.paymentMethod] =
                (metrics.paymentMethods[order.paymentMethod] || 0) + 1;

            metrics.orderStatuses[order.orderStatus] =
                (metrics.orderStatuses[order.orderStatus] || 0) + 1;

            if (order.couponApplied) {
                const couponAmount = calculateCouponDiscount(order);
                metrics.totalCouponAmount += couponAmount;
                metrics.couponsUsed++;
            }
        });

        // Calculate averages
        metrics.avgOrderValue = metrics.totalAmount / metrics.totalOrders || 0;
        metrics.avgItemsPerOrder = metrics.totalItems / metrics.totalOrders || 0;
        metrics.couponUsageRate = (metrics.couponsUsed / metrics.totalOrders * 100) || 0;

        // Prepare chart data
        const chartData = {
            paymentMethodLabels: Object.keys(metrics.paymentMethods),
            paymentMethodData: Object.values(metrics.paymentMethods),
            orderStatusLabels: Object.keys(metrics.orderStatuses),
            orderStatusData: Object.values(metrics.orderStatuses)
        };

        // Helper function for status colors
        const getStatusColor = (status) => {
            const colors = {
                'Ordered': 'primary',
                'Shipped': 'info',
                'Out For Delivery': 'warning',
                'Delivered': 'success',
                'Cancelled': 'danger',
                'Returned': 'secondary',
                'Pending': 'warning',
                'Approved': 'success',
                'Failed': 'danger',
                'payment-Retry': 'warning'
            };
            return colors[status] || 'secondary';
        };

        // Render the weekly report
        res.render('reports', {
            report,
            metrics,
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD'),
            getStatusColor,
            getCouponAmount: calculateCouponDiscount,
            ...chartData
        });
    } catch (error) {
        console.error('Error generating weekly report:', error);
        res.status(500).send('Error generating weekly report');
    }
};

const generateCustomDateReport = async (req, res) => {
    try {

       
        const startDate = moment(req.query.startDate, 'YYYY-MM-DD', true).startOf('day');
        const endDate = moment(req.query.endDate, 'YYYY-MM-DD', true).endOf('day');

        // Validate dates
        if (!startDate.isValid() || !endDate.isValid()) {
            return res.status(400).send('Invalid date format. Please use YYYY-MM-DD.');
        }
        if (startDate.isAfter(endDate)) {
            return res.status(400).send('Start date cannot be after end date.');
        }
        const validateDates = (startDate, endDate) => {
            const currentDate = moment().endOf('day');
            
            if (startDate.isAfter(currentDate) || endDate.isAfter(currentDate)) {
                return {
                    isValid: false,
                    message: 'Cannot generate report for future dates'
                };
            }
            
            return { isValid: true };
        };

        const dateValidation = validateDates(startDate, endDate);
if (!dateValidation.isValid) {
    return res.status(400).send(dateValidation.message);
}

        // Query orders within the date range
        const report = await Orders.find({
            createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() }
        })
        .populate('userId', 'name email')
        .populate('couponApplied')
        .populate('items.productId')
        .sort({ createdAt: -1 });

        // Initialize metrics object
        const metrics = {
            totalAmount: 0,
            totalOrders: report.length,
            totalItems: 0,
            totalCouponAmount: 0,
            couponsUsed: 0,
            paymentMethods: {},
            orderStatuses: {}
        };

        // Calculate metrics
        report.forEach(order => {
            // Calculate total amount
            metrics.totalAmount += order.totalAmount || 0;

            // Calculate items count
            metrics.totalItems += order.items.reduce((sum, item) => sum + item.quantity, 0);

            // Track payment methods
            metrics.paymentMethods[order.paymentMethod] = 
                (metrics.paymentMethods[order.paymentMethod] || 0) + 1;

            // Track order statuses
            metrics.orderStatuses[order.orderStatus] = 
                (metrics.orderStatuses[order.orderStatus] || 0) + 1;

            // Calculate coupon amounts
            if (order.couponApplied) {
                const couponAmount = calculateCouponDiscount(order);
                metrics.totalCouponAmount += couponAmount;
                metrics.couponsUsed++;
            }
        });

        // Calculate averages
        metrics.avgOrderValue = metrics.totalAmount / metrics.totalOrders || 0;
        metrics.avgItemsPerOrder = metrics.totalItems / metrics.totalOrders || 0;
        metrics.couponUsageRate = (metrics.couponsUsed / metrics.totalOrders * 100) || 0;

        // Prepare chart data
        const chartData = {
            paymentMethodLabels: Object.keys(metrics.paymentMethods),
            paymentMethodData: Object.values(metrics.paymentMethods),
            orderStatusLabels: Object.keys(metrics.orderStatuses),
            orderStatusData: Object.values(metrics.orderStatuses)
        };

        // Helper function for status colors
        const getStatusColor = (status) => {
            const colors = {
                'Ordered': 'primary',
                'Shipped': 'info',
                'Out For Delivery': 'warning',
                'Delivered': 'success',
                'Cancelled': 'danger',
                'Returned': 'secondary',
                'Pending': 'warning',
                'Approved': 'success',
                'Failed': 'danger',
                'payment-Retry': 'warning'
            };
            return colors[status] || 'secondary';
        };

        // Render the report
        res.render('reports', {
            report,
            metrics,
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD'),
            getStatusColor,
            getCouponAmount: calculateCouponDiscount,
            ...chartData 
        });

    } catch (error) {
        console.error('Error generating custom date report:', error);
        res.status(500).send('Error generating custom date report');
    }
};

const calculateCouponDiscount = (order) => {
    if (!order.couponApplied) return 0;
    
    if (order.couponApplied.discountType === 'percentage') {
        return (order.totalAmount * order.couponApplied.discountAmount) / 100;
    } else {
        return Math.min(order.couponApplied.discountAmount, order.totalAmount);
    }
};


const graphData = async (req, res) => {
    try {

        let salesData =
        {
            'labels': [],
            'salesData': [],
            'revenueData': [],
            'productsData': []
        }

        const { filter, time } = req.body

        if (filter === 'monthly') {
            salesData.labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const contraints = {
                $gte: new Date(`${time}-01-01T00:00:00.000Z`),
                $lte: new Date(`${time}-12-31T00:00:00.000Z`)
            }
            const sales = await Orders.aggregate([
                {
                    $match: {
                        createdAt: contraints
                    }
                },
                {
                    $group: {
                        _id: {
                            $month: '$createdAt'
                        },
                        revenueData: {
                            $sum: "$orderAmount"
                        },
                        salesData: {
                            $sum: 1
                        }
                    }
                },
                {
                    $sort: {
                        '_id': 1
                    }
                }
            ])
          
            const products = await Product.aggregate([
                {
                    $match: {
                        createdAt: contraints
                    }
                },
                {
                    $group: {
                        _id: {
                            $month: "$createdAt"
                        },
                        productsData: {
                            $sum: 1
                        }
                    }
                },
                {
                    $sort: {
                        "_id": 1 
                    }
                }
            ])
      
            salesData.salesData = sales.map((item) => item.salesData)
            salesData.revenueData = sales.map((item) => item.revenueData / 1000);
            salesData.productsData = products.map((item) => item.productsData);
        } else {
          
            salesData.labels = [`${time - 10}`, `${time - 9}`, `${time - 8}`, `${time - 7}`, `${time - 6}`, `${time - 5}`, `${time - 4}`, `${time - 3}`, `${time - 2}`, `${time - 1}`, `${time}`];
            const contraints = {
                $gte: new Date(`${time - 10}-01-01T00:00:00.000Z`),
                $lte: new Date(`${time}-12-31T00:00:00.000Z`)
            }

            const sales = await Orders.aggregate([
                {
                    $match: {
                        createdAt: contraints
                    }
                },
                {
                    $group: {
                        _id: {
                            $year: "$createdAt"
                        },
                        revenueData: {
                            $sum: "$orderAmount"
                        },
                        salesData: {
                            $sum: 1
                        }
                    }
                },
                {
                    $sort: {
                        "_id": 1
                    }
                }
            ])
        
            const products = await Product.aggregate([
                {
                    $match: {
                        createdAt: contraints
                    }
                },
                {
                    $group: {
                        _id: {
                            $year: "$createdAt"
                        },
                        productsData: {
                            $sum: 1
                        }
                    }
                },
                {
                    $sort: {
                        "_id": 1
                    }
                }
            ])

          
            for (let key of sales) {
                
                for (let data of salesData.labels) {
                    
                    if (key._id == data) {
                        salesData.salesData.push(key.salesData)
                        salesData.revenueData.push(key.revenueData / 1000)
                    } else {
                        salesData.salesData.push(0)
                        salesData.revenueData.push(0)
                    }
                }
            }

            for (let key of products) {
              
                for(let data of  salesData.labels){
                  

                    if(key._id==data){
                        salesData.productsData.push(key.productsData) 
                    }else{
                        salesData.productsData.push(0)
                    }
                }

            }

        }
        res
        .status(200)
        .json(salesData)


    } catch (error) {
        console.log('error', error)
    }
}


module.exports={
    loadSalesReport,
    dailySalesReport,
    generateWeeklyReport,
    generateMonthlyReport,
    generateYearlyReport,
    generateCustomDateReport,
    graphData
}
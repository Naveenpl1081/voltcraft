
const Order=require("../../models/orderSchema")
const User=require("../../models/userSchema")
const CancelOrder=require('../../models/cancelSchema')
const Wallet=require('../../models/walletSchema')
const Product=require('../../models/productSchema')





const loadOrder = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query; 

        const orders = await Order.find({})
            .populate('userId', 'name email')
            .populate('items.productId', 'name productImage')
            .sort({ orderDate: -1 })
            .limit(limit * 1) 
            .skip((page - 1) * limit); 

        const totalOrders = await Order.countDocuments(); 
        const totalPages = Math.ceil(totalOrders / limit); 

        res.render('orderPage', { 
            orders,
            totalPages,
            currentPage: parseInt(page, 10), 
            limit: parseInt(limit, 10)
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to fetch orders" });
    }
};

const singleOrder = async (req, res) => {
    try {
        // console.log("hello");
        const { orderId } = req.params;
        console.log("Order ID:", orderId);

        
        const orderDetails = await Order.findById(orderId)
            .populate('userId', 'name email mobile') 
            .populate('items.productId', 'productName price productImage'); 

        console.log("Order Details:", orderDetails);

        if (!orderDetails) {
            return res.status(404).send('Order not found');
        }

        res.render('singleOrder', { orderDetails });
    } catch (error) {
        console.error('Error loading user single order:', error.message);
        res.status(500).send('Internal Server Error');
    }
};


const changeStatus=async(req,res)=>{
    const { orderId, status } = req.body;

    console.log("change sttus:",status)
    console.log("orderid:",orderId)
    if (!orderId || !status) {
        return res.status(400).json({ error: 'Order ID and status are required' });
    }

    try {
        
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { orderStatus: status },
            { new: true } 
        );

        if (!updatedOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.status(200).json({
            message: 'Order status updated successfully',
            updatedOrder
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


const loadCancelPage = async (req, res) => {
    try {
        console.log("Loading cancel/return orders...");

        // Fetch all orders with cancel/return status and populate necessary fields
        const canceledOrders = await CancelOrder.find({})
            .sort({ createdAt: -1 })
            .populate('userId', 'name email') // Populate user details
            .populate('orderId') // Populate order details if required
            .populate('canceledItems.productId', 'productName'); // Populate product name for canceled items
        
        // Modify the refundStatus field based on the conditions
        for (const order of canceledOrders) {
            if (order.paymentMethod) {
                if (order.action === 'cancel' && order.paymentMethod.toLowerCase() === 'cod') {
                    order.refundStatus = 'No Refund'; // Set refundStatus to 'No Refund' for COD cancel action
                } else {
                    order.refundStatus = ''; // Clear refundStatus for other cases
                }

                // Save the updated order only if the paymentMethod exists
                await order.save(); // Save the updated refundStatus
            } else {
                console.warn(`Order ${order._id} does not have a paymentMethod.`);
            }

            // Add product details (name and quantity) to each canceled item
            order.canceledItems.forEach(item => {
                if (item.productId) {
                    item.productName = item.productId.productName; // Add product name to the item
                }
                console.log("...........",item.productName)
                item.productQuantity = item.quantity; // Add product quantity to the item
            });
        }

        // console.log("Updated Orders:", canceledOrders);

        // Render the cancel page with fetched data
        res.render('cancelPage', {
            cancelOrders: canceledOrders
        });
    } catch (error) {
        console.error('Error loading cancel page:', error);
        res.status(500).send('Internal Server Error');
    }
};

// const approveOrder=async(req,res)=>{
//     try {
//         const { orderId } = req.params;
//         console.log("......./",orderId)

//         // Find the cancel order by its ID
//         const cancelOrder = await CancelOrder.findById(orderId);
//         console.log("can",cancelOrder)

//         if (!cancelOrder) {
//             return res.status(404).json({ success: false, message: 'Cancel/Return order not found' });
//         }

//         // Update the status of the order to 'Approved'
//         cancelOrder.status = 'Approved'; // You can use a different status like 'Completed' if needed
//         await cancelOrder.save();

//         console.log("helloo",cancelOrder)
//         console.log("lkjhgfdsasdfghjk")

//         // Update the original order's status
//         const order = await Order.findById(cancelOrder.orderId);
//         order.orderStatus = cancelOrder.action === 'return' ? 'Returned' : 'Approved';
//         await order.save();

//         res.json({ success: true, message: 'Order has been approved successfully' });
//     } catch (error) {
//         console.error('Error approving order:', error);
//         res.status(500).json({ success: false, message: 'Internal server error' });
//     }
// }



const approveOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Find the cancel order by its ID
        const cancelOrder = await CancelOrder.findById(orderId).populate('userId');
        if (!cancelOrder) {
            return res.status(404).json({ success: false, message: 'Cancel/Return order not found' });
        }

        // Update the status of the cancel order to 'Approved'
        cancelOrder.status = 'Approved';
        await cancelOrder.save();

        // Update the original order's status
        const order = await Order.findById(cancelOrder.orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Original order not found' });
        }
        order.orderStatus = cancelOrder.action === 'return' ? 'Returned' : 'Approved';
        await order.save();

        // Add refund amount to user's wallet
        let wallet = await Wallet.findOne({ userId: cancelOrder.userId });
        const refundAmount = cancelOrder.totalRefund;

        if (!wallet) {
            // If wallet doesn't exist, create a new wallet for the user
            wallet = new Wallet({
                userId: cancelOrder.userId,
                balance: refundAmount,
                transactions: [{
                    amount: refundAmount,
                    type: 'credit',
                    description: `Refund for ${cancelOrder.action} order`,
                }],
            });
        } else {
            // If wallet exists, update balance and add transaction
            wallet.balance += refundAmount;
            wallet.transactions.push({
                amount: refundAmount,
                type: 'credit',
                description: `Refund for ${cancelOrder.action} order`,
            });
        }

        await wallet.save();

        // if (cancelOrder.status === 'Approved' && cancelOrder.action === 'return') {
        //     console.log("naveen")
        //     for (const canceledItem of cancelOrder.canceledItems) {
        //         const product = await Product.findById(canceledItem.productId); // Fetch the product directly
        //         if (!product) {
        //             return res.status(404).json({ success: false, message: `Product with ID ${canceledItem.productId} not found` });
        //         }

        //         const returnQuantity = canceledItem.quantity; // Use quantity from canceledItems
        //         product.quantity += returnQuantity;
        //         await product.save();
        //     }
        // }

        res.json({ success: true, message: 'Order has been approved and refund added to wallet successfully' });
    } catch (error) {
        console.error('Error approving order:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


const rejectOrder=async(req,res)=>{
    try {
        const { orderId } = req.params;

        // Find the cancel order by its ID
        const cancelOrder = await CancelOrder.findById(orderId);

        if (!cancelOrder) {
            return res.status(404).json({ success: false, message: 'Cancel/Return order not found' });
        }

        // Update the status of the order to 'Rejected'
        cancelOrder.status = 'Rejected';
        await cancelOrder.save();

        // Optionally, update the original order status to 'Rejected' or 'Pending' if needed
        const order = await Order.findById(cancelOrder.orderId);
        order.orderStatus = 'Failed'; // You can set this to another appropriate status
        await order.save();

        res.json({ success: true, message: 'Order has been rejected successfully' });
    } catch (error) {
        console.error('Error rejecting order:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}



module.exports={
    loadOrder,
    singleOrder,
    changeStatus,
    loadCancelPage,
    approveOrder,
    rejectOrder
}
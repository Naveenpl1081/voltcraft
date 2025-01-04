const User=require("../../models/userSchema")





const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || ""; 
        let page = parseInt(req.query.page) || 1; 
        const limit = 5; 

       
        if (page < 1) {
            page = 1;
        }

        
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: `.*${search}.*`, $options: "i" } }, 
                { email: { $regex: `.*${search}.*`, $options: "i" } },
            ],
        })
            .limit(limit) 
            .skip((page - 1) * limit) 
            .exec();

       
        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: `.*${search}.*`, $options: "i" } },
                { email: { $regex: `.*${search}.*`, $options: "i" } },
            ],
        });

        const totalPages = Math.ceil(count / limit);

        
        res.render("userList", {
            users: userData,
            currentPage: page,
            totalPages: totalPages,
            search: search,
        });
    } catch (error) {
        console.error("Error fetching customer info:", error);
        res.status(500).send("Internal Server Error");
    }
};


const userBlock = async (req, res) => {
    try {
        console.log('Entering the userBlock controller');
        const { id } = req.params;

        
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        

        user.isBlocked = !user.isBlocked;
        await user.save();

        
        res.json({
            success: true,
            isBlocked: user.isBlocked,
            message: `User has been ${user.isBlocked ? 'blocked' : 'unblocked'}`,
        });
    } catch (error) {
        console.error('Error toggling block/unblock status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};


module.exports={
    customerInfo,
    userBlock
}
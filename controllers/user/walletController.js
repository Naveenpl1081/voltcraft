const Wallet = require("../../models/walletSchema")// Adjust the path as needed
const User = require('../../models/userSchema')
const walletPage = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById({_id:userId})
        if (!userId) {
            return res.status(401).send("User not authenticated");
        }
        console.log("-------->",user.name);
        
        // Fetch the wallet details for the logged-in user
        const wallet = await Wallet.findOne({ userId: userId });

        if (!wallet) {
            return res.status(404).render("wallet", { 
                wallet: { balance: 0, transactions: [] }, 
                userName: user.name || " "
                 // Handle case where req.user is undefined
            });
        }

        // Render the wallet page with the fetched wallet details
        res.render("wallet", { 
            wallet, 
            userName: user.name // Handle case where req.user is undefined
        });
    } catch (error) {
        console.error("Error fetching wallet details:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = {
    walletPage
};

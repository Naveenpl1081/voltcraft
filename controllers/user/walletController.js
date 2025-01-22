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
        
        
        const wallet = await Wallet.findOne({ userId: userId });

        if (!wallet) {
            return res.status(404).render("wallet", { 
                wallet: { balance: 0, transactions: [] }, 
                userName: user.name || " "
                
            });
        }

        wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

       
        res.render("wallet", { 
            wallet, 
            userName: user.name 
        });
    } catch (error) {
        console.error("Error fetching wallet details:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = {
    walletPage
};

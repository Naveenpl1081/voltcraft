const User=require('../models/userSchema')


const ifLogout = async(req,res,next)=>{
    try {
      if(req.session.admin){
        return next()
      }else{
        res.redirect("/admin/login")
      }
    } catch (error) {
      console,log(error)
    }
  }


  const checkUserBlocked = async (req, res,next) => {
    try {
        if (!req.session.userId) {
            return res.redirect('/login'); // Redirect if not logged in
        }

        const user = await User.findById(req.session.userId);

        if (!user || user.isBlocked) {
            req.session.destroy((err) => {
                if (err) {
                    console.error('Error destroying session:', err);
                }
                return res.redirect('/login'); // Redirect to login if user is blocked
            });
        }

        next()
    } catch (error) {
        console.error('Error in checkUserBlocked middleware:', error);
        res.status(500).send('Internal Server Error');
    }
};

  
  module.exports = {
    ifLogout,
    checkUserBlocked
    
  }


const ifLogged = async (req, res, next) => {
    try {
      if (req.session && req.session.isAuth) {
        return res.redirect("/homePage");
      }
      next();
    } catch (error) {
      console.error(error);
      next(error);
    }
  };



  const ifLogout = async(req,res,next)=>{
    try {
      if(req.session.userId){
        return next()
      }else{
        res.redirect("/login")
      }
    } catch (error) {
      console,log(error)
    }
  }


  




  module.exports = {
    ifLogged,
    ifLogout,
    
    
  };

 
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

  module.exports = {
    ifLogout,
  }
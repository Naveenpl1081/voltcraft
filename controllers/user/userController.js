const User=require("../../models/userSchema")
const nodemailer=require("nodemailer")
const env=require("dotenv").config
const bcrypt=require("bcrypt")
const Products = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Product = require("../../models/productSchema");
const { findById } = require("../../models/userSchema");
const { findByIdAndUpdate } = require("../../models/productSchema");
const Address=require("../../models/addressSchema")




const loadHomePage = async (req,res)=>{
    try {
      return res.render("homeWithout")
    } catch (error) {
     console.log("not found")
     res.status(500).send("server error")
 }
 }

const signupPage=async(req,res)=>{
    try {
      return res.render('signup') 
    } catch (error) {
        console.log(error)
    }
}

const homePage=async(req,res)=>{
    try {
        if(!req.session.isAuth){
           return res.redirect("/")
        }
        
        const products = await Products.find({isBlocked:false,status:'Available'});
        const category=await Category.find({});
        console.log('category:',category);
         res.render('homePage',{products,category})
    } catch (error) {
        console.log(error)
    }
}

function generateOtp(){
    return Math.floor(100000+Math.random()*90000).toString();
}

async function sendVerificationEmail(email,otp){
try {
    const transporter=nodemailer.createTransport({
        service:"gmail",
        port:587,
        secure:false,
        required:true,
        auth:{
            user:process.env.NODEMAILER_EMAIL,
            pass:process.env.NODEMAILER_PASSWORD
        }
    })

    const info=await transporter.sendMail({
        from:process.env.NODEMAILER_EMAIL,
        to:email,
        subject:"Verify your account",
        text:`your OTP is ${otp}`,
        html:`<b>your OTP: ${otp}</b>`,

    })
    console.log(info);
    return info.accepted.length>0
} catch (error) {
    console.error("error sending email",error)
    return false
}
}

const signup=async(req,res)=>{
    try {
        // console.log("hello")
        const {name,email,password,cpassword}=req.body
        console.log(email,password, cpassword)
        if(password!==cpassword){
            return res.render("signup",{message:"password do not match"})
        }
            const finduser=await User.findOne({email});

            if(finduser){
                return res.render("signup",{message:"user with this email already exixts"});
            }

            const otp=generateOtp();
            console.log(otp)
            const emailsent=await sendVerificationEmail(email,otp);
            if(!emailsent){
                return res.json("email-error")
            }

            req.session.userOtp=otp;
            req.session.userDate={name,email,password};

           
            console.log("OTP",otp)
            console.log(req.session.userDate)
            return res.redirect('/verify-otp');

    }catch (error) {
       console.error("signup error",error)
       res.redirect("/pagenotfiund")
    }
}

const securepassword=async (password)=>{
    try {
        const passwordHash=await bcrypt.hash(password,10)
        return passwordHash;
    } catch (error) {
        
    }
}

const getOtp = (req,res) => {
    try {
       return res.render('otp');
    } catch (error) {
        console.log(error)
    }
}

const verifyotp = async (req, res) => {
    try {
        const { otp } = req.body;
        
        if (!otp || otp !== req.session.userOtp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP. Please try again"
            });
        }

        const userData = req.session.userDate;
        const passwordHash = await securepassword(userData.password);

        const saveUserData = new User({
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            password: passwordHash,
        });

        await saveUserData.save();
        req.session.userId = saveUserData._id;
        req.session.isAuth=true;

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully",
            redirectUrl: "/homePage"
        });

    } catch (error) {
        console.error("Error verifying OTP:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while verifying OTP"
        });
    }
}

const resendOtp = async (req, res) => {
    try {
        const userData = req.session.userDate;
        if (!userData || !userData.email) {
            return res.status(400).json({
                success: false,
                message: "Email not found in session"
            });
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(userData.email, otp);
        
        if (emailSent) {
            console.log("Resent OTP:", otp);
            return res.status(200).json({
                success: true,
                message: "OTP resent successfully"
            });
        } else {
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP. Please try again"
            });
        }
    } catch (error) {
        console.error("Error resending OTP:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

const loadLogin=async(req,res)=>{
    try {
    return res.render('login');
    } catch (error) {
      console.error(error)
    }
}

const login=async(req,res)=>{
    try {
        const {email,password}=req.body;
        console.log(req.body)
        const findUser=await User.findOne({isAdmin:0,email:email});
        if(!findUser){
            return res.render("login",{message:"user not found"})

        }
        if(findUser.isBlocked){
            return res.render("login",{message:"user is blocked by admin"})
        }

        const passwordMatch=await bcrypt.compare(password,findUser.password);
        if(!passwordMatch){
            return res.render("login",{message:"incorrect password"})

        }
        req.session.userId=findUser._id;
        req.session.isAuth=true;
        console.log('session after login:',req.session);
        return res.redirect("/homePage")
    } catch (error) {
        console.error("login error",error)
    }
}

const logout = async (req, res) => {
    try {
        
        req.session.destroy((err) => {
            if (err) {
                console.log("Logout error", err);
                return res.status(500).send("Error logging out");
            }
            
            res.clearCookie('connect.sid'); 
            return res.redirect('/login');
        });
    } catch (error) {
        console.log("Logout error", error);
        res.status(500).send("Server error during logout");
    }
}


const getProductDetails = async (req,res) => {
    try {
        const { id } = req.params;
        const product = await Products.findById(id);
        const products=await Product.find()
        const relatedProducts = await Product.find({ category: product.category, isBlocked: false });
        console.log("jhgdfghjk",product.quantity)
        

        res.render('singleProduct', {product,products,productQuantity: product.quantity,relatedProducts})
    } catch (error) {
        console.log(error.message)
    }
}

const findbycategory= async(req,res)=>{
    try {
        console.log('entering into the findbycategory');
        const id = req.query.categoryId
        console.log('id:',id);
        const product=await Product.find({category:id,status:'Available',isBlocked:false});
        console.log('product:',product);
        res.render('products',{product})
    } catch (error) {
        console.log(error)
    }
}

const loadUserProfile = async (req, res) => {
    try {
        let userId = req.session.userId;
        console.log('userId:',userId);
        let user = await User.findById({_id:userId});
        console.log('user:',user);
        res.render("profilePage",{user});
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).send("An error occurred while loading the profile page.");
    }
};




const loadAddressBook = async (req, res) => {
    try {
        const userId = req.session.userId;
        console.log(userId  )
        if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated.' });

        const recentAddress = await Address.find({ userId }).sort({ createdAt: -1 });

        console.log("Recent Address ======> ", recentAddress);

        if (!recentAddress) {
            return res.render("addressBook", { recentAddress: [] }); 
        }

        res.render("addressBook", { recentAddress: recentAddress }); 
    } catch (error) {
        console.error("Error loading address book:", error);
        res.status(500).send("Internal Server Error");
    }
};



const loadNewPassword=async(req,res)=>{
    try {
        res.render("newPassword")
    } catch (error) {
        console.log(error)
    }
}


const changePassValid = async (req, res) => {
    try {
        const userId = req.session.userId;
        console.log("userId:", userId);

        const userExist = await User.findOne({ _id: userId });
        console.log("user:", userExist);

        const { currentpass, newpass, confirmpass } = req.body;

        if (newpass !== confirmpass) {
            return res.status(400).json({ success: false, message: "New password and confirm password do not match." });
        }

        bcrypt.compare(currentpass, userExist.password, async (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: "Error comparing passwords." });
            }

            if (result) {
                const saltRounds = 10; 
                const hashedPassword = await bcrypt.hash(newpass, saltRounds);

                userExist.password = hashedPassword;
                await userExist.save();

                return res.status(200).json({ success: true, message: "Password changed successfully!" });
            } else {
                console.log("Current password does not match.");
                return res.status(400).json({ success: false, message: "Current password is incorrect." });
            }
        });
    } catch (error) {
        console.error("Error in change password validation:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
};







const addressverify = async (req, res) => {
    try {
        const { name, number, addressone, addresstwo, city, state, email, country } = req.body;
        console.log("kkk",name)
        const userId=req.session.userId

        // Validate the incoming data on the server side
       
        // Create a new address object
        const newAddress = new Address({
            fullName: name,
            phone: number,
            addressLine1: addressone,
            addressLine2: addresstwo,
            city,
            state,
            email,
            country,
            userId,
        });
        console.log(",.,",newAddress)

        // Save the address and update the user's address list
        await newAddress.save();
        await User.findByIdAndUpdate(userId, { $push: { addresses: newAddress._id } });

        res.status(200).json({ message: "Address saved successfully!" });
    } catch (error) {
        console.error('Error saving address:', error);
        res.status(500).json({ message: 'Something went wrong.' });
    }
};

// Assuming you're using Express.js and a templating engine like EJS
const addressverifyy=async (req, res) => {
    try {
        console.log("heelo")
        const userId = req.session.userId;
        if (!userId) return res.status(401).send('User not authenticated.');

        // Fetch the user's existing address from the database
        const user = await User.findById(userId).populate('addresses');
        const address = user.addresses[0]; // Assuming the user has one address for simplicity
        console.log("addreeeeeeee",address)

        // Render the form with the existing address data
        res.redirect("/addressBook");
    } catch (error) {
        console.error('Error fetching address:', error);
        res.status(500).send('Something went wrong.');
    }
};


const deleteAddress = async (req, res) => {
    const addressId = req.params.id;
   console.log("addressId====>",addressId)

    try {
        
        const result = await Address.findByIdAndDelete(addressId);

        if (result) {
            return res.status(200).json({ success: true, message: 'Address deleted successfully' });
        } else {
            return res.status(404).json({ success: false, error: 'Address not found' });
        }
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

const getEditPage = async (req, res) => {
    try {
      console.log('editing start');
      const adressId = req.query.id
      console.log(adressId);
      const addData = await Address.findById({ _id: adressId })
      console.log(addData);
      if (addData) {
        res.render('editAddress', { address: addData })
      } else {
        res.redirect('/admin/addressbook')
      }
  
    } catch (error) {
      console.log('error loading edit cat page');
      console.log(error);
    }
  }

  const editAddress = async (req, res) => {
    try {
        console.log("entering edit address post")
        console.log("req body", req.body);
        

        const { id,name, number, addressone, addresstwo, city, state, email, country } = req.body;

        
        const updatedAddress = await Address.findByIdAndUpdate(
            {_id:id},
            { fullName: name,
                phone: number,
                addressLine1: addressone,
                addressLine2: addresstwo,
                city: city,
                state: state,
                email: email,
                country: country,
                },
            { new: true }
        );

        console.log('Address updated:', updatedAddress);

        
        return res.redirect('/addressbook');
    } catch (error) {
        console.error('Error editing category:', error);
        res.redirect('/addressbook');
    }
};

const viewAllProduct = async (req, res) => {
    try {
        // Fetch all products
        const products = await Product.find({});

        // Fetch sold products sorted by 'sold' field and populate 'category'
        const sold = await Product.find({}).sort({ sold: -1 }).populate('category');
        
        // Optional chaining ensures no errors if category is not populated
        if (products.length > 0) {
            console.log('products[0].category.name', products[0]?.category?.name);
        }

        // Send the data as JSON response
        res.status(200).json({ products, sold, success: true });
    } catch (error) {
        console.log('Error loading product page');
        console.log(error);
        res.status(500).json({ error: 'Error loading products' });
    }
};



const viewAllProductsPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;  // Default to page 1
        const limit = 10;  // Number of products per page
        const skip = (page - 1) * limit;  // Calculate the number of products to skip

        const query = req.query.query || ''; // Initialize query (default to an empty string)

        // Fetch products with pagination
        const products = await Product.find({ isBlocked: false })
            .skip(skip)
            .limit(limit);

        // Count total products to calculate total pages
        const totalProducts = await Product.countDocuments({ isBlocked: false });
        const totalPages = Math.ceil(totalProducts / limit);

        // Render the 'allProducts' view with paginated products and total pages
        res.render('allProducts', { products, totalPages, currentPage: page, query });
    } catch (error) {
        console.error('Error loading products page:', error);
        res.status(500).send('Error loading products');
    }
};


const getAllProducts = async (req, res) => {
    try {
        const { sort, page = 1 } = req.query;
        const limit = 10;  // Number of products per page
        const skip = (page - 1) * limit;  // Calculate the number of products to skip
        const query = req.query.query || ''; 
        let sortCriteria = {};
        switch (sort) {
            case 'a-z':
                sortCriteria = { productName: 1 };
                break;
            case 'z-a':
                sortCriteria = { productName: -1 };
                break;
            case 'low-to-high':
                sortCriteria = { salePrice: 1 };
                break;
            case 'high-to-low':
                sortCriteria = { salePrice: -1 };
                break;
            default:
                sortCriteria = {};
        }

        // Fetch products with pagination and sorting
        const products = await Product.find({ isBlocked: false })
            .sort(sortCriteria)
            .skip(skip)
            .limit(limit);

        // Count total products to calculate total pages
        const totalProducts = await Product.countDocuments({ isBlocked: false });
        const totalPages = Math.ceil(totalProducts / limit);

        // Render the 'allProducts' view with products, total pages, and current page
        res.render('allProducts', { products, totalPages, currentPage: page,query });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Internal Server Error');
    }
};



const searchProducts = async (req, res) => {
    try {
        const { query } = req.query;

        let products;
        if (query) {
            // Search products by name or description
            products = await Product.find({
                isBlocked: false,
                $or: [
                    { productName: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } }
                ]
            });
        } else {
            // Show all products if no query
            products = await Product.find({ isBlocked: false });
        }

        res.render('allProducts', { products, query }); // Pass query to the view
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).send('Internal Server Error');
    }
};



const updateUserProfile = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { name } = req.body;

        // Server-side validation
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User is not authenticated' });
        }

        if (!name || name.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Name must be at least 3 characters long' });
        }

        // Find the user and update only the name field
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name },  // Only update the name field
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, message: 'Profile updated successfully', user: updatedUser });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


module.exports={
    loadHomePage,
    signupPage,
    signup,
    verifyotp,
    getOtp,
    homePage,
    resendOtp,
    loadLogin,
    login,
    logout,
    getProductDetails,
    findbycategory,
    loadUserProfile,
    loadAddressBook,
    loadNewPassword,
    changePassValid,
    addressverify,
    deleteAddress,
    editAddress,
    getEditPage,
    viewAllProduct,
    getAllProducts,
    searchProducts,
    updateUserProfile,
    viewAllProductsPage,
    addressverifyy
    
}






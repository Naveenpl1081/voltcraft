const express=require("express")
const app=express()
const connectDB=require('./db/connectDB')
const path = require('path')
const dotenv = require('dotenv');
const session=require("express-session")
const passport=require("./db/passport")
const userRouter=require("./routes/userRouter")
const adminRouter=require("./routes/adminRouter");
const multer = require('multer');
const paypal=require('paypal-rest-sdk')
const nocache = require('nocache');
const { checkUserBlocked } = require("./middleware/adminAuth");
dotenv.config();


const port = process.env.PORT || 4000

connectDB()

app.use(express.static(path.join(__dirname,'public')));





app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*1000
    }
}))


paypal.configure({
    mode: "sandbox", // Use "sandbox" for testing, "live" for production
    client_id: process.env.PAYPAL_CLIENT_ID,
    client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

app.set("view engine","ejs");
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')]);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use(nocache());




app.use("/",userRouter);
app.use("/admin",adminRouter)
app.use(checkUserBlocked)

app.listen(port,()=>{
    console.log(`server running on http://localhost:${port}`)
})


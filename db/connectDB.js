const mongoose=require('mongoose');
require('dotenv').config();


const MONGO_URL= process.env.MONGO_URL;
const connectDB=async()=>{
    try {
        const connect=await mongoose.connect(MONGO_URL)
        console.log(`MongoDB Connected`);
    } catch (error) {
        console.log(error)
        process.exit (1);
    }
}


module.exports=connectDB;






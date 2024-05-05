const port = 4000;
const express = require('express');
const app = express(); //creating app instance using express
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); //for generation and verification of token
const multer = require('multer'); //for image upload and storage
const path = require('path'); //to get access to backend directory in our express app
const cors = require('cors');//to provide access to react project
const { type } = require('os');
const { error } = require('console');


app.use(express.json()); //with help of express.json all request we receive will be passed on to json
app.use(cors()); //react js project will connect to express app on 4000 port(react frontend connect to backend)

//Databse connection with mongodb
mongoose.connect("mongodb+srv://khanzain192001:Zain2002@cluster0.fevhwyg.mongodb.net/e-commerce");

//API CREATION

app.get("/",(req,res)=>{
    res.send("Express app is running")
})

// Image storage engine
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        // Generate unique filename
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage }); // Uploading the storage (above variable)

// Creating upload endpoint for images
app.use('/images', express.static(path.join(__dirname, 'upload', 'images')));

// We will upload an image to the /upload endpoint
app.post("/upload", upload.single('product'), (req, res) => {
    if (!req.file) {
        // If no file is uploaded
        return res.status(400).json({ success: 0, message: "No file uploaded" });
    }
    res.json({
        success: 1, // If image successfully uploads it will respond with 1
        image_url: `https://zakzingbackend.onrender.com/images/${req.file.filename}`
    });
});

//Schema for creating products
const Product = mongoose.model("Product",{
    id:{
        type: Number,
        required:true, //true as in we wont be able to upload a product without id

    },
    name:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    new_price:{
        type:Number,
        required:true,
    },
    old_price:{
        type:Number,
        required:true,
    },
    date:{
        type:Date,
        default:Date.now,
    },
    available:{
        type:Boolean,
        default:true,
    },
})
//adding product in database
//value will be inputed from req
app.post('/addproduct',async(req,res)=>{
    let products = await Product.find({}); //adding all products in one array
    let id;
    if(products.length>0){
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id+1; //increment id by one
    }
    else{
        id=1;
    }
    const product = new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
    });
    console.log(product);
    //to save in database
    //await mean it will take time
    await product.save();
    console.log("Saved");

    //in frontend response
    res.json({
        success:true,
        name:req.body.name,
    })
})

//creating api for deleting products

app.post('/removeproduct',async(req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success:true,
        name:req.body.name
    })
})

//Creating API for getting all products from databse
app.get('/allproducts',async(req,res)=>{
    let products = await Product.find({}); //in it we will get all products
    console.log("All products fetched");
    res.send(products);
})

//creating user schema
const Users = mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})

//Creating endpoint for registering the user
app.post('/signup',async (req,res)=>{
    //check it email is already there in databse
    let check = await Users.findOne({email:req.body.email});
    if(check){
        return res.status(400).json({success:false,errors:"Existing user found with same email address"})
    }
    let cart = {};
    for(let i = 0;i<300;i++){
        cart[i]=0;
    }
    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
    });

    //saving user in database
    await user.save();

//creating token using data object
    const data = {
        user:{
            id:user.id
        }
    }

    const token = jwt.sign(data,'secret_ecom'); //salt : secret_ecom : creates a 1 layer encrpytion
    res.json({success:true,token})
})

//creating end point for user login
app.post('/login',async (req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true,token});
        }
        else{
            res.json({success:false,error:"Wrong Password"});
        }
    }
    else{
            res.json({success:false,error:"Wrong email id"});
    }
})

//creating endpoint for home page /new collection
app.get('/newcollections',async(req,res)=>{
    //all product saved in products array
    let products = await Product.find({});

    //will get recently added 8 products
    let newcollection = products.slice(1).slice(-8);
    console.log("new collections fetched");
    res.send(newcollection);

})
//creaeting endpoint for popular in womens
app.get('/popularinwomen',async(req,res)=>{
    let products = await Product.find({category:"women"});
    let popular_in_women = products.slice(0,4);
    console.log("Popular in women fetched");
    res.send(popular_in_women);
})

//creating middleware to fetch user
    const fetchUser = async(req,res,next)=>{
        const token = req.header('auth-token');
        if(!token){
            res.status(401).send({errors:"Please authenticate using valid token"})
        }
        else{
            try{
                const data = jwt.verify(token,'secret_ecom');
                req.user = data.user;
                next();
            }catch(error){
                res.status(401).send({errors:"Please authenticate using a valid token"})
            }
        }
    }

//creating end point for adding product in cart data
app.post('/addtocart',fetchUser,async(req,res)=>{
    console.log("Added",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId]+= 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Added")

})

//creating endpoinnt to remove product from cartdata
app.post('/removefromcart',fetchUser,async(req,res)=>{
    console.log("removed",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId]-= 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Removed")
})
//creating endpoint to get user data login
app.post('/getcart',fetchUser,async(req,res)=>{
    console.log('Get cart');
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
})



//to listen to the backend
app.listen(port,(error)=>{
    if(!error){
        console.log("Server running on port : "+port)
    }
    else{
        console.log("Error : "+error)
    }
}) 

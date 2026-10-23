const { default: mongoose } = require("mongoose");
const { type } = require("node:os");


const CategorySchema =  new mongoose.Schema({

    Name:{
        type:String,
        enum:["support","general","it"],
        default:"general"
    },
    Description:{
        type:String,

    },
    IsActive:{
        type:Boolean,
        default:false
    },

},{
    timestamps:true
});

module.exports= mongoose.module("CATEGORY",CategorySchema)
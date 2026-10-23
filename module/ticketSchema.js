const { default: mongoose } = require("mongoose");

const ticketSchema = new mongoose.Schema({


    TicketNumber: {
        type: String,
        required: true,
        unique: true,
    },
    Subject: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    Description: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    RequesterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "USER",
        required: true,
    },
    RequesterEmail: {
        type: String,
        required: true
    },
    AssignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "USER",
        
    },
    Assigned:{
        type:Boolean,
        defaul:false
    },
    Category: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"CATEGORY",
    },
    Messages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "TICKETMESSAGE"
    }],
    Priority: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
        default: "medium",
    },
    Status: {
        type: String,
        enum: ["open", "in_progress", "resolved", "closed"],
        default: "open",
    },
    LastMessageAt: {
        type: Date,
        default: Date.now(),
    },
    ResolvedAt: {
        type: Date,
        default: null
    },
    ClosedAt: { 
        type: Date,
        default: null
    }

},
    {
        timestamps: true
    }

);

module.exports = mongoose.model("TICKET", ticketSchema)
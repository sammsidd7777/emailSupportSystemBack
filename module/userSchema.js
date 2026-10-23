const mongoose = require("mongoose")


const userSchema = new mongoose.Schema({

    Name: {
        type: String,
        required: true
    },
    Email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    Phone: {
        type: Number,
        required: true
    },
    PasswordHash: {
        type: String,
        required: true
    },
Role: {
  type: String,
  enum: ["customer", "supportAgent", "admin"],
  default: "customer",
},

AgentRole: {
  type: String,
  enum: ["support", "general", "support"],
  default: "general",
},
    IsVerified: {
        type: Boolean,
        default: false
    },
    OtpHash: {
        type: String,
        default: null
    },
 

OtpPurpose: {
  type: String,
  enum: ["login", "reset-password", null],
  default: null,
},
    OtpExpiresAt: {
        type: Date,
        default: null
    },
    RefreshToken: {
        type: String,
        default: null
    }

},
    {
        timestemp: true
    }

)

module.exports = mongoose.model("USER", userSchema)
const { decode } = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const USER = require("../module/userSchema");
const jwt = require("jsonwebtoken");

const protect = async (req, res, next) => {

    try {

        const token = req?.cookies?.token || req?.cookies?.jwt;

        if (!token) {
            return next(new AppError("please login again", 401))
        };

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

       const user = await USER.findById(decoded.id);

    if (!user) {
      return next(
        new AppError("User not found", 401)
      );
    }

    req.user = user;

    return next();



    } catch (error) {
        return next(new AppError(error, 400))
    }
};


const authorize = (role) => {
  return async (req, res, next) => {
    try {
      const user = await USER.findById(req.user?._id);

      

      if (!user) {
        return next(new AppError("User not found", 404));
      }

      if (user.Role !== role) {
        return next(new AppError("You are not authorized", 403));
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};


module.exports={protect,authorize}
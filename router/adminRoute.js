const express = require("express");
const {adminDashboard,userList,makeAgent,removeAgent,deleteUser,agentList} = require("../controller/adminController");

const router = express.Router();

router.get("/dashboard",adminDashboard);
router.get("/userList",userList);
router.get("/agentList",agentList);

router.post("/makeAgent/:userId",makeAgent);
router.post("/removeAgent/:userId",removeAgent);
router.delete("/deleteUser/:userId",deleteUser);


module.exports= router;
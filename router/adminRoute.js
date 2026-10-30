const express = require("express");
const {adminDashboard,userList,makeAgent,removeAgent,deleteUser,agentList, autoAssignTickets, bulkAssignTickets} = require("../controller/adminController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/dashboard",adminDashboard);
router.get("/userList",userList);
router.get("/agentList",agentList);

router.post("/makeAgent/:userId",makeAgent);
router.post("/removeAgent/:userId",removeAgent);
router.delete("/deleteUser/:userId",deleteUser);

router.put("/tickets/auto-assign",protect,autoAssignTickets);
router.put("/tickets/bulk-assign" , protect,bulkAssignTickets)



module.exports= router;
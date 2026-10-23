const TICKETMESSAGE = require("../module/ticketMessageSchema");
const TICKET = require("../module/ticketSchema");
const AppError = require("../utils/AppError");
const USER = require("../module/userSchema");


const createMessage = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { content } = req.body;
    const senderId = req.user?._id;

    if (!senderId) {
      return next(new AppError("Authentication required.", 401));
    }

    if (!content || typeof content !== "string") {
      return next(new AppError("Message content is required.", 400));
    }

    const ticket = await TICKET.findById(ticketId);

    if (!ticket) {
      return next(new AppError("Ticket not found.", 404));
    }

    const message = new TICKETMESSAGE({
      content,
      sender: senderId,
      ticket: ticketId,
    });

    await message.save();

    // Add the message to the ticket's messages array
    ticket.Messages.push(message._id);
    await ticket.save();

    return res.status(201).json({
      success: true,
      message: "Message created successfully.",
      data: message,
    });
  } catch (error) {
    return next(error);
  }
};

const getMessagesByTicketId = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return next(new AppError("Authentication required.", 401));
    }

    console.log(userId, "userId in getMessagesByTicketId");

    const user = await USER.findById(userId);


    const ticket = await TICKETMESSAGE.find({"TicketId":ticketId});

    return res.status(200).json({
        message:ticket
    }) 

    if (!ticket) {
      return next(new AppError("Ticket not found.", 404));
    }







 if(ticket.RequesterId.equals(req.user._id)){


// true){

    return res.status(200).json({
      success: true,
      messages: ticket.Messages,
    });
 };
console.log(ticket?.AssignedTo == user._id,"assint match",ticket?.AssignedTo , user._id)

 if(ticket?.AssignedTo.equals(user._id)){
     return res.status(200).json({
      success: true,
      messages: ticket.Messages,
    });
 }



return next(new AppError("or credinatil not matching",400))

  
 
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createMessage,
  getMessagesByTicketId,
};
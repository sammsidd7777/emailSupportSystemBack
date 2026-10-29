
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const chatWithAI = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter a message.",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "AI service is not configured.",
      });
    }

    // Keep conversation history limited and accept only valid messages.
    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              ["user", "assistant"].includes(item.role) &&
              typeof item.content === "string"
          )
          .slice(-10)
          .map((item) => ({
            role: item.role,
            content: item.content.slice(0, 3000),
          }))
      : [];

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      instructions: `
You are the AI support assistant for an email ticketing system.

Your responsibilities:
- Understand the customer's issue.
- Ask clear follow-up questions when needed.
- Provide practical troubleshooting steps.
- Keep replies friendly, concise, and professional.
- Never claim that you have accessed an account, database, or ticket unless a tool actually confirms it.
- Never claim that an issue is resolved unless the customer confirms it.
- If the problem needs human intervention, recommend creating a support ticket.
- Do not request passwords, OTPs, API keys, or other secrets.
      `,
      input: [
        ...safeHistory,
        {
          role: "user",
          content: message.trim().slice(0, 5000),
        },
      ],
      max_output_tokens: 500,
    });

    return res.status(200).json({
      success: true,
      reply: response.output_text,
    });
  } catch (error) {
    
    console.error("OpenAI API Error:", {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to get an AI response. Please try again.",
    });
  }

    return res.status(500).json({
      success: false,
      message: "Unable to get an AI response. Please try again.",
    });
  }
};

module.exports = { chatWithAI };

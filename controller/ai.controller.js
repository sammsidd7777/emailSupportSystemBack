const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
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

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Gemini API key is not configured.",
      });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              ["user", "assistant"].includes(item.role) &&
              typeof item.content === "string",
          )
          .slice(-10)
          .map((item) => ({
            role: item.role === "assistant" ? "model" : "user",
            parts: [{ text: item.content.slice(0, 3000) }],
          }))
      : [];

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.7-flash",
      contents: [
        ...safeHistory,
        {
          role: "user",
          parts: [{ text: message.trim().slice(0, 5000) }],
        },
      ],
      config: {
        systemInstruction: `
You are a helpful customer support assistant.

- Understand the customer's issue.
- Give clear, practical troubleshooting steps.
- Be polite and concise.
- Never ask for passwords, OTPs, or API keys.
- Never claim an issue is resolved without confirmation.
- If the issue needs human support, suggest creating a support ticket.
- Do not claim to access tickets or customer accounts.
        `,
        maxOutputTokens: 500,
      },
    });

    const reply = response.text;

    if (!reply) {
      return res.status(502).json({
        success: false,
        message: "Gemini did not return a text response.",
      });
    }

    return res.status(200).json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("Gemini API Error:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to get an AI response. Please try again.",
    });
  }
};

// services/geminiService.js

const generateAIReply = async (message, history = []) => {
  if (!message || typeof message !== "string") {
    throw new Error("A valid message is required.");
  }

  try {
   

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter a message.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Gemini API key is not configured.",
      });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              ["user", "assistant"].includes(item.role) &&
              typeof item.content === "string",
          )
          .slice(-10)
          .map((item) => ({
            role: item.role === "assistant" ? "model" : "user",
            parts: [{ text: item.content.slice(0, 3000) }],
          }))
      : [];

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.7-flash",
      contents: [
        ...safeHistory,
        {
          role: "user",
          parts: [{ text: message.trim().slice(0, 5000) }],
        },
      ],
      config: {
        systemInstruction: `
You are a helpful customer support assistant.

- Understand the customer's issue.
- Give clear, practical troubleshooting steps.
- Be polite and concise.
- Never ask for passwords, OTPs, or API keys.
- Never claim an issue is resolved without confirmation.
- If the issue needs human support, suggest creating a support ticket.
- Do not claim to access tickets or customer accounts.
        `,
        maxOutputTokens: 500,
      },
    });

    const reply = response.text;

    if (!reply) {
      return res.status(502).json({
        success: false,
        message: "Gemini did not return a text response.",
      });
    }

    return res.status(200).json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("Gemini API Error:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to get an AI response. Please try again.",
    });
  }
};



module.exports = { chatWithAI ,generateAIReply};

const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {
      fname,
      lname,
      email,
      role,
      subject,
      message,
    } = req.body;

    if (!email || !message) {
      return res.status(400).json({
        success: false,
        message: "Email and Message are required",
      });
    }

    const text = `
NEW CONTACT FORM

Name: ${fname} ${lname}
Email: ${email}
Role: ${role}
Subject: ${subject}
Message:
${message}
`;

    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text,
        }),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      throw new Error("Telegram message failed");
    }

    res.json({
      success: true,
      message: "Message sent successfully",
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

module.exports = router;
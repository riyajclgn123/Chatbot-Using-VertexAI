require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const { VertexAI } = require("@google-cloud/vertexai");

const app = express();

app.use(
  cors({
    origin: "https://riyaj-utensils-shop.vercel.app",
    methods: ["POST"],
    credentials: true,
  })
);

app.use(express.json());

// Vertex AI Setup
const projectId = "riyaj-utensils-shop-18067";
const location = "us-central1";
const modelName = "gemini-2.0-flash-001";

const vertexAI = new VertexAI({ project: projectId, location });
const generativeModel = vertexAI.getGenerativeModel({ model: modelName });

let shopContext = "";


(async () => {
  try {
    const dataBuffer = fs.readFileSync("riyaj_catalog.pdf");
    const pdfData = await pdfParse(dataBuffer);
    shopContext = pdfData.text.slice(0, 30000); // Limit to avoid Gemini context cutoff
    console.log("Yes,  PDF loaded into memory");
  } catch (err) {
    console.error("Sorry, Failed to load PDF context:", err.message);
  }
})();


app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const prompt = `You are a helpful assistant for a utensils shop in Nepal. Use the following product catalog to answer the user's question.\n\nCatalog:\n${shopContext}\n\nUser Question: ${message}`;

    const chat = generativeModel.startChat({});
    const result = await chat.sendMessageStream(prompt);

    let responseText = "";
    for await (const item of result.stream) {
      const part = item?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (part) responseText += part;
    }

    return res.json({ reply: responseText });
  } catch (error) {
    console.error("Vertex AI Error:", error.message);
    return res.status(500).json({ error: "Failed to generate response" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

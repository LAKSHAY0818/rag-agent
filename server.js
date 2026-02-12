import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY
});

/* ==========================
   📄 LOAD KNOWLEDGE BASE
========================== */

const documents = JSON.parse(
  fs.readFileSync("./data/knowledge.json", "utf-8")
);

/* ==========================
   🧠 CHAT MEMORY STORE
========================== */

const conversations = {}; // stores chat history per user

/* ==========================
   🧠 EMBEDDING STORAGE
========================== */

let storedDocs = [];

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

async function prepareEmbeddings() {
  storedDocs = [];

  for (let doc of documents) {
    const res = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: doc
    });

    storedDocs.push({
      text: doc,
      vector: res.embeddings[0].values
    });
  }
}

await prepareEmbeddings();

/* ==========================
   💬 CHAT ENDPOINT
========================== */

app.post("/chat", async (req, res) => {
  try {
    const { message, userId = "default" } = req.body;
    const lower = message.toLowerCase().trim();

    /* ========= INIT MEMORY ========= */

    if (!conversations[userId]) {
      conversations[userId] = [];
    }

    // Save user message
    conversations[userId].push({
      role: "user",
      content: message
    });

    // Keep only last 10 messages
    if (conversations[userId].length > 10) {
      conversations[userId] = conversations[userId].slice(-10);
    }

    /* ========= GREETING ========= */

    if (["hi", "hello", "hey", "hii"].includes(lower)) {
      return res.json({
        reply:
          "Hi 👋 I’m Lakshay’s AI Agent. Ask me anything about him — respectfully."
      });
    }

    /* ========= SMART NON-LAKSHAY QUESTIONS ========= */

    if (
      lower.includes("president") ||
      lower.includes("prime minister") ||
      lower.includes("capital of") ||
      lower.includes("weather")
    ) {
      return res.json({
        reply:
          "I’m Lakshay’s personal AI. For general knowledge, Google exists. If you're here for Lakshay, ask properly."
      });
    }

    /* ========= SEMANTIC SEARCH ========= */

    const questionEmbedding = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: message
    });

    const questionVector = questionEmbedding.embeddings[0].values;

    const scoredDocs = storedDocs.map(doc => ({
      text: doc.text,
      score: cosineSimilarity(questionVector, doc.vector)
    }));

    scoredDocs.sort((a, b) => b.score - a.score);

    const context = scoredDocs.slice(0, 5).map(d => d.text).join("\n");

    /* ========= BUILD MEMORY CONTEXT ========= */

    const chatHistory = conversations[userId]
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    /* ========= MASTER PROMPT ========= */

    const prompt = `
You are Lakshay Oberoi's AI assistant.

Rules:
- Keep answers short (1–3 lines max).
- Be confident but not dramatic.
- Do NOT overshare personal traits unless specifically asked.
- Answer clearly and directly.
- If question is unrelated to Lakshay, respond smartly and redirect.
- Use previous conversation if needed for context.
- No long paragraphs.

Chat History:
${chatHistory}

Knowledge Context:
${context}

Current Question:
${message}

Answer:
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      temperature: 0.6
    });

    const reply = response.text.trim();

    // Save assistant reply in memory
    conversations[userId].push({
      role: "assistant",
      content: reply
    });

    res.json({ reply });

  } catch (error) {
    console.error(error);
    res.status(500).json({ reply: "Server error." });
  }
});

app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});

// src/app/api/tts/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

// Initialize the OpenAI client with your API key.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { narratorPrompt } = await req.json();

    if (!narratorPrompt) {
      return NextResponse.json({ error: "Missing narratorPrompt" }, { status: 400 });
    }

    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "coral",
      input: narratorPrompt,
      instructions: "Speak in a cheerful and positive tone.",
      // For example, you could set the format to "mp3" if needed.
      response_format: "mp3",
    });

    // Convert the response into a buffer
    const buffer = Buffer.from(await response.arrayBuffer());

    // Save the file locally (or upload it somewhere)
    const speechFile = path.resolve("./public/speech.mp3");
    await fs.promises.writeFile(speechFile, buffer);

    // Return the URL/path to the saved file.
    return NextResponse.json({ audioUrl: "/speech.mp3" });
  } catch (error) {
    console.error("TTS generation error:", error);
    return NextResponse.json({ error: "TTS generation failed" }, { status: 500 });
  }
}

// src/app/api/tts/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

// Initialize the OpenAI client with your API key.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  const { narratorPrompt, timestamp, tone } = await request.json();
  
  // Log the timestamp to see if it's being passed correctly
  console.log("TTS request with timestamp:", timestamp);
  
  try {
    if (!narratorPrompt) {
      return NextResponse.json({ error: "Missing narratorPrompt" }, { status: 400 });
    }

    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "coral",
      input: narratorPrompt,
      instructions: tone ?? "Speak in a cheerful and positive tone.",
      // For example, you could set the format to "mp3" if needed.
      response_format: "mp3",
    });

    // Convert the response into a buffer
    const buffer = Buffer.from(await response.arrayBuffer());

    // Save the file locally (or upload it somewhere)
    const speechFile = path.resolve(`./public/speech_${timestamp}.mp3`);
    await fs.promises.writeFile(speechFile, buffer);

    // Return the URL/path to the saved file.
    return NextResponse.json({ 
      audioUrl: `/speech_${timestamp}.mp3`
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error("TTS generation error:", error);
    return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 });
  }
}

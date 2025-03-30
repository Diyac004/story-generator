import { google } from "@ai-sdk/google";
import { FilePart, generateText } from "ai";
import {z} from "zod";
import fs from "fs"

export async function POST(request: Request) {
  const { images, prompt, genres } = await request.json() as {
    images?: Base64URLString[];
    prompt?: string;
    genres: string[];
  };
  console.log("Received data:", { images, prompt, genres });

  const imageObjects: FilePart[] = images?.map((image) => ({
    type: "file",
    data: image,
    mimeType: "image/jpeg",
  })) || [];

  const result = await generateText({
    model: google("gemini-2.0-flash-001"),

    messages: [
      {
        role: "user",
        content: [
            {
                type: 'text',
                text: `Create a introduction for a story(the introduction should be such that the user can create a plot) based on the selected genres: ${genres.join(", ")}. You should also create a prompt for the image generation model. `

              },
          ...imageObjects
        ],
      },
    ],
    tools: {
        nextSteps: {
            type: "function",
            description: "The next 4 options for the story",
            parameters: z.object({
                thisFrameImagePrompt: z.string().describe("The image prompt for the first image"),
                nextOptions: z.array(z.object({
                    stepButtonText: z.string(),
                    stepButtonImagePrompt: z.string(),
                })).describe("The next 4 options for the story")
            }),
        }
    }
  });

  let imagePrompt = "";

  result.toolCalls.forEach((toolCall) => {
    if (toolCall.toolName === "nextSteps") {
      imagePrompt = toolCall.args.thisFrameImagePrompt;
        console.log("Image prompt:", imagePrompt);
    }})

    // use image prompt to make another llm call.
    const imageResult = await generateText({
        model: google("gemini-2.0-flash-exp"),
        messages: [
          {
            role: "user",
            content: `Now create an image based on the prompt: ${imagePrompt}.`,
          },
        ],
      });
      
  for (const file of result.files) {
    if (file.mimeType.startsWith("image/")) {
      // save the file using fs
      // file has uint8array data
      const buffer = Buffer.from(file.uint8Array);
      const fileName = `image-${Date.now()}.jpg`;
      fs.writeFileSync(fileName, buffer);
      console.log(`Saved image to ${fileName}`);
    }
  }

  result.toolCalls.forEach((toolCall) => {
    if (toolCall.toolName === "nextSteps") {
      const nextSteps = toolCall.args;
      console.log("Next steps:", nextSteps);
      // Process the next steps as needed
    }})

  // Here you would typically process the data or save it to a database
  // For demonstration purposes, we'll just return the received data
  return new Response(JSON.stringify({ images, prompt, genres }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

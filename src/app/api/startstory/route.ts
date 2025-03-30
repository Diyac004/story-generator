import { google } from "@ai-sdk/google";
import { FilePart, generateText } from "ai";
import fs from "fs";
import { z } from "zod";

export async function POST(request: Request) {
  const input = (await request.json()) as {
    images?: Base64URLString[];
    prompt?: string;
    genres: string[];
  };
  const { images, prompt, genres } = input;

  console.log("Received data:", { images, prompt, genres });

  const imageObjects: FilePart[] =
    images?.map((image) => ({
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
            type: "text",
            text: `Create a introduction for a story(the introduction should be such that the user can create a plot) based on the selected genres: ${genres.join(
              ", "
            )}. You should also create a prompt for the image generation model. You MUST run the 'nextSteps' tool
                    
                    The next steps should be an "action" - that the user (watching the story) can take. So, the story you form should be a hook, or a difficult/good/interesting situation in which the user is. 
                    
                    The first part should be very engaging, and the image prompt should be descriptive, cartoonish / dreamy and in the style of a very well designed Ghibili studio like image. The image should always be landscape (16:9) ratio. ALWAYS CREATE A LANDSCAPE IMAGE. Make sure the image prompts are vivid, detailed, and captivating.
                    
                    The next imageprompts should be descriptive, and try to preserve as much detail as possible about the first prompt.
                    ${
                      prompt
                        ? `The user also wishes the story to be around this: ${prompt}`
                        : ""
                    }`,
          },
          ...imageObjects,
        ],
      },
    ],
    toolChoice: "required",
    tools: {
      nextSteps: {
        type: "function",
        description: "The next 4 options for the story",
        parameters: z.object({
          thisFrameImagePrompt: z
            .string()
            .describe("The image prompt for the first image"),
          thisFrameNarratorPrompt: z
            .string()
            .describe("The narrator prompt for the first image"),
          nextOptions: z
            .array(
              z.object({
                stepButtonText: z.string(),
                stepButtonImagePrompt: z
                  .string()
                  .describe(
                    "A vivid and captivating image prompt for the next step"
                  ),
              })
            )
            .describe("The next 4 options for the story"),
        }),
      },
    },
  });

  let imagePrompt = "";

  const toReturnItems = result.toolCalls.map((toolCall) => {
    if (toolCall.toolName === "nextSteps") {
      imagePrompt = toolCall.args.thisFrameImagePrompt;
      console.log("Image prompt:", imagePrompt);
      return toolCall.args;
    }
  })[0];

  console.log(JSON.stringify(result.toolCalls, null, 2));

  result.toolCalls.forEach((toolCall) => {
    if (toolCall.toolName === "nextSteps") {
      imagePrompt = toolCall.args.thisFrameImagePrompt;
      console.log("Image prompt:", imagePrompt);
    }
  });

  const imageResult = await generateText({
    providerOptions: {
      google: { responseModalities: ["TEXT", "IMAGE"] },
    },
    model: google("gemini-2.0-flash-exp"),
    messages: [
      {
        role: "user",
        content: `Generate this hypothetical image: ${imagePrompt}.`,
      },
    ],
  });
  console.log("Image result:", imageResult);

  let base64Image = ""

  if (imageResult.files && imageResult.files.length > 0) {
    for (const file of imageResult.files) {
      if (file.mimeType.startsWith("image/")) {

        base64Image= `data:${file.mimeType};base64,${file.base64}`
      }
    }
  }

  return new Response(
    JSON.stringify({
      toReturnItems,
      base64Image,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

import { google } from "@ai-sdk/google";
import { CoreMessage, generateText, TextPart } from "ai";
import { z } from "zod";
export async function POST(request: Request) {
  const messages = (await request.json()) as {
    input: {
      prompt: string;
      previousImagePrompt: string;
    }[];
  };

  const messageInputSchema = z.object({
    input: z.array(
      z.object({
        prompt: z.string(),
        previousImagePrompt: z.string(),
      })
    ),
  });

  const parsed = messageInputSchema.safeParse(messages);

  if (parsed.error) {
    return new Response(
      JSON.stringify({
        error: parsed.error,
        message: "bro, wrong input.",
      })
    );
  }

  const result = await generateText({
    model: google("gemini-2.0-flash-001"),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Previously, you generated these prompts: ${messages.input
              .map((m) => m.previousImagePrompt)
              .join("\n\n")}. for these inputs: ${messages.input
              .map((m) => m.prompt)
              .join(
                "\n\n"
              )} Now, in the SAME STYLE, generate a new prompt for the next image. The prompt should be descriptive, cartoonish / dreamy and in the style of a very well designed Ghibili studio like image. The image should always be landscape (16:9) ratio. ALWAYS CREATE A LANDSCAPE IMAGE. Make sure the image prompts are vivid, detailed, and captivating. The next image prompt should be something like ${
              messages.input[messages.input.length - 1].prompt
            }.`,
          },
        ],
      },
    ],
    toolChoice: "required",
    tools: {
      nextSteps: {
        type: "function",
        parameters: z.object({
          thisFrameImagePrompt: z
            .string()
            .describe("prompt for the next image to be generated"),
          thisFrameNarratorPrompt: z
            .string()
            .describe("the narrator now describes the next scene in detail"),
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
  const toReturnItems = result.toolCalls.map((m) => {
    if (m.toolName == "nextSteps") {
      imagePrompt = m.args.thisFrameImagePrompt;

      return m.args;
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

  const base64Image = imageResult.files?.map((file) => file.base64)[0];
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

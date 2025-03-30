import { google } from "@ai-sdk/google";
import { CoreMessage, FilePart, generateText } from "ai";
import fs from "fs";
import { z } from "zod";

export async function POST(request: Request) {
  const inputData = await request.json();
  
  let messages = [];
  let storyContext = "";
  let imageStyleGuidance = "";
  let storyArc = "";
  
  // Check if the input contains genres (new story) or narratorPrompt (continuation)
  if ('genres' in inputData) {
    // This is a new story
    const { images, prompt, genres } = inputData;
    console.log("Received new story data:", { images, prompt, genres });
    
    // Create a style guide based on genres
    imageStyleGuidance = createStyleGuidance(genres);
    
    const imageObjects: FilePart[] =
      images?.map((image: string) => ({
        type: "file",
        data: image,
        mimeType: "image/jpeg",
      })) || [];
      
    // First create a hidden story arc/outline
    const storyArcResult = await generateText({
      model: google("gemini-2.0-flash-001"),
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Create a brief outline for a ${genres.join(", ")} story. 
            This outline is for internal use only and will never be shown to the user. 
            Include major plot points, character development arcs, and a satisfying conclusion.
            ${prompt ? `The story should be about: ${prompt}` : ""}
            Keep it under 500 words.`
          },
          ...imageObjects
        ]
      }]
    });
    
    storyArc = storyArcResult.text;
    console.log("Generated story arc:", storyArc);
      
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: `Create an immersive introduction for a story based on the selected genres: ${genres.join(
            ", "
          )}. The introduction should capture the reader's imagination and set up a scenario where the reader becomes the protagonist.
          
          Make the story vivid, emotionally engaging, and create a sense of intrigue or mystery. Include sensory details and establish a unique atmosphere.
          
          You should also create a prompt for the image generation model. You MUST run the 'nextSteps' tool.
          
          The next steps should be "actions" that the reader (as the protagonist) can take. The story should place the reader in an interesting situation with meaningful choices.
          
          IMPORTANT: Make sure each of the 4 options is distinctly different and represents a meaningful choice.
          
          The image prompt should be descriptive, detailed, and in the style of a Studio Ghibli film - dreamlike, imaginative, with rich colors and beautiful landscapes. The image MUST be in landscape (16:9) ratio.
          
          The next image prompts should maintain visual continuity with the first image while adapting to the new story direction.
          
          HIDDEN STORY ARC (never reveal this to the user, but use it to inform the story direction):
          ${storyArc}
          
          ${prompt ? `The user wishes the story to be about: ${prompt}` : ""}`
        },
        ...imageObjects,
      ],
    });
  } else if ('narratorPrompt' in inputData && 'oldGeneratedImagePrompt' in inputData) {
    // This is a continuation
    const { 
      narratorPrompt, 
      oldGeneratedImagePrompt, 
      genres, 
      initialPrompt, 
      storyHistory,
      selectedButtonText,
      previousOptions,
      storyArc
    } = inputData;
    
    console.log("Received continuation data:", { narratorPrompt, oldGeneratedImagePrompt });
    
    // Create a style guide based on genres
    imageStyleGuidance = genres ? createStyleGuidance(genres) : "";
    
    // Build story context from history if available
    if (storyHistory && storyHistory.length > 0) {
      storyContext = "Previous story context: \n";
      storyHistory.forEach((item: any, index: number) => {
        if (item.toReturnItems && item.toReturnItems.thisFrameNarratorPrompt) {
          storyContext += `\nScene ${index + 1}: ${item.toReturnItems.thisFrameNarratorPrompt}\n`;
          
          // If there was a selection made, include that too
          if (index < storyHistory.length - 1 && storyHistory[index + 1].selectedButtonText) {
            storyContext += `User chose: ${storyHistory[index + 1].selectedButtonText}\n`;
          }
        }
      });
    }
    
    // Track previously shown options to avoid repetition
    let avoidOptions = "";
    if (previousOptions && previousOptions.length > 0) {
      avoidOptions = "Previously shown options (avoid repeating these):\n";
      previousOptions.forEach((option: string, index: number) => {
        avoidOptions += `${index + 1}. ${option}\n`;
      });
    }
    
    // First add the narratorPrompt as a user message
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: narratorPrompt
        }
      ]
    });
    
    // Then add the oldGeneratedImagePrompt as an assistant message
    messages.push({
      role: "assistant",
      content: [
        {
          type: "text",
          text: oldGeneratedImagePrompt
        }
      ]
    });
    
    // Add the selected button text if available
    if (selectedButtonText) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `I chose: "${selectedButtonText}"`
          }
        ]
      });
    }
    
    // Finally add the instructions to continue the story with context
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: `Continue the adventure from where we left off. Create the next exciting chapter of the narrative that logically builds on previous events. You MUST run the 'nextSteps' tool.
    
    ${storyContext}
    
    ${initialPrompt ? `Remember that this adventure revolves around: ${initialPrompt}` : ''}
    ${genres ? `Maintain the tone and elements appropriate for these genres: ${genres.join(', ')}` : ''}
    
    Craft an engaging, fast-paced continuation that moves the plot forward with minimal repetition. Present four distinct and fresh choices for the protagonist—each option should open a unique path and propel the story into new directions.
    
    ${avoidOptions}
    
    Generate a detailed image prompt in the signature Studio Ghibli style. The image MUST be in a 16:9 landscape ratio, ensuring visual continuity with previous scenes while vividly representing this new chapter. Ensure that character appearances, environments, color palettes, and overall visual style remain consistent.
    
    Keep narrator prompts concise (tweet-length) yet immersive.
    
    HIDDEN STORY ARC (never reveal this to the user, but use it to guide the story direction):
    ${storyArc || "Generate the story arc"}
    `
        }
      ]
    });
    
  } else {
    return new Response(JSON.stringify({ error: "Invalid input format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const result = await generateText({
    model: google("gemini-2.5-pro-exp-03-25"),
    messages: messages as CoreMessage[],
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
                    "A vivid and captivating image prompt for the next step that maintains visual continuity with previous images"
                  ),
              })
            )
            .describe("The next 4 distinct and interesting options for the story"),
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
  
  // Add style guidance to enhance image consistency
  const enhancedImagePrompt = `Generate this hypothetical image: ${imagePrompt}. 
  ${imageStyleGuidance}
  The image MUST be in landscape (16:9) ratio with a cinematic quality similar to Studio Ghibli films.`;

  const imageResult = await generateText({
    providerOptions: {
      google: { responseModalities: ["TEXT", "IMAGE"] },
    },
    model: google("gemini-2.0-flash-exp"),
    messages: [
      {
        role: "user",
        content: enhancedImagePrompt,
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
      styleGuidance: imageStyleGuidance,
      storyArc: storyArc, // Pass the hidden story arc for continuity
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

// Helper function to create style guidance based on genres
function createStyleGuidance(genres: string[]): string {
  let guidance = "Style guidance: ";
  
  if (genres.includes("Adventure")) {
    guidance += "Create an epic, expansive landscape with a sense of exploration and wonder. ";
  }
  
  if (genres.includes("Horror")) {
    guidance += "Use muted colors, shadows, and create an eerie, unsettling atmosphere while maintaining the Ghibli aesthetic. ";
  }
  
  if (genres.includes("Romance")) {
    guidance += "Include warm, soft lighting with delicate details and intimate framing. ";
  }
  
  if (genres.includes("Comedy")) {
    guidance += "Use bright, vibrant colors with exaggerated, playful expressions and visual humor. ";
  }
  
  if (genres.includes("Science Fiction")) {
    guidance += "Blend futuristic elements with organic shapes, unusual lighting, and fantastical technology. ";
  }
  
  if (genres.includes("Action")) {
    guidance += "Create dynamic composition with a sense of motion, energy and tension. ";
  }
  
  guidance += "Maintain consistent character designs, color palettes, and environmental elements throughout the story. ";
  
  return guidance;
}

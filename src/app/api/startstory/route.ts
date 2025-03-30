import { google } from "@ai-sdk/google";
import type { CoreMessage, FilePart } from "ai";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import type { ResponseData, StoryArc, StoryPhase } from "@/types";
import { z } from "zod";

type NextStepsResponse = {
  thisFrameImagePrompt: string;
  thisFrameNarratorPrompt: string;
  nextOptions: {
    stepButtonText: string;
    stepButtonImagePrompt: string;
  }[];
};

type ToolCallResponse = {
  toolName: string;
  args: NextStepsResponse;
};

type InputData = {
  genres?: string[];
  narratorPrompt?: string;
  oldGeneratedImagePrompt?: string;
  initialPrompt?: string;
  storyHistory?: {
    selectedButtonText: string;
    narratorPrompt: string;
  }[];
  selectedButtonText?: string;
  previousOptions?: string[];
  storyArc?: string;
  images?: string[];
  prompt?: string;
};

export async function POST(request: Request): Promise<NextResponse> {
  const inputData = await request.json() as InputData;
  
  const messages: CoreMessage[] = [];
  let storyContext = "";
  let imageStyleGuidance = "";
  let storyArc = "";
  let currentEmotionalTone = "neutral"; // Default tone
  let toReturnItems: NextStepsResponse | null = null;
  let base64Image = "";
  
  // Check if the input contains genres (new story) or narratorPrompt (continuation)
  if ('genres' in inputData && inputData.genres) {
    // This is a new story
    const { images = [], prompt = "", genres } = inputData;
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
            text: `Create a structured story arc with exactly 5 major plot points for a ${genres.join(", ")} story. It must be 8-12 steps long.`
          },
          ...imageObjects
        ]
      }],
      toolChoice: "required",
      tools: {
        storyArc: {
          type: "function",
          description: "Create a structured story arc with 5 major plot points",
          parameters: z.object({
            plotPoints: z.array(
              z.object({
                phase: z.enum(["setup", "risingAction", "complication", "climax", "resolution"]),
                description: z.string().describe("Description of this story phase"),
                emotionalTone: z.string().describe("The emotional tone for this phase (e.g. mysterious, tense, joyful)")
              })
            ).length(5),
            estimatedSteps: z.number().min(8).max(12).describe("Estimated number of steps to complete the story")
          }).describe(prompt ? `Create a story arc about: ${prompt}` : "Create an engaging story arc")
        }
      }
    });

    if (!storyArcResult.toolCalls?.length) {
      return NextResponse.json({
        error: "Failed to generate story arc"
      }, { status: 500 });
    }

    const storyArcData = storyArcResult.toolCalls[0].args
    storyArc = JSON.stringify(storyArcData);
    console.log("Generated story arc:", storyArc);
      
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: `Create an immersive but concise introduction for a story based on the selected genres: ${genres.join(
            ", "
          )}. Immediately establish an engaging scenario with clear stakes where the reader becomes the protagonist.
          
          Focus on action and forward momentum. Avoid lengthy descriptions - use vivid but efficient language to set the scene. Create immediate tension or intrigue that demands action.
          
          You should also create a prompt for the image generation model. You MUST run the 'nextSteps' tool.
          
          The next steps should be impactful "actions" that significantly affect the story's direction. Each option should promise clear and different consequences.
          
          CRITICAL: Make each of the 4 options distinctly different and ensure they all drive the plot forward in meaningful ways. NO passive options.
          
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
      storyArc: existingStoryArc
    } = inputData;
    
    // Parse story arc and determine current phase
    if (!existingStoryArc) {
      return NextResponse.json({
        error: "Missing story arc"
      }, { status: 400 });
    }
    
    const storyArcData: StoryArc = JSON.parse(existingStoryArc);
    const currentStep = storyHistory?.length ?? 0 + 1;
    const totalSteps = storyArcData.estimatedSteps;
    const progress = currentStep / totalSteps;
    
    // Determine current story phase and emotional tone
    const currentPhase: StoryPhase = (() => {
      if (progress <= 0.2) return storyArcData.plotPoints[0];
      if (progress <= 0.4) return storyArcData.plotPoints[1];
      if (progress <= 0.6) return storyArcData.plotPoints[2];
      if (progress <= 0.8) return storyArcData.plotPoints[3];
      return storyArcData.plotPoints[4];
    })();
    
    // Create a style guide based on genres
    imageStyleGuidance = genres ? createStyleGuidance(genres) : "";
    
    // Build story context from history if available
    if (storyHistory && storyHistory.length > 0) {
      storyContext = "Previous story context:\n";
      storyHistory.forEach((step, index) => {
        storyContext += `Step ${index + 1}: ${step.narratorPrompt}\nChosen action: ${step.selectedButtonText}\n\n`;
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
          text: narratorPrompt || ""
        }
      ]
    });
    
    // Then add the oldGeneratedImagePrompt as an assistant message
    messages.push({
      role: "assistant",
      content: [
        {
          type: "text",
          text: oldGeneratedImagePrompt || ""
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
    
    // Generate the next part of the story
    const result = await generateText({
      model: google("gemini-2.0-flash-001"),
      messages: messages,
      toolChoice: "required",
      tools: {
        nextSteps: {
          type: "function",
          description: "The next 4 options for the story",
          parameters: z.object({
            thisFrameImagePrompt: z.string(),
            thisFrameNarratorPrompt: z.string(),
            nextOptions: z.array(z.object({
              stepButtonText: z.string(),
              stepButtonImagePrompt: z.string(),
            })),
          }),
        }
      },
    });

    if (!result.toolCalls?.length) {
      return NextResponse.json({
        error: "No tool calls returned"
      }, { status: 500 });
    }

    const toolCalls = result.toolCalls as ToolCallResponse[];
    const nextStepsCall = toolCalls.find(call => call.toolName === "nextSteps");
    
    if (!nextStepsCall) {
      return NextResponse.json({
        error: "Failed to generate story response"
      }, { status: 500 });
    }

    toReturnItems = nextStepsCall.args;
    currentEmotionalTone = currentPhase.emotionalTone;
    const narrationStyle = {
      instructions: `Speak in a ${currentEmotionalTone} tone that matches the current story phase.`
    };

    // Generate image for the new frame
    const enhancedImagePrompt = `Generate this hypothetical image: ${toReturnItems.thisFrameImagePrompt}. 
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

    if (imageResult.files && imageResult.files.length > 0) {
      for (const file of imageResult.files) {
        if (file.mimeType.startsWith("image/")) {
          base64Image = `data:${file.mimeType};base64,${file.base64}`;
          break;
        }
      }
    }

    // Finally add the instructions to continue the story with context
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: `Continue the adventure with immediate forward momentum. Create a concise but impactful next chapter that advances the plot significantly. You MUST run the 'nextSteps' tool.
    
    ${storyContext}
    
    ${initialPrompt ? `Remember that this adventure revolves around: ${initialPrompt}` : ''}
    ${genres ? `Maintain the tone and elements appropriate for these genres: ${genres.join(', ')}` : ''}
    
    CRITICAL GUIDELINES:
    - Keep narration tight and focused on action/consequences
    - Each scene must meaningfully progress the plot
    - Avoid repetitive scenarios or circular choices
    - Present clear stakes and tension in every scene
    - Make every choice feel impactful and distinct
    
    Present four dramatically different options that will significantly change the story's direction. Each choice should:
    - Have clear and different consequences
    - Move the plot forward in a unique way
    - Avoid passive or "safe" options
    - Build upon previous choices without getting stuck
    
    ${avoidOptions}


    You should always send 4 interesting options. ALWAYS.
    
    Generate a detailed image prompt in the signature Studio Ghibli style. The image MUST be in a 16:9 landscape ratio, ensuring visual continuity with previous scenes while vividly representing this new chapter. Ensure that character appearances, environments, color palettes, and overall visual style remain consistent.
    
    Keep narrator prompts concise (tweet-length) yet immersive, focusing on action and stakes rather than description.
    
    HIDDEN STORY ARC (never reveal this to the user, but use it to guide the story direction):
    ${existingStoryArc || "Generate the story arc"}
    `
        }
      ]
    });
    
    if (!toReturnItems) {
      return NextResponse.json({
        error: "Failed to generate story response"
      }, { status: 500 });
    }

    return NextResponse.json({
      toReturnItems: {
        thisFrameImagePrompt: toReturnItems.thisFrameImagePrompt,
        thisFrameNarratorPrompt: toReturnItems.thisFrameNarratorPrompt,
        nextOptions: toReturnItems.nextOptions,
        narrationStyle
      },
      base64Image,
      styleGuidance: imageStyleGuidance,
      storyArc: storyArc,
    });
  } else {
    return NextResponse.json({
      error: "Invalid input format"
    }, {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const result = await generateText({
    model: google("gemini-2.5-pro-exp-03-25"),
    messages: messages,
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

  const parsedResult = result.toolCalls.map((toolCall) => {
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

  if (imageResult.files && imageResult.files.length > 0) {
    for (const file of imageResult.files) {
      if (file.mimeType.startsWith("image/")) {

        base64Image= `data:${file.mimeType};base64,${file.base64}`
      }
    }
  }

  if (!parsedResult) {
    return NextResponse.json({
      error: "Failed to generate story response"
    }, { status: 500 });
  }

  return NextResponse.json({
    toReturnItems: {
      thisFrameImagePrompt: parsedResult.thisFrameImagePrompt,
      thisFrameNarratorPrompt: parsedResult.thisFrameNarratorPrompt,
      nextOptions: parsedResult.nextOptions,
      narrationStyle: {
        instructions: `Speak in a ${currentEmotionalTone} tone that matches the current story phase.`
      }
    },
    base64Image,
    styleGuidance: imageStyleGuidance,
    storyArc: storyArc, // Pass the hidden story arc for continuity
  }, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
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

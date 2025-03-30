export type ResponseData = {
  toReturnItems: {
    thisFrameImagePrompt: string;
    thisFrameNarratorPrompt: string;
    nextOptions: {
      stepButtonText: string;
      stepButtonImagePrompt: string;
    }[];
  };
  base64Image: string;
  selectedButtonText?: string;
  genres?: string[];
  initialPrompt?: string;
  storyArc?: string;
  visualContinuityContext?: {
    firstSceneImagePrompt: string;
    previousScenes: {
      imagePrompt: string;
      narratorPrompt: string;
    }[];
  };
}

export type CachedNextFrame = {
  buttonIndex: number;
  stepButtonText: string;
  responseData: ResponseData;
}
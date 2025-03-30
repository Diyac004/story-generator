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
}
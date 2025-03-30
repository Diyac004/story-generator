"use client";
import CategoryCard from "@/components/catergoryCards";
import StoryBlock from "@/components/storyblock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, Volume2, VolumeX, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import adventureImg from "@/images/Adventure.png";
import comedyImg from "@/images/Comedy.png";
import actionImg from "@/images/Action.png";
import sciFiImg from "@/images/SciFi.png";
import horrorImg from "@/images/Horror.png";
import romanceImg from "@/images/Romance.png";
import type { ResponseData } from "@/types";

export default function Home() {
  const [images, setImages] = useState<string[] | null>(null);
  const [prompt, setPrompt] = useState("");

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [responseData, setResponseData] = useState<ResponseData>();
  const [responseHistory, setResponseHistory] = useState<ResponseData[]>([]);
  const [storyArc, setStoryArc] = useState<string | null>(null);

  // Store initial genres to maintain story consistency
  const [storyGenres, setStoryGenres] = useState<string[]>([]);
  const [storyPrompt, setStoryPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [bgAudio, setBgAudio] = useState<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  // Initialize audio without playing
  useEffect(() => {
    if (!responseData && !bgAudio) {
      const audio = new Audio("https://pageshots.supermemory.ai/Suzume%20no%20TojimariSuzumeTheme%20Song.mp3");
      audio.loop = true;
      audio.volume = 0.3;
      audio.muted = isMuted;
      setBgAudio(audio);
    }


    // Update mute state when it changes
    if (bgAudio) {
      bgAudio.muted = isMuted;
      if (!isMuted) {
        bgAudio.play().catch(console.error);
      } else {
        bgAudio.pause();
      }
    }

    // Cleanup function to stop audio when component unmounts or story starts
    return () => {
      if (bgAudio) {
        bgAudio.pause();
        bgAudio.currentTime = 0;
        setBgAudio(null);
      }
    };
  }, [responseData, isMuted]);

  // set tone in local storage
  const setTone = (tone: string) => {
    localStorage.setItem("tone", tone);
  };

  const handleStoryProgress = async (nextStepData: ResponseData) => {
    // Store the current state of the story in a list, only if it exists
    if (responseData) {
      setResponseHistory((prevHistory) => [...prevHistory, responseData]);
    }

    // Add visual continuity metadata to help with consistency
    if (responseHistory.length > 0 || responseData) {
      nextStepData.visualContinuityContext = {
        firstSceneImagePrompt: responseHistory.length > 0 
          ? responseHistory[0].toReturnItems.thisFrameImagePrompt! 
          : responseData?.toReturnItems.thisFrameImagePrompt!,
        previousScenes: [
          ...(responseHistory.map(item => ({
            imagePrompt: item.toReturnItems.thisFrameImagePrompt!,
            narratorPrompt: item.toReturnItems.thisFrameNarratorPrompt!
          }))),
          responseData && {
            imagePrompt: responseData.toReturnItems.thisFrameImagePrompt,
            narratorPrompt: responseData.toReturnItems.thisFrameNarratorPrompt
          }
        ].filter(Boolean) as { imagePrompt: string; narratorPrompt: string; }[]
      };
    }
    
    // replace the responseData
    setResponseData(nextStepData);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages: string[] = [];
    const fileArray = Array.from(files);

    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push(reader.result as string);
        if (newImages.length === fileArray.length) {
          setImages((prevImages) => 
            prevImages ? [...prevImages, ...newImages] : newImages
          );
        }
      };
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    console.log("Response data changed:", responseData);
  }, [responseData]);

  return (
    <>
      {!responseData ? (
        <>
          <div
            style={{
              backgroundImage:
                "url('https://pageshots.supermemory.ai/image.webp') ",
              backgroundSize: "cover",
              backgroundPosition: "bottom",
            }}
            className="flex flex-col items-center justify-center min-h-screen"
          >
            <div className="flex gap-4 flex-col items-center justify-center p-4">
              <div className="absolute top-4 right-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-white/30 backdrop-blur-md rounded-full hover:bg-white/50"
                  onClick={() => setIsMuted(!isMuted)}
                  title={isMuted ? "Click to play music" : "Click to mute music"}
                >
                  {isMuted ? (
                    <VolumeX className="h-6 w-6 text-gray-800" />
                  ) : (
                    <Volume2 className="h-6 w-6 text-gray-800" />
                  )}
                </Button>
              </div>              <h1
                className="drop-shadow-2xl font-bold text-white text-6xl mb-4"
                style={{ fontFamily: "'Freckle Face', cursive" }}
              >
                Choose your own Adventure
              </h1>
              <div className="backdrop-blur-sm bg-white/30 p-4 rounded-lg w-5xl shadow-lg flex flex-col gap-4">
                <h3
                  className="text-center text-2xl font-semibold text-gray-800"
                  style={{ fontFamily: "'Freckle Face', cursive" }}
                >
                  {" "}
                  Select a genre
                </h3>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white/30 to-transparent pointer-events-none flex items-center justify-start pl-2 z-10">
                    <ChevronLeft className="h-6 w-6 text-gray-800/50" />
                  </div>
                  <div className="flex w-full justify-between items-center gap-2 overflow-x-auto no-scrollbar">
                    <CategoryCard
                      bgImageUrl={adventureImg.src}
                      text="Adventure"
                      setGenres={setSelectedGenres}
                      currentGenres={selectedGenres}
                    />
                    <CategoryCard
                      bgImageUrl={horrorImg.src}
                      text="Horror"
                      setGenres={setSelectedGenres}
                      currentGenres={selectedGenres}
                    />
                    <CategoryCard
                      bgImageUrl={romanceImg.src}
                      text="Romance"
                      setGenres={setSelectedGenres}
                      currentGenres={selectedGenres}
                    />
                    <CategoryCard
                      bgImageUrl={comedyImg.src}
                      text="Comedy"
                      setGenres={setSelectedGenres}
                      currentGenres={selectedGenres}
                    />
                    <CategoryCard
                      bgImageUrl={sciFiImg.src}
                      text="Science Fiction"
                      setGenres={setSelectedGenres}
                      currentGenres={selectedGenres}
                    />
                    <CategoryCard
                      bgImageUrl={actionImg.src}
                      text="Action"
                      setGenres={setSelectedGenres}
                      currentGenres={selectedGenres}
                    />
                  </div>
                  <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white/30 to-transparent pointer-events-none flex items-center justify-end pr-2 z-10">
                    <ChevronRight className="h-6 w-6 text-gray-800/50" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4 relative pb-6">
                    <h2
                      className="text-2xl font-semibold text-gray-800"
                      style={{ fontFamily: "'Freckle Face', cursive" }}
                    >
                      Upload an Image
                    </h2>
                    <p className="text-sm text-black-500">
                      Upload an image to inspire your story
                    </p>

                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-6 h-48 relative bg-black/10 ">
                      {images && images.length > 0 ? (
                        <div className="relative w-full h-full flex gap-2 overflow-x-auto">
                          {images.map((image, index) => (
                            <div key={index} className="relative h-full aspect-square flex-shrink-0">
                              <Image
                                src={image || "/placeholder.svg"}
                                alt={`Uploaded image ${index + 1}`}
                                fill
                                className="object-cover rounded-lg"
                              />
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  const newImages = [...images];
                                  newImages.splice(index, 1);
                                  setImages(newImages.length > 0 ? newImages : null);
                                }}
                                className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
                          <Upload className="h-10 w-10 text-grey-400 mb-2" />
                          <span className="text-sm text-black-500">
                            Click to upload
                          </span>
                          <Input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleImageUpload}
                          />
                        </label>
                      )}
                    </div>
                    <label htmlFor="image-upload">
                      <Button
                        className="absolute bottom-0 right-24 bg-white/80"
                        type="button"
                        variant="outline"
                        size="sm"
                      >
                        <Input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                        Add image
                      </Button>
                    </label>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="absolute bottom-0 right-2 bg-white/80"
                      onClick={() => setImages(null)}
                    >
                      Remove
                    </Button>
                  </div>

                  <div className="space-y-4 relative pb-6">
                    <h2
                      className="text-2xl font-semibold text-gray-800"
                      style={{ fontFamily: "'Freckle Face', cursive" }}
                    >
                      Or Enter a Prompt
                    </h2>
                    <p className="text-sm text-black-500">
                      Describe the story you want to create
                    </p>
                    <Textarea
                      placeholder="A brave explorer discovers a hidden temple in the jungle..."
                      className="h-48 resize-none border-2 border-gray-200 bg-black/10 placeholder:text-gray-500"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-white/80 absolute right-2 bottom-0"
                      onClick={async () => {
                        setIsGenerating(true);
                        try {
                          // Save the initial genres and prompt for story continuity
                          setStoryGenres(selectedGenres);
                          setStoryPrompt(prompt);
                          
                          // Reset response history when starting a new story
                          setResponseHistory([]);

                          await fetch("/api/startstory", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              images,
                              prompt,
                              genres: selectedGenres,
                            }),
                          })
                            .then((response) => response.json() as unknown as ResponseData)
                            .then((data) => {
                              console.log("Response data:", data);
                              // Store genres in the response data for future reference
                              data.genres = selectedGenres;
                              data.initialPrompt = prompt;
                              setResponseData(data);
                              setImages(null);
                              setPrompt("");
                              setSelectedGenres([]);
                              setStoryArc(data.storyArc || null)
                              setTone(data.toneAccordingToGenres || "");
                            });
                        } finally {
                          setIsGenerating(false);
                        }
                      }}
                      disabled={!selectedGenres.length || isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate Story"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <StoryBlock
            bgImageUrl={responseData.base64Image}
            buttons={responseData.toReturnItems.nextOptions}
            narratorPrompt={responseData.toReturnItems.thisFrameNarratorPrompt}
            onStoryProgress={handleStoryProgress}
            responseHistory={responseHistory}
            currentImagePrompt={responseData.toReturnItems.thisFrameImagePrompt}
            genres={storyGenres} // Pass the genres to maintain consistency
            initialPrompt={storyPrompt} // Pass the initial prompt
            storyArc={storyArc || undefined}
            setStoryArc={setStoryArc}
          />
        </>
      )}
    </>
  );
}

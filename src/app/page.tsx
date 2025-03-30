"use client";
import CategoryCard from "@/components/catergoryCards";
import StoryBlock from "@/components/storyblock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import adventureImg from "@/images/Adventure.png";
import comedyImg from "@/images/Comedy.png";
import actionImg from "@/images/Action.png";
import sciFiImg from "@/images/SciFi.png";
import horrorImg from "@/images/Horror.png";
import romanceImg from "@/images/Romance.png";
import { ResponseData } from "@/types";



export default function Home() {
  const [images, setImages] = useState<string[] | null>(null);
  const [prompt, setPrompt] = useState("");

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [responseData, setResponseData] = useState<ResponseData>();

const [responseHistory,setResponseHistory] = useState<ResponseData[]>([]);

  const handleStoryProgress = async (nextStepData: ResponseData) => {
    // store the current state of the story in a list
    setResponseHistory((prevHistory) => [...prevHistory, responseData!]);

    // replace the responseData
    setResponseData(nextStepData);
  };
  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((freshCopy) => [
          ...(freshCopy || []),
          reader.result?.toString() || "",
        ]);
      };
      reader.readAsDataURL(file);
    }
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
            <div className="flex gap-4 flex-col items-center justify-center  p-4 ">
              <h1
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
                <div className="flex w-full justify-between items-center gap-2 overflow-x-auto">
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
                    // Note: You don't have Romance.png, so use another image or add it
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
                      {images ? (
                        <>
                          {images.map((image, index) => (
                            <>
                              {image && (
                                <div className="relative w-full h-full">
                                  <Image
                                    key={index}
                                    src={image || "/placeholder.svg"}
                                    alt="Uploaded image"
                                    fill
                                    className="object-contain rounded-lg"
                                  />
                                </div>
                              )}
                            </>
                          ))}
                        </>
                      ) : (
                        <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
                          <Upload className="h-10 w-10 text-grey-400 mb-2" />
                          <span className="text-sm text-black-500">
                            Click to upload
                          </span>
                          <Input
                            type="file"
                            accept="image/*"
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
                          .then((response) => response.json())
                          .then((data) => {
                            console.log("Response data:", data);
                            setResponseData(data);
                            setImages(null);
                            setPrompt("");
                            setSelectedGenres([]);
                          });
                      }}
                      disabled={!selectedGenres.length}
                    >
                      Generate Story
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
          />
        </>
      )}
    </>
  );
}

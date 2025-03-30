import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ResponseData } from "@/types";

// Animation variants for the image
const animationVariants = [
  {
    // Slow zoom in
    initial: { scale: 1 },
    animate: { scale: 1.1 },
    transition: { duration: 10, ease: "easeInOut" },
  },
  {
    // Subtle floating effect
    initial: { y: 0 },
    animate: { y: -10 },
    transition: {
      duration: 4,
      repeat: Infinity,
      repeatType: "reverse",
      ease: "easeInOut",
    },
  },
  {
    // Gentle fade in with slight rotation
    initial: { opacity: 0.9, rotate: -1 },
    animate: { opacity: 1, rotate: 1 },
    transition: {
      duration: 6,
      repeat: Infinity,
      repeatType: "reverse",
      ease: "easeInOut",
    },
  },
];

type ButtonType = {
  stepButtonText: string;
  stepButtonImagePrompt: string;
};

type StoryBlockProps = {
  bgImageUrl: string;
  buttons: ButtonType[];
  narratorPrompt: string;
  onStoryProgress: (nextStepData: any) => void;
  responseHistory: ResponseData[];
  currentImagePrompt: string;
  genres: string[]; // Add genres prop
  initialPrompt?: string; // Add initial prompt prop
};

const StoryBlock: React.FC<StoryBlockProps> = ({
  bgImageUrl,
  buttons,
  narratorPrompt,
  onStoryProgress,
  responseHistory,
  currentImagePrompt,
  genres,
  initialPrompt,
}) => {
  const [animation, setAnimation] = useState(0);
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  // Remove audioKey from state since it's causing the loop
  
  // Add ref to track if narration has been played
  const hasPlayedRef = useRef(false);
  
  // Select a random animation on mount or when bgImageUrl changes
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * animationVariants.length);
    setAnimation(randomIndex);
    
    // Reset the played flag when bgImageUrl changes
    hasPlayedRef.current = false;
  }, [bgImageUrl]);

  // Function to stop the current narration
  const stopNarration = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
  };

  // Automatically play narrator audio using the server-side API route
  useEffect(() => {
    // Only proceed if we have a narrator prompt and haven't played it yet
    if (!narratorPrompt || hasPlayedRef.current) return;
    
    const timestamp = Date.now(); // Generate timestamp locally in the effect
    
    const playNarration = async () => {
      try {
        // Stop any currently playing narration
        stopNarration();
        
        console.log("Sending TTS request with prompt:", narratorPrompt);

        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache"
          },
          body: JSON.stringify({ 
            narratorPrompt,
            timestamp // Use local timestamp
          }),
        });

        const data = await res.json();
        console.log("Received TTS response:", data);

        if (data.audioUrl) {
          // Mark that we've played this narration
          hasPlayedRef.current = true;
          
          console.log("Creating audio with URL:", data.audioUrl);
          
          const audio = new Audio(data.audioUrl);
          setCurrentAudio(audio);
          
          // Note: Autoplay may be blocked by browsers unless there's user interaction.
          try {
            await audio.play();
            console.log("Audio playback started");
          } catch (playError) {
            console.error("Audio playback failed:", playError);
            // User might need to interact with page first
          }
          
          // Reset current audio when playback ends
          audio.onended = () => {
            setCurrentAudio(null);
          };
        }
      } catch (error) {
        console.error("Error playing narration:", error);
      }
    };

    playNarration();
  }, [narratorPrompt]); // Remove audioKey from dependencies

  // Add a function to manually trigger narration
  const triggerNarration = async () => {
    // Reset the played flag to allow playing again
    hasPlayedRef.current = false;
    
    // Re-run the same effect logic
    if (!narratorPrompt) return;
    
    const timestamp = Date.now();
    
    try {
      stopNarration();
      
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        },
        body: JSON.stringify({ 
          narratorPrompt,
          timestamp
        }),
      });

      const data = await res.json();
      
      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        setCurrentAudio(audio);
        await audio.play();
        
        audio.onended = () => {
          setCurrentAudio(null);
        };
      }
    } catch (error) {
      console.error("Error playing narration:", error);
    }
  };

  const selectedAnimation = animationVariants[animation];

  // Button animation variants
  const buttonVariants = {
    initial: {
      scale: 1,
      boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
    },
    hover: {
      scale: 1.05,
      boxShadow: "0px 6px 12px rgba(0, 0, 0, 0.15)",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10,
      },
    },
    tap: {
      scale: 0.98,
      boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
    },
    active: {
      scale: 1.05,
      boxShadow: "0px 6px 12px rgba(0, 0, 0, 0.2)",
      backgroundColor: "#3b82f6",
      borderColor: "#2563eb",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10,
      },
    },
  };

  const handleButtonClick = async (index: number) => {
    setActiveButton(index);
    const selectedPrompt = buttons[index].stepButtonImagePrompt;
    
    // For story continuation, we'll send narratorPrompt and the current image prompt
    const response = await fetch("/api/startstory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        narratorPrompt: selectedPrompt + " " + `this is ${genres.join(", ")} genre.`,
        oldGeneratedImagePrompt: currentImagePrompt,
        // Include original story genres and prompt for continuity
        // genres: genres,
        initialPrompt: initialPrompt,
        // Pass the story history for better context
        storyHistory: responseHistory
      }),
    });
    
    const nextStepData = await response.json();
    
    // Maintain genre information
    nextStepData.genres = genres;
    nextStepData.initialPrompt = initialPrompt;
    
    onStoryProgress(nextStepData);
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
      }}
      className="flex flex-col items-center justify-end min-h-screen font-sans pt-3"
    >
      {/* Blurred background image */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${bgImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(15px)",
          transform: "scale(1.1)",
          zIndex: 0,
        }}
      />

      {/* Non-blurred image with animation */}
      <div className="relative flex justify-center items-center z-10 h-full w-full">
        <motion.img
          src={bgImageUrl}
          alt="Story scene"
          className="max-h-[80vh] object-contain"
          initial={selectedAnimation.initial}
          animate={selectedAnimation.animate}
          transition={{
            ...selectedAnimation.transition,
            repeatType: selectedAnimation.transition.repeatType as
              | "loop"
              | "reverse"
              | "mirror",
          }}
        />
      </div>

      {/* Narrator prompt with glass morphism styling */}
      <div
        className="absolute top-4 left-4 p-4 rounded-md shadow-lg max-w-xs z-20"
        style={{
          background: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(0, 0, 0, 0.3)",
        }}
      >
        <p
          className="text-left text-white break-words text-lg md:text-xl tracking-tight leading-snug"
          style={{ fontFamily: "'Comic Neue', cursive" }}
        >
          {narratorPrompt}
        </p>
      </div>

      {/* Interactive buttons */}
      <div className="grid grid-cols-2 gap-4 mt-6 mb-6 absolute z-20 w-full max-w-lg px-4">
        {buttons.map((button, index) => (
          <motion.button
            key={`btn-${index}`}
            className={`text-white font-bold py-3 px-6 rounded-full border-2 ${
              activeButton === index
                ? "backdrop-blur-lg bg-blue-600/20 border-blue-600/20"
                : "bg-blue-500/20 border-blue-500/20 hover:bg-blue-600/20"
            }`}
            style={{
              background:
                activeButton === index
                  ? "rgba(59, 130, 246, 0.2)"
                  : "rgba(59, 130, 246, 0.1)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
            }}
            variants={buttonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
            animate={activeButton === index ? "active" : "initial"}
            onClick={() => handleButtonClick(index)}
          >
            <motion.span
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="font-bold text-base md:text-lg tracking-tight leading-tight"
              style={{ fontFamily: "'Comic Neue', cursive" }}
            >
              {button.stepButtonText}
            </motion.span>
          </motion.button>
        ))}
      </div>

      {/* Add a play/pause button */}
      <div className="absolute top-4 right-4 z-30">
        <button
          onClick={currentAudio ? stopNarration : triggerNarration}
          className="bg-white/30 backdrop-blur-md p-2 rounded-full hover:bg-white/50"
        >
          {currentAudio ? "Pause Narration" : "Play Narration"}
        </button>
      </div>

      {/* Optional: Add a small indicator showing current story genres */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
        <div className="px-3 py-1 rounded-full bg-white/30 backdrop-blur-md flex gap-1">
          {genres.map((genre, idx) => (
            <span key={idx} className="text-xs text-white font-medium">
              {genre}{idx < genres.length - 1 ? " • " : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StoryBlock;

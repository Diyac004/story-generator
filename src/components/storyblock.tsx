import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

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
    transition: { duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
  },
  {
    // Gentle fade in with slight rotation
    initial: { opacity: 0.9, rotate: -1 },
    animate: { opacity: 1, rotate: 1 },
    transition: { duration: 6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
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
};

const StoryBlock: React.FC<StoryBlockProps> = ({ bgImageUrl, buttons, narratorPrompt }) => {
  const [animation, setAnimation] = useState(0);
  const [activeButton, setActiveButton] = useState<number | null>(null);

  // Select a random animation on mount or when bgImageUrl changes
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * animationVariants.length);
    setAnimation(randomIndex);
  }, [bgImageUrl]);

  // Automatically play narrator audio using the server-side API route
// Automatically play narrator audio using the server-side API route
useEffect(() => {
  const playNarration = async () => {
    try {
      console.log("Sending TTS request with prompt:", narratorPrompt);
      
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narratorPrompt }),
      });
      
      const data = await res.json();
      console.log("Received TTS response:", data);
      
      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        // Note: Autoplay may be blocked by browsers unless there's user interaction.
        await audio.play();
        console.log("Audio playback started");
      }
    } catch (error) {
      console.error("Error playing narration:", error);
    }
  };

  if (narratorPrompt) {
    playNarration();
  }
}, [narratorPrompt]);


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

  const handleButtonClick = (index: number) => {
    setActiveButton(index);
    // Additional logic on button click if needed
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
          transition={selectedAnimation.transition}
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
              background: activeButton === index
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
    </div>
  );
};

export default StoryBlock;

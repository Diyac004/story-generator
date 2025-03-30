import React, { SetStateAction } from 'react'

function CategoryCard({bgImageUrl, text, setGenres, currentGenres}: {bgImageUrl: string, text: string, setGenres:(value: SetStateAction<string[]>) => void, currentGenres: string[]}) {
  return (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundImage: `url(${bgImageUrl})`, 
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        color: 'white',
        textAlign: 'center',
        padding: '10px',
    }}
    // potrtait in mobile, landscape in desktop
    className={` md:aspect-video min-w-60 ${currentGenres.includes(text) ? "border-2 border-blue-500" : ""}`} // Add a border if the genre is selected
    onClick={() => {
        if (currentGenres.includes(text)) {
            setGenres((prev: string[]) => prev.filter((genre) => genre !== text)); // Remove the genre if already selected
        } else {
            setGenres((prev: string[]) => [...prev, text]); // Add the genre if not selected
        }
    }} 
    >
        <div style={{ flexGrow: 1 }}></div> {/* Spacer to push text to the bottom */}
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background for text
          padding: '5px 10px',
          borderRadius: '5px',
          fontFamily: "'Freckle Face', cursive",
        }}
      >
        {text}
      </div>
      
    </div>
  )
}

export default CategoryCard

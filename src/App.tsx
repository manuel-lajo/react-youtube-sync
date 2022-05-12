import { useState, useContext } from "react";
import FireStoreContext from './firestore-context';
import YouTube, { YouTubeProps } from "react-youtube";
import getYouTubeID from "get-youtube-id";
import "./App.css";

const opts: YouTubeProps["opts"] = {
  height: "390",
  width: "640",
  playerVars: {
    rel: 0,
  },
};

function App() {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [showSearch, setShowSearch] = useState<boolean>(false);

  const ctx = useContext(FireStoreContext);

  const displaySearchControls = showSearch || ctx.videoId;

  return (
    <div className="App">
      <section className="video-container">
        <div
          className="search-controls"
          style={{
            backgroundColor: displaySearchControls ? "#4A4A4A" : "none",
          }}
        >
          <div
            className="youtube-icon"
            onMouseEnter={() => {
              setShowSearch(true);
            }}
          />
          {displaySearchControls && (
            <>
              <input
                className="input-search"
                value={videoUrl}
                placeholder="Add a YouTube URL to watch with your friends"
                onChange={(event) => {
                  setVideoUrl(event.target.value);
                }}
              />
              <div className="search-icon" onClick={() => { ctx.onSearch(getYouTubeID(videoUrl)) }} />
            </>
          )}
        </div>
        {ctx.videoId && (
          <YouTube
            videoId={ctx.videoId}
            className="youtube-frame"
            opts={opts}
            onReady={ctx.onReady}
            onPlay={ctx.onPlay}
            onPause={ctx.onPause}
          />
        )}
      </section>
    </div>
  );
}

export default App;

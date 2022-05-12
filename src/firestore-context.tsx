import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDoc,
  setDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { YouTubeProps, YouTubePlayer } from "react-youtube";
import { v4 as uuidv4 } from "uuid";
import "./App.css";

const firebaseConfig = {
  apiKey: "AIzaSyCPFylzMYb2hC4LH-W78iAk2LSS7Z-jCLQ",
  authDomain: "nooks-firestore.firebaseapp.com",
  projectId: "nooks-firestore",
  storageBucket: "nooks-firestore.appspot.com",
  messagingSenderId: "623296982314",
  appId: "1:623296982314:web:a36dcfe4bd29dad9dd8253",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// randomly generate a user ID every time you join the room
const USER_ID = uuidv4();

interface FireStoreContextInterface {
  videoId: string | null;
  onSearch: (youtubeId: string | null) => void;
  onReady: YouTubeProps["onReady"];
  onPlay: () => void;
  onPause: () => void;
}

const FireStoreContext = React.createContext<FireStoreContextInterface>({
  videoId: "",
  onSearch: (youtubeId) => {},
  onReady: (event) => {},
  onPlay: () => {},
  onPause: () => {},
});

export const FireStoreContextProvider = (props: any) => {
  const [videoId, setVideoId] = useState<string | null>("");
  const [player, setPlayer] = useState<YouTubePlayer>(null);
  const [startingTime, setStartingTime] = useState<number>(0);

  const timeJumpList = useRef<Array<number>>([]);

  // set up video player on loading
  useEffect(() => {
    const configureStartingTime = async () => {
      let docRefHelper = doc(db, "youtube-events", "on-update-state");
      let docSnapHelper = await getDoc(docRefHelper);
      const lastEvent = docSnapHelper?.data();
      const lastDate = new Date(lastEvent?.timestamp.seconds * 1000);
      const currentDate = new Date();
      const currentTime = Math.abs(lastDate.getTime() - currentDate.getTime()) / 1000;
      setStartingTime(currentTime + lastEvent?.time);
    };

    const loadVideoId = async () => {
      const docRef = doc(db, "youtube-events", "on-set-video");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setVideoId(docSnap.data().videoId);
      }
    };

    configureStartingTime();
    loadVideoId();
  }, []);

  // set up watcher for events
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "youtube-events"),
      (snapshot) => {
        if (player) {
          const changes = snapshot.docChanges();
          const eventData = changes[0].doc.data();
          if (["playVideo", "pauseVideo"].includes(eventData.action)) {
            player[eventData.action] && player[eventData.action]();
          }
          if (eventData.name === "onSetVideo") {
            setVideoId(eventData.videoId);
          }
          if (eventData.name === "onSeekTo") {
            player.seekTo(eventData.time, true);
          }
        }
      }
    );
    return () => {
      unsubscribe();
    };
  }, [player]);

  const configureTimeInterval = (player: YouTubePlayer) => {
    async function timeInterval() {
      if (player) {
        const currentTime = player.getCurrentTime();
        // calculate if there is a jump in time
        timeJumpList.current.push(currentTime);
        if (timeJumpList.current.length > 2) {
          timeJumpList.current.shift();
        }
        if (Math.abs(timeJumpList.current[1] - timeJumpList.current[0]) > 1.1) {
          setDoc(doc(db, "youtube-events", "on-update-state"), {
            owner: USER_ID,
            name: "onSeekTo",
            time: currentTime,
            timestamp: serverTimestamp(),
          });
        }
      }
    }
    setInterval(timeInterval, 1000);
  };

  const handleOnReady: YouTubeProps["onReady"] = (event) => {
    const { target: newPlayer } = event;
    setPlayer(newPlayer);
    configureTimeInterval(newPlayer);
    newPlayer.seekTo(startingTime);
  };

  const handleOnSearch = (youtubeId: string | null) => {
    setVideoId(youtubeId);
    setDoc(doc(db, "youtube-events", "on-set-video"), {
      owner: USER_ID,
      name: "onSetVideo",
      videoId: youtubeId,
      timestamp: serverTimestamp(),
    });
  };

  const handleOnPlay = () => {
    setDoc(doc(db, "youtube-events", "on-update-state"), {
      owner: USER_ID,
      name: "onPlay",
      action: "playVideo",
      time: player.getCurrentTime(),
      timestamp: serverTimestamp(),
    });
  };

  const handleOnPause = () => {
    setDoc(doc(db, "youtube-events", "on-update-state"), {
      owner: USER_ID,
      name: "onPause",
      action: "pauseVideo",
      time: player.getCurrentTime(),
      timestamp: serverTimestamp(),
    });
  };

  return (
    <FireStoreContext.Provider
      value={{
        videoId,
        onSearch: handleOnSearch,
        onReady: handleOnReady,
        onPlay: handleOnPlay,
        onPause: handleOnPause,
      }}
    >
      {props.children}
    </FireStoreContext.Provider>
  );
};

export default FireStoreContext;

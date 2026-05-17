import player from "play-sound";
import path from "path";

const audio = player();

export const playFaaah = () => {
  const soundPath = path.join(process.cwd(), "assets", "faaah.mp3");

  audio.play(soundPath, (err) => {
    if (err) {
      console.error("❌ Faaah sound failed:", err);
    } else {
      console.log("🔊 Faaah played");
    }
  });
};
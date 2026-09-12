export interface Song {
  id: string;
  title: string;
  artist: string;
  /** Path relative to public/ */
  src: string;
  /** Path relative to public/ */
  cover: string;
}

const songs: Song[] = [
  {
    id: "fri",
    title: "Fri",
    artist: "Parlband",
    src: "/audio/Fri.mp3",
    cover: "",
  },
];

export default songs;

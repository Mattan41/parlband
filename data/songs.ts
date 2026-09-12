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
    id: "1",
    title: "Summer Breeze",
    artist: "Parlband",
    src: "/audio/summer-breeze.mp3",
    cover: "/covers/summer-breeze.jpg",
  },
  {
    id: "2",
    title: "City Lights",
    artist: "Parlband",
    src: "/audio/city-lights.mp3",
    cover: "/covers/city-lights.jpg",
  },
];

export default songs;

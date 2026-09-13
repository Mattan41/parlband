export interface Song {
  id: string;
  title: string;
  artist: string;
  /** Streaming MP3 URL */
  src: string;
  /** High-quality WAV download URL */
  downloadSrc: string;
  /** Path relative to public/ */
  cover: string;
}

const songs: Song[] = [
  {
    id: "fri",
    title: "Fri",
    artist: "Pärlband",
    src: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/mp3/fri.mp3`,
    downloadSrc: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/wav/fri.wav`,
    cover: "",
  },
  {
    id: "som-en-legend",
    title: "Som en Legend",
    artist: "Pärlband",
    src: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/mp3/som-en-legend.mp3`,
    downloadSrc: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/wav/som-en-legend.wav`,
    cover: "",
  },
  {
    id: "cohen-och-kent",
    title: "Cohen och Kent",
    artist: "Pärlband",
    src: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/mp3/cohen-och-kent.mp3`,
    downloadSrc: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/wav/cohen-och-kent.wav`,
    cover: "",
  },
];

export default songs;

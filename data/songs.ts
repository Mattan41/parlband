export interface Song {
  id: string;
  title: string;
  artist: string;
  text: string;
  music: string;
  /** Streaming MP3 URL */
  src: string;
  /** High-quality WAV download URL */
  downloadSrc?: string;
  /** Path relative to public/ */
  cover: string;
}

const songs: Song[] = [
  {
    id: "fri",
    title: "Fri",
    artist: "Pärlband",
    text: "Nova Kruskopf Eriksson",
    music: "Nova Kruskopf Eriksson",
    src: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/mp3/fri.mp3`,
    downloadSrc: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/wav/fri.wav`,
    cover: "",
  },
  {
    id: "som-en-legend",
    title: "Som en Legend",
    artist: "Pärlband",
    text: "Mats Kruskopf Eriksson",
    music: "Mats Kruskopf Eriksson",
    src: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/mp3/som-en-legend.mp3`,
    downloadSrc: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/wav/som-en-legend.wav`,
    cover: "",
  },
  {
    id: "cohen-och-kent",
    title: "Cohen och Kent",
    artist: "Pärlband",
    text: "Isabel Evers",
    music: "Mats Kruskopf Eriksson",
    src: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/mp3/cohen-och-kent.mp3`,
    downloadSrc: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/wav/cohen-och-kent.wav`,
    cover: "",
  },
  {
    id: "mareld-i-natt",
    title: "Mareld i natt",
    artist: "Pärlband",
    text: "Nova Kruskopf Eriksson",
    music: "Nova Kruskopf Eriksson",
    src: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/mp3/mareld-i-natt.mp3`,
    cover: "",
  },
  {
    id: "sommarn-pa-boganeberget",
    title: "Sommarn på Boganeberget",
    artist: "Pärlband",
    text: "Nova Kruskopf Eriksson",
    music: "Nova Kruskopf Eriksson",
    src: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/mp3/sommarn-pa-boganeberget.mp3`,
    downloadSrc: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/wav/sommarn-pa-boganeberget.wav`,
    cover: "",
  },
  {
    id: "mitt-ute-pa-fyrken",
    title: "Mitt ute på Fryken",
    artist: "Pärlband",
    text: "Nova Kruskopf Eriksson",
    music: "Örjan Ahnoff",
    src: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/mp3/mitt-ute-pa-fryken.mp3`,
    downloadSrc: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/wav/mitt-ute-pa-fryken.wav`,
    cover: "",
  },
  {
    id: "klockan-12",
    title: "Klockan 12",
    artist: "Pärlband",
    text: "Mats Kruskopf Eriksson",
    music: "Mats Kruskopf Eriksson",
    src: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/mp3/klockan-12.mp3`,
    cover: "",
  },
  {
    id: "slaget-vid-poltava",
    title: "Slaget vid poltava",
    artist: "Pärlband",
    text: "Nova Kruskopf Eriksson",
    music: "Nova Kruskopf Eriksson",
    src: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/mp3/slaget-vid-poltava.mp3`,
    downloadSrc: `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/wav/slaget-vid-poltava.wav`,
    cover: "",
  },
];

export default songs;

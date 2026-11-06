/**
 * PratimaAR - Data Model & Target 3D
 * Urutan 1 s/d 6 sesuai urutan aset dan target:
 * 1. Buku
 * 2. Burung
 * 3. Ikan
 * 4. Kucing
 * 5. Meja
 * 6. Piring
 */

const ASSET_BASE_URL = "https://cdn.jsdelivr.net/gh/BlueRe-X/pratimaar@967363e";
const assetUrl = path => `${ASSET_BASE_URL}/${path}`;
const LARGE_MODEL_URL = "https://raw.githubusercontent.com/BlueRe-X/pratimaar/967363e8b4f2430a8687a585c15a2b415688a4fe/asset/2.glb";

const ITEMS_DATA = [
  {
    id: 1,
    targetIndex: 0,
    name: "Buku",
    latinName: "Liber",
    balineseName: "Cakepan",
    englishName: "Book",
    modelSrc: assetUrl("asset/1.glb"),
    imageSrc: assetUrl("img/1.jpg"),
    icon: "📖",
    // Penyesuaian visual 3D (scale, rotation, offset)
    modelConfig: {
      scale: "1.1 1.1 1.1",
      rotation: "90 0 0",
      position: "0 0 0"
    },
    descriptions: {
      id: "Buku adalah lembaran kertas berjilid yang berisi tulisan atau gambar untuk dibaca dan dipelajari.",
      en: "A book is a bound set of printed or blank sheets of paper used for reading and learning.",
      bali: "Cakepan inggih punika pupulan keretas matulis utawi magambar sané kajilid anggén wacénan miwah papelajahan."
    },
    // Konteks super ringkas untuk prompt Gemini (Hemat Token!)
    aiContext: "Objek: Buku (Cakepan/Book). Lembaran berjilid tempat ilmu & tulisan, tradisi lontar Bali.",
    quickPrompts: [
      "Apa filosofi Cakepan di Bali?",
      "Sejarah buku pertama?",
      "Manfaat rajin membaca?"
    ]
  },
  {
    id: 2,
    targetIndex: 1,
    name: "Burung",
    latinName: "Aves",
    balineseName: "Kedis",
    englishName: "Bird",
    modelSrc: LARGE_MODEL_URL,
    imageSrc: assetUrl("img/2.jpg"),
    icon: "🦅",
    modelConfig: {
      scale: "0.25 0.25 0.25",
      rotation: "90 0 0",
      position: "-0.3 -0.3 0" // Kompensasi offset pivot internal
    },
    descriptions: {
      id: "Burung adalah hewan bertulang belakang yang memiliki sayap, bulu, dan paruh, serta sebagian besar dapat terbang.",
      en: "A bird is a vertebrate animal characterized by feathers, wings, and a beak, with most species able to fly.",
      bali: "Kedis inggih punika beburon sané mawak bulun kedis, madué kampid, tur ketahnyané mrasidayang makeber."
    },
    aiContext: "Objek: Burung (Kedis/Bird). Vertebrata bersayap, bulu, paruh, mayoritas bisa terbang.",
    quickPrompts: [
      "Bagaimana burung terbang?",
      "Makna Kedis di Bali?",
      "Ciri khas burung?"
    ]
  },
  {
    id: 3,
    targetIndex: 2,
    name: "Ikan",
    latinName: "Pisces",
    balineseName: "Bé / Jukut",
    englishName: "Fish",
    modelSrc: assetUrl("asset/3.glb"),
    imageSrc: assetUrl("img/3.jpg"),
    icon: "🐟",
    hasAnimation: true,
    modelConfig: {
      scale: "0.12 0.12 0.12",
      rotation: "90 0 0",
      position: "0 0 0"
    },
    descriptions: {
      id: "Ikan adalah hewan berdarah dingin yang hidup di air, bernapas menggunakan insang, dan berenang menggunakan sirip.",
      en: "A fish is a cold-blooded animal that lives in water, breathes through gills, and swims using fins.",
      bali: "Bé / Jukut inggih punika sarwa beburon sané maurip ring toya, maangkian nganggén angkihan insang, tur ngelangi nganggén képes."
    },
    aiContext: "Objek: Ikan (Bé/Fish). Hewan air berdarah dingin bernapas insang & berenang bersirip.",
    quickPrompts: [
      "Bagaimana insang bekerja?",
      "Perbedaan istilah Bé & Jukut?",
      "Jenis sirip ikan?"
    ]
  },
  {
    id: 4,
    targetIndex: 3,
    name: "Kucing",
    latinName: "Felis catus",
    balineseName: "Méong",
    englishName: "Cat",
    modelSrc: assetUrl("asset/4.glb"),
    imageSrc: assetUrl("img/4.jpg"),
    icon: "🐱",
    modelConfig: {
      scale: "0.35 0.35 0.35",
      rotation: "90 0 0",
      position: "0 0 0"
    },
    descriptions: {
      id: "Kucing adalah hewan mamalia karnivora kecil berkaki empat yang sering dipelihara sebagai teman manusia.",
      en: "A cat is a small, four-legged carnivorous mammal often kept as a domestic pet.",
      bali: "Méong inggih punika buron mamalia alit sane madué batis patpat tur ketah kaubuh dados timpal manusa."
    },
    aiContext: "Objek: Kucing (Méong/Cat). Mamalia karnivora berkaki empat peliharaan manusia.",
    quickPrompts: [
      "Fakta unik kucing?",
      "Kenapa disebut Méong?",
      "Perilaku khas kucing?"
    ]
  },
  {
    id: 5,
    targetIndex: 4,
    name: "Meja",
    latinName: "Mensa",
    balineseName: "Méja",
    englishName: "Table",
    modelSrc: assetUrl("asset/5.glb"),
    imageSrc: assetUrl("img/5.jpg"),
    icon: "🪑",
    modelConfig: {
      scale: "0.18 0.18 0.18",
      rotation: "90 0 0",
      position: "0 0 0"
    },
    descriptions: {
      id: "Meja adalah perabot rumah tangga dengan permukaan datar dan kaki-kaki penopang, digunakan untuk menaruh barang atau bekerja.",
      en: "A table is a piece of furniture with a flat top and supporting legs, used for placing items or working.",
      bali: "Méja inggih punika prabot sané madué pamukaan asah miwah batis panopang, kaanggén genah ngenahang piranti utawi mekarya."
    },
    aiContext: "Objek: Meja (Méja/Table). Perabot permukaan datar berkaki untuk alas bekerja/barang.",
    quickPrompts: [
      "Jenis kayu terbaik untuk meja?",
      "Ergonomi meja yang baik?",
      "Fungsi meja dalam upacara Bali?"
    ]
  },
  {
    id: 6,
    targetIndex: 5,
    name: "Piring",
    latinName: "Discus",
    balineseName: "Piring / Pinggan",
    englishName: "Plate",
    modelSrc: assetUrl("asset/6.glb"),
    imageSrc: assetUrl("img/6.jpg"),
    icon: "🍽️",
    modelConfig: {
      scale: "0.8 0.8 0.8",
      rotation: "90 0 0",
      position: "0 0 0"
    },
    descriptions: {
      id: "Piring adalah wadah berbentuk ceper atau sedikit cekung yang digunakan sebagai tempat menaruh makanan saat makan.",
      en: "A plate is a flat or slightly concave dish used for holding and serving food during a meal.",
      bali: "Piring / Pinggan inggih punika piranti marupa bunter asah utawi léper sané kaanggén genah ngaturang utawi ngajeng dedaaran."
    },
    aiContext: "Objek: Piring (Pinggan/Plate). Wadah ceper/cekung saji makanan & tradisi makan bersama.",
    quickPrompts: [
      "Makna Pinggan dalam budaya Bali?",
      "Bahan piring ramah lingkungan?",
      "Tradisi Megibung (makan bersama)?"
    ]
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ITEMS_DATA };
}

// Tourist attractions in all 9 districts of Phitsanulok (beyond the 5 heritage sites with full stories).
// Every point is real: coordinates come from OpenStreetMap (ODbL) or Wikidata (CC0) and facts from the cited page.
// Descriptions only state what the source says. Photos are from Wikimedia Commons and show the place itself;
// places without a suitable photo get a name card instead of someone else's picture.
const OSM = (type, id) => ({ label: 'OpenStreetMap', url: `https://www.openstreetmap.org/${type}/${id}` });
const THWIKI = (title) => ({ label: 'Wikipedia (TH)', url: `https://th.wikipedia.org/wiki/${encodeURIComponent(title)}` });
const COMMONS = (file) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`;

export const ATTRACTIONS = [
  // ---------------------------------------------------------------- อำเภอเมืองพิษณุโลก
  {
    id: 'wat-chulamani', district: 'mueang', type: 'temple', lat: 16.78811, lng: 100.21710,
    name: { th: 'วัดจุฬามณี', en: 'Wat Chulamani' },
    desc: { th: 'โบราณสถานก่อนสมัยสุโขทัยริมฝั่งตะวันออกของแม่น้ำน่าน สมเด็จพระบรมไตรโลกนาถเสด็จออกผนวชที่วัดนี้เมื่อ พ.ศ. 2007', en: 'A pre-Sukhothai temple on the east bank of the Nan River, where King Borommatrailokkanat was ordained in 1464 (B.E. 2007).' },
    source: THWIKI('วัดจุฬามณี (จังหวัดพิษณุโลก)'),
    photo: { src: '/assets/photos/wat-chulamani.jpg', author: 'Chainwit.', license: 'CC BY-SA 4.0', page: COMMONS('Wat Chulamani, Phitsanulok วัดจุฬามณี พิษณุโลก (March 2022) - img 02.jpg') }
  },
  {
    id: 'phutthachinnarat-museum', district: 'mueang', type: 'museum', lat: 16.82444, lng: 100.26235,
    name: { th: 'พิพิธภัณฑสถานแห่งชาติ พระพุทธชินราช', en: 'Phra Phutthachinnarat National Museum' },
    desc: { th: 'พิพิธภัณฑ์ในบริเวณวัดพระศรีรัตนมหาธาตุวรมหาวิหาร (วัดใหญ่)', en: 'A national museum inside the grounds of Wat Phra Si Rattana Mahathat (Wat Yai).' },
    source: THWIKI('พิพิธภัณฑสถานแห่งชาติ พระพุทธชินราช')
  },
  {
    id: 'thawee-folk-museum', district: 'mueang', type: 'museum', lat: 16.80566, lng: 100.26736,
    name: { th: 'พิพิธภัณฑ์พื้นบ้านจ่าทวี', en: 'Sergeant Major Thawee Folk Museum' },
    desc: { th: 'พิพิธภัณฑ์พื้นบ้านในตัวเมืองพิษณุโลก', en: 'A folk museum in Phitsanulok city.' },
    source: OSM('node', 303924229)
  },
  {
    id: 'buranathai-foundry', district: 'mueang', type: 'attraction', lat: 16.80498, lng: 100.26780,
    name: { th: 'โรงหล่อพระบูรณะไทย (จ่าทวี)', en: 'Buranathai Buddha Casting Foundry' },
    desc: { th: 'โรงหล่อพระพุทธรูป ตั้งอยู่ใกล้พิพิธภัณฑ์พื้นบ้านจ่าทวี', en: 'A Buddha image foundry next to the Sergeant Major Thawee Folk Museum.' },
    source: OSM('node', 5243919947)
  },

  // ---------------------------------------------------------------- อำเภอนครไทย
  {
    id: 'phu-hin-rong-kla', district: 'nakhon-thai', type: 'park', lat: 17.00132, lng: 101.02628,
    name: { th: 'อุทยานแห่งชาติภูหินร่องกล้า', en: 'Phu Hin Rong Kla National Park' },
    desc: { th: 'อุทยานแห่งชาติแห่งที่ 48 ของประเทศ ประกาศเมื่อ พ.ศ. 2527 อยู่บนรอยต่อพิษณุโลก เพชรบูรณ์ และเลย', en: 'Thailand’s 48th national park, declared in 1984, on the border of Phitsanulok, Phetchabun and Loei.' },
    source: THWIKI('อุทยานแห่งชาติภูหินร่องกล้า')
  },
  {
    id: 'lan-hin-pum', district: 'nakhon-thai', type: 'viewpoint', lat: 16.99387, lng: 100.99109,
    name: { th: 'ลานหินปุ่ม', en: 'Lan Hin Pum' },
    desc: { th: 'ลานหินธรรมชาติในอุทยานแห่งชาติภูหินร่องกล้า', en: 'A natural rock field in Phu Hin Rong Kla National Park.' },
    source: OSM('node', 2541783399),
    photo: { src: '/assets/photos/lan-hin-pum.jpg', author: 'Tang2bar', license: 'CC BY-SA 4.0', page: COMMONS('Lan Hin Pum PHU HIN RONG KLA NATIONAL PARK.jpg') }
  },
  {
    id: 'pha-chu-thong', district: 'nakhon-thai', type: 'viewpoint', lat: 16.98941, lng: 100.99328,
    name: { th: 'ผาชูธง', en: 'Pha Chu Thong' },
    desc: { th: 'จุดชมวิวในอุทยานแห่งชาติภูหินร่องกล้า', en: 'A viewpoint in Phu Hin Rong Kla National Park.' },
    source: OSM('node', 2131210726)
  },
  {
    id: 'rom-klao-pharadon-waterfall', district: 'nakhon-thai', type: 'waterfall', lat: 16.99606, lng: 101.01518,
    name: { th: 'น้ำตกร่มเกล้า-ภราดร', en: 'Rom Klao–Pharadon Waterfall' },
    desc: { th: 'น้ำตกในอุทยานแห่งชาติภูหินร่องกล้า', en: 'A waterfall in Phu Hin Rong Kla National Park.' },
    source: OSM('node', 13108255102)
  },

  // ---------------------------------------------------------------- อำเภอชาติตระการ
  {
    id: 'chat-trakan-np', district: 'chat-trakan', type: 'park', lat: 17.29753, lng: 100.77504,
    name: { th: 'อุทยานแห่งชาติน้ำตกชาติตระการ', en: 'Namtok Chat Trakan National Park' },
    desc: { th: 'จัดตั้งเมื่อ พ.ศ. 2530 เป็นต้นน้ำหลายสายรวมถึงแม่น้ำแควน้อย', en: 'Established in 1987; the source of several streams, including the Khwae Noi River.' },
    source: THWIKI('อุทยานแห่งชาติน้ำตกชาติตระการ'),
    photo: { src: '/assets/photos/chat-trakan-np.jpg', author: 'Martin Püschel', license: 'CC BY-SA 3.0', page: COMMONS('Thailand 880.jpg') }
  },
  {
    id: 'chat-trakan-waterfall', district: 'chat-trakan', type: 'waterfall', lat: 17.29963, lng: 100.67978,
    name: { th: 'น้ำตกชาติตระการ (น้ำตกปากรอง)', en: 'Chat Trakan Waterfall (Pak Rong)' },
    desc: { th: 'จุดเที่ยวชมหลักของอุทยานแห่งชาติน้ำตกชาติตระการ', en: 'The main sight of Namtok Chat Trakan National Park.' },
    source: OSM('node', 5685331133),
    photo: { src: '/assets/photos/chat-trakan-waterfall.jpg', author: 'Chaiyathat', license: 'CC BY-SA 4.0', page: COMMONS('Chat Trakan Waterfall 01.jpg') }
  },
  {
    id: 'lan-son-phu-soi-dao', district: 'chat-trakan', type: 'camp', lat: 17.73795, lng: 100.98905,
    name: { th: 'ลานสน ภูสอยดาว', en: 'Lan Son, Phu Soi Dao' },
    desc: { th: 'จุดกางเต็นท์ลานสนในอุทยานแห่งชาติภูสอยดาว', en: 'The pine-field campsite in Phu Soi Dao National Park.' },
    source: OSM('node', 12042224447),
    photo: { src: '/assets/photos/lan-son-phu-soi-dao.jpg', author: 'Nutchana', license: 'CC BY-SA 4.0', page: COMMONS('Lan Son Phu Soi Dao - Phu soi dao National Park.jpg') }
  },

  // ---------------------------------------------------------------- อำเภอวังทอง
  {
    id: 'thung-salaeng-luang', district: 'wang-thong', type: 'park', lat: 16.82780, lng: 100.87000,
    name: { th: 'อุทยานแห่งชาติทุ่งแสลงหลวง', en: 'Thung Salaeng Luang National Park' },
    desc: { th: 'ทุ่งหญ้าสะวันนา อุทยานแห่งชาติใหญ่อันดับ 3 ของประเทศ ครอบคลุมวังทอง นครไทย เนินมะปราง และเพชรบูรณ์', en: 'Savanna grassland and Thailand’s third-largest national park, covering Wang Thong, Nakhon Thai, Noen Maprang and parts of Phetchabun.' },
    source: THWIKI('อุทยานแห่งชาติทุ่งแสลงหลวง')
  },
  {
    id: 'poi-waterfall', district: 'wang-thong', type: 'waterfall', lat: 16.84454, lng: 100.75101,
    name: { th: 'น้ำตกปอย', en: 'Poi Waterfall' },
    desc: { th: 'น้ำตกในอำเภอวังทอง', en: 'A waterfall in Wang Thong district.' },
    source: OSM('node', 2541915870)
  },
  {
    id: 'samo-khlaeng-chedi', district: 'wang-thong', type: 'temple', lat: 16.84590, lng: 100.40255,
    name: { th: 'พระมหาชัยเจดีย์ศรีสมอแคลง', en: 'Phra Maha Chai Chedi Si Samo Khlaeng' },
    desc: { th: 'เจดีย์บนเขาสมอแคลง อำเภอวังทอง', en: 'A chedi on Khao Samo Khlaeng hill, Wang Thong.' },
    source: OSM('node', 12679509701)
  },
  {
    id: 'khao-phanom-thong', district: 'wang-thong', type: 'forest', lat: 16.65346, lng: 100.56417,
    name: { th: 'วนอุทยานเขาพนมทอง', en: 'Khao Phanom Thong Forest Park' },
    desc: { th: 'วนอุทยานในอำเภอวังทอง', en: 'A forest park in Wang Thong district.' },
    source: OSM('way', 931696048)
  },

  // ---------------------------------------------------------------- อำเภอวัดโบสถ์
  {
    id: 'khwae-noi-dam', district: 'wat-bot', type: 'dam', lat: 17.18289, lng: 100.41104,
    name: { th: 'เขื่อนแควน้อยบำรุงแดน', en: 'Khwae Noi Bamrung Daen Dam' },
    desc: { th: 'โครงการอันเนื่องมาจากพระราชดำริ ช่วยป้องกันน้ำท่วมและเป็นแหล่งน้ำเพื่อการเกษตรในลุ่มน้ำแควน้อย', en: 'A royally initiated dam that eases floods and stores water for farming in the Khwae Noi basin.' },
    source: THWIKI('เขื่อนแควน้อยบำรุงแดน')
  },
  {
    id: 'khao-noi-khao-pradu', district: 'wat-bot', type: 'reserve', lat: 17.03766, lng: 100.42328,
    name: { th: 'เขตห้ามล่าสัตว์ป่าเขาน้อย-เขาประดู่', en: 'Khao Noi–Khao Pradu Non-Hunting Area' },
    desc: { th: 'เขตห้ามล่าสัตว์ป่าในอำเภอวัดโบสถ์', en: 'A non-hunting wildlife area in Wat Bot district.' },
    source: OSM('way', 931696049)
  },

  // ---------------------------------------------------------------- อำเภอเนินมะปราง
  {
    id: 'tham-phra-wang-daeng', district: 'noen-maprang', type: 'cave', lat: 16.67853, lng: 100.68744,
    name: { th: 'ถ้ำพระวังแดง', en: 'Tham Phra Wang Daeng' },
    desc: { th: 'ถ้ำหินปูนยาว 13 กิโลเมตร ยาวที่สุดในประเทศไทย อยู่ในอุทยานแห่งชาติทุ่งแสลงหลวง', en: 'A 13 km limestone cave, the longest in Thailand, inside Thung Salaeng Luang National Park.' },
    source: THWIKI('ถ้ำพระวังแดง')
  },
  {
    id: 'tham-pha-tha-phon', district: 'noen-maprang', type: 'reserve', lat: 16.51201, lng: 100.66459,
    name: { th: 'เขตห้ามล่าสัตว์ป่าถ้ำผาท่าพล', en: 'Tham Pha Tha Phon Non-Hunting Area' },
    desc: { th: 'ตั้งขึ้นเมื่อ 26 กรกฎาคม พ.ศ. 2526 เนื้อที่ 1,775 ไร่', en: 'Established on 26 July 1983, covering 1,775 rai (2.84 km²).' },
    source: THWIKI('เขตห้ามล่าสัตว์ป่าถ้ำผาท่าพล')
  },
  {
    id: 'tham-duan-tham-dao', district: 'noen-maprang', type: 'cave', lat: 16.56429, lng: 100.70100,
    name: { th: 'ถ้ำเดือน-ถ้ำดาว', en: 'Tham Duan – Tham Dao' },
    desc: { th: 'ถ้ำในอำเภอเนินมะปราง', en: 'Caves in Noen Maprang district.' },
    source: OSM('node', 11357323369)
  },

  // ---------------------------------------------------------------- อำเภอพรหมพิราม
  {
    id: 'naresuan-dam', district: 'phrom-phiram', type: 'dam', lat: 17.04764, lng: 100.18222,
    name: { th: 'เขื่อนนเรศวร', en: 'Naresuan Dam' },
    desc: { th: 'เขื่อนทดน้ำกั้นแม่น้ำน่าน ส่งน้ำให้พื้นที่เพาะปลูกสองฝั่งกว่า 150,000 ไร่', en: 'A diversion dam across the Nan River that irrigates more than 150,000 rai of farmland.' },
    source: THWIKI('เขื่อนนเรศวร'),
    photo: { src: '/assets/photos/naresuan-dam.jpg', author: 'Media lib', license: 'CC BY-SA 3.0', page: COMMONS('Naresuan-Damm1.JPG') }
  },
  {
    id: 'wat-phai-kho-nam', district: 'phrom-phiram', type: 'temple', lat: 16.92941, lng: 100.20498,
    name: { th: 'วัดไผ่ขอน้ำ', en: 'Wat Phai Kho Nam' },
    desc: { th: 'วัดริมฝั่งตะวันตกของแม่น้ำน่าน ตั้งวัดเมื่อ พ.ศ. 2307', en: 'A temple on the west bank of the Nan River, founded in 1764 (B.E. 2307).' },
    source: THWIKI('วัดไผ่ขอน้ำ')
  },
  {
    id: 'wat-krabang', district: 'phrom-phiram', type: 'temple', lat: 16.95972, lng: 100.23500,
    name: { th: 'วัดกระบังมังคลาราม', en: 'Wat Krabang Mangkhalaram' },
    desc: { th: 'วัดริมแม่น้ำแควน้อย บนเส้นทางพิษณุโลก-วัดโบสถ์', en: 'A riverside temple on the Khwae Noi, on the Phitsanulok–Wat Bot road.' },
    source: THWIKI('วัดกระบังมังคลาราม')
  },

  // ---------------------------------------------------------------- อำเภอบางกระทุ่ม
  {
    id: 'wat-ta-yom', district: 'bang-krathum', type: 'temple', lat: 16.59083, lng: 100.44194,
    name: { th: 'วัดตายม (หลวงพ่อยม)', en: 'Wat Ta Yom (Luang Pho Yom)' },
    desc: { th: 'ประดิษฐานหลวงพ่อยม พระพุทธรูปคู่บ้านคู่เมืองที่มีประวัติกว่า 700 ปี', en: 'Home of Luang Pho Yom, a revered Buddha image with a history of over 700 years.' },
    source: THWIKI('วัดตายม')
  },
  {
    id: 'wat-phrai-suwan', district: 'bang-krathum', type: 'temple', lat: 16.63089, lng: 100.24893,
    name: { th: 'วัดไพรสุวรรณ', en: 'Wat Phrai Suwan' },
    desc: { th: 'วัดริมฝั่งตะวันออกของแม่น้ำน่าน เดิมเป็นวัดร้าง บูรณะเมื่อ พ.ศ. 2455', en: 'A temple on the east bank of the Nan River, restored from ruins in 1912 (B.E. 2455).' },
    source: THWIKI('วัดไพรสุวรรณ')
  },

  // ---------------------------------------------------------------- อำเภอบางระกำ
  {
    id: 'nong-nam-khao', district: 'bang-rakam', type: 'reserve', lat: 16.77497, lng: 100.14622,
    name: { th: 'เขตห้ามล่าสัตว์ป่าหนองน้ำขาว', en: 'Nong Nam Khao Non-Hunting Area' },
    desc: { th: 'เขตห้ามล่าสัตว์ป่าในอำเภอบางระกำ', en: 'A non-hunting wildlife area in Bang Rakam district.' },
    source: OSM('way', 901888528)
  },
  {
    id: 'splash-fun-water-park', district: 'bang-rakam', type: 'waterpark', lat: 16.76895, lng: 100.14747,
    name: { th: 'สวนน้ำ สแปลชฟัน พิษณุโลก', en: 'Splash Fun Water Park Phitsanulok' },
    desc: { th: 'สวนน้ำของเอกชนในอำเภอบางระกำ', en: 'A privately run water park in Bang Rakam district.' },
    source: OSM('node', 5108997623)
  }
];

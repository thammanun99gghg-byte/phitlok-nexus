'use strict';
/*
 * Curated knowledge base for PHITLOK NEXUS v2.0 (Real-World Geospatial & Multi-Role Edition).
 * 13 verified locations in Phitsanulok (5 Heritage Sites, 5 Famous Restaurants/OTOP, 3 Hotels)
 * with exact GPS coordinates, Fine Arts Department references, real photos + local fallbacks,
 * and full 6-language cultural translations (TH, EN, ZH, JA, KO, FR).
 */

const ORIGIN_GPS = {
  name: 'สะพานนเรศวร (Naresuan Bridge)',
  lat: 16.8228,
  lng: 100.2612
};

/**
 * Convert real-world WGS84 GPS coordinates (lat, lng) into 3D scene plane coordinates (x, z)
 * anchored at Naresuan Bridge (16.8228, 100.2612) = (0, 0, 0).
 * +x = East, -x = West, -z = North, +z = South.
 */
function gpsTo3D(lat, lng) {
  const dxM = (lng - ORIGIN_GPS.lng) * 111320 * Math.cos((ORIGIN_GPS.lat * Math.PI) / 180);
  const dzM = -(lat - ORIGIN_GPS.lat) * 110574;
  const r = Math.hypot(dxM, dzM);
  if (r === 0) return { x: 0, z: 0, dxM: 0, dzM: 0, distFromCenterM: 0 };
  // Linear scale in central river corridor (1 unit = 34m within 480m), smooth radial compression for outer city
  const rScaled = r <= 480 ? r / 34 : (480 / 34) + Math.pow((r - 480) / 50, 0.52) * 1.65;
  const k = rScaled / r;
  return {
    x: +(dxM * k).toFixed(2),
    z: +(dzM * k).toFixed(2),
    dxM: Math.round(dxM),
    dzM: Math.round(dzM),
    distFromCenterM: Math.round(r)
  };
}

function haversineM(lat1, lng1, lat2, lng2) {
  const dx = (lng2 - lng1) * 111320 * Math.cos(((lat1 + lat2) * 0.5 * Math.PI) / 180);
  const dz = (lat2 - lat1) * 110574;
  return Math.round(Math.hypot(dx, dz));
}

// =========================================================================
// หมวด A: 5 สถานที่ท่องเที่ยวและประวัติศาสตร์จริง (พร้อมแหล่งอ้างอิงกรมศิลปากร)
// =========================================================================
const RAW_LANDMARKS = [
  {
    id: 'wat-yai',
    lat: 16.8239,
    lng: 100.2624,
    builtYearBe: 1900,
    fineArtsRef: {
      th: 'ทะเบียนโบราณสถาน กรมศิลปากร และสำนักศิลปากรที่ 6 สุโขทัย',
      en: 'Fine Arts Department National Ancient Monument Registry & 6th Regional Office of Fine Arts, Sukhothai',
      zh: '泰国艺术厅国家古迹登记册及素可泰第六艺术局',
      ja: 'タイ芸術局国家遺跡登録およびスコータイ第6芸術事務所',
      ko: '태국 예술청 국가고적등록 및 수코타이 제6예술사무소',
      fr: 'Registre des monuments anciens du Département des Beaux-Arts (6e Bureau, Sukhothai)'
    },
    imageUrl: '/assets/photos/wat-yai.jpg',
    // Same bytes as the Commons 960px thumbnail; checked by eye that it shows this place.
    photoCredit: {
      author: 'Supanut Arunoprayote',
      license: 'CC BY 4.0',
      source_url: 'https://commons.wikimedia.org/wiki/File:Wat_Phra_Si_Rattana_Mahathat,_Phitsanulok_(I).jpg'
    },
    fallbackImage: '/assets/photos/wat-yai.jpg',
    keywords: ['พระพุทธชินราช', 'ชินราช', 'วัดใหญ่', 'พระศรีรัตนมหาธาตุ', 'พระเหลือ', 'chinnarat', 'wat yai', 'mahathat'],
    name: {
      th: 'วัดพระศรีรัตนมหาธาตุวรมหาวิหาร (วัดใหญ่)',
      en: 'Wat Phra Si Rattana Mahathat (Wat Yai)',
      zh: '帕西拉达那玛哈泰寺（大寺 Wat Yai）',
      ja: 'ワット・プラシーラッタナーマハータート（ワット・ヤイ）',
      ko: '왓 프라 시 라따나 마하탓 (왓 야이)',
      fr: 'Wat Phra Si Rattana Mahathat (Wat Yai)'
    },
    summary: {
      th: 'สร้างขึ้นในปี พ.ศ. 1900 สมัยพระมหาธรรมราชาที่ 1 (ลิไท) ประดิษฐาน "พระพุทธชินราช" พระพุทธรูปศิลปะสุโขทัยหมวดพระพุทธชินราชที่ได้รับการยกย่องว่างดงามที่สุดในโลก และมีพระปรางค์ประธานศิลปะสมัยอยุธยาตอนต้น',
      en: 'Founded in 1357 CE (B.E. 1900) during the reign of King Maha Thammaracha I (Lithai). Enshrines Phra Phuttha Chinnarat, the late-Sukhothai bronze Buddha image revered as one of the most exquisite in the world, alongside an early-Ayutthaya central prang.',
      zh: '始建于佛历1900年（公元1357年）素可泰王朝摩诃坦玛拉差一世（立泰王）时期。寺内供奉被誉为世界最美佛像之一的“帕佛陀钦那拉”（成功佛），并矗立着阿瑜陀耶早期风格的中央高棉式佛塔（巴朗塔）。',
      ja: '仏暦1900年（西暦1357年）、スコータイ朝リタイ王の治世に創建。世界で最も美しい仏像と称えられるスコータイ様式の名불「プラ・プッタ・チンナラート」を本尊とし、アユタヤ初期様式の大プラーン（仏塔）がそびえます。',
      ko: '불기 1900년(서기 1357년) 수코타이 왕조 마하 탐마라차 1세(리타이 왕) 시대에 창건되었습니다. 세계에서 가장 아름다운 불상으로 손꼽히는 "프라 풋타 친나랏"이 모셔져 있으며 아유타야 초기 양식의 중앙 쁘랑 탑이 자리하고 있습니다.',
      fr: 'Fondé en 1357 (E.B. 1900) sous le règne du roi Maha Thammaracha Ier (Lithai). Il abrite le Phra Phuttha Chinnarat, statue de Bouddha de style Sukhothai considérée comme l’une des plus belles au monde, ainsi qu’un prang central du début de l’ère Ayutthaya.'
    },
    highlights: {
      th: ['สร้าง พ.ศ. 1900 สมัยพญาลิไท', 'พระพุทธชินราช ซุ้มเรือนแก้ว', 'พระปรางค์ประธานสมัยอยุธยาตอนต้น'],
      en: ['Founded 1357 CE by King Lithai', 'Phra Phuttha Chinnarat bronze Buddha', 'Early-Ayutthaya central Prang'],
      zh: ['公元1357年立泰王创建', '供奉世界最美成功佛', '阿瑜陀耶早期中央佛塔'],
      ja: ['1357年リタイ王により創建', '至高のプラ・プッタ・チンナラート', 'アユタヤ初期の中央プラーン'],
      ko: ['1357년 리타이 왕 창건', '세계 최고 미불 프라 풋타 친나랏', '아유타야 초기 중앙 쁘랑 탑'],
      fr: ['Fondé en 1357 par le roi Lithai', 'Bouddha Phra Phuttha Chinnarat', 'Prang central début Ayutthaya']
    },
    sections: [
      {
        title: {
          th: 'พระพุทธชินราชและซุ้มเรือนแก้ว',
          en: 'Phra Phuttha Chinnarat & Flame Halo',
          zh: '帕佛陀钦那拉与玻璃屋龛背光',
          ja: 'プラ・プッタ・チンナラートと光背',
          ko: '프라 풋타 친나랏과 광배 틀',
          fr: 'Phra Phuttha Chinnarat et son auréole'
        },
        body: {
          th: 'พระพุทธรูปสำริดกะไหล่ทองปางมารวิชัย หน้าตักกว้าง 5 ศอก 1 คืบ 5 นิ้ว หล่อขึ้นพร้อมพระพุทธชินสีห์และพระศรีศาสดา จุดเด่นคือซุ้มเรือนแก้วไม้สักแกะสลักลงรักปิดทองและบานประตูประดับมุกฝีมือช่างหลวงสมัยพระเจ้าอยู่หัวบรมโกศ พ.ศ. 2299',
          en: 'A gilded bronze Buddha in the Subduing Mara posture, cast alongside Phra Phuttha Chinnasi and Phra Si Satsada. Framed by a carved gilded teakwood flame arch (Sum Ruean Kaeo) and royal mother-of-pearl inlaid doors crafted in 1756 CE under King Borommakot.',
          zh: '镀金青铜降魔印佛像，与帕佛陀钦那西、帕西沙达同时铸造。配有精雕贴金柚木火焰背光框，以及公元1756年波隆摩阁王时期御匠制作的螺钿镶嵌大门。',
          ja: '降魔印を結ぶ金箔ブロンズ仏で、チーク材に金箔を施した美しい光背「スム・ルアン・ケーオ」に囲まれています。正面の螺鈿細工の扉は1756年にボロマコート王が造らせた王室工芸の傑作です。',
          ko: '항마촉지인 자세의 금동 불상으로 티크 목재에 금박을 입힌 화려한 광배 틀(쑴 르안 깨우)이 특징입니다. 1756년 보롬마꼿 왕 시대에 왕실 장인이 제작한 자개 문짝도 보존되어 있습니다.',
          fr: 'Bouddha en bronze doré prenant la posture de la victoire sur Mara, entouré d’une arche flamboyante en teck doré et de portes incrustées de nacre réalisées en 1756 sous le roi Borommakot.'
        }
      },
      {
        title: {
          th: 'พระปรางค์ประธานและพระอัฏฐารส',
          en: 'Central Prang & Standing Buddha',
          zh: '中央巴朗塔与十八肘立佛',
          ja: '中央プラーンとアッタロート立仏',
          ko: '중앙 쁘랑 탑과 입불상',
          fr: 'Prang central et Bouddha debout'
        },
        body: {
          th: 'ศูนย์กลางวัดเป็นพระปรางค์ประธานทรงฝักข้าวโพดที่สมเด็จพระบรมไตรโลกนาถโปรดให้แปลงจากเจดีย์ทรงพุ่มข้าวบิณฑ์เดิม ภายในบรรจุพระบรมสารีริกธาตุ ด้านหลังมีพระอัฏฐารสพระพุทธรูปยืนสูง 18 ศอกสมัยสุโขทัย',
          en: 'At the temple center rises the corn-cob shaped Prang reconstructed under King Borommatrailokanat over an earlier Sukhothai lotus-bud chedi to enshrine holy relics, flanked behind by the 18-cubit standing Buddha (Phra Attharot).',
          zh: '寺院中心是波隆摩戴莱洛迦纳王在原素可泰含苞莲花塔基础上改建的玉米穗状高棉式佛塔，内奉佛陀舍利；后方伫立着素可泰时期的十八肘高大立佛。',
          ja: '境内中央にはボロマトライローカナート王がスコータイ様式の蓮蕾形仏塔を改修した大プラーンが立ち、仏舎利を奉安しています。後方では高さ18キュビットの立仏プラ・アッタロートが参拝者を見守ります。',
          ko: '사원 중심에는 보롬마트라이로까낫 왕이 기존 수코타이 연꽃봉오리 탑을 개축한 옥수수 모양의 중앙 쁘랑이 우뚝 서 있으며, 뒤편에는 18규빗 높이의 수코타이 입불상 프라 앗타롯이 서 있습니다.',
          fr: 'Au cœur du temple s’élève le prang central remanié sous le roi Borommatrailokanat pour abriter des reliques sacrées, accompagné à l’arrière par le grand Bouddha debout Phra Attharot.'
        }
      }
    ],
    signText: 'วัดพระศรีรัตนมหาธาตุวรมหาวิหาร (วัดใหญ่)\nสร้าง พ.ศ. ๑๙๐๐ สมัยพระมหาธรรมราชาที่ ๑ (ลิไท)\nพระพุทธชินราช ศิลปะสุโขทัย\nทะเบียนโบราณสถาน กรมศิลปากร สำนักศิลปากรที่ ๖ สุโขทัย'
  },
  {
    id: 'chan-palace',
    lat: 16.8268,
    lng: 100.2581,
    builtYearBe: 2098,
    fineArtsRef: {
      th: 'รายงานการขุดแต่งทางโบราณคดี สำนักศิลปากรที่ 6 สุโขทัย',
      en: 'Archaeological Excavation Report, 6th Regional Office of Fine Arts, Sukhothai',
      zh: '素可泰第六艺术局考古发掘报告',
      ja: 'スコータイ第6芸術事務所 考古学発掘調査報告書',
      ko: '수코타이 제6예술사무소 고고학 발굴 보고서',
      fr: 'Rapport de fouilles archéologiques, 6e Bureau des Beaux-Arts de Sukhothai'
    },
    imageUrl: '/assets/photos/chan-palace.jpg',
    // Same bytes as the Commons 960px thumbnail; checked by eye that it shows this place.
    photoCredit: {
      author: 'Chainwit',
      license: 'CC BY-SA 4.0',
      source_url: 'https://commons.wikimedia.org/wiki/File:Chan_Royal_Palace_Historical_Center_(March_2022)_entrance.jpg'
    },
    fallbackImage: '/assets/photos/chan-palace.jpg',
    keywords: ['พระราชวังจันทน์', 'พระราชวังจันทร์', 'วังจันทน์', 'พระนเรศวร', 'สระสองห้อง', 'chan palace', 'naresuan', 'wang chan'],
    name: {
      th: 'พระราชวังจันทร์ (ศูนย์ประวัติศาสตร์พระราชวังจันทร์)',
      en: 'Chan Royal Palace Historical Center',
      zh: '詹宫历史中心（纳黎萱大帝诞生地）',
      ja: 'チャン王宮歴史センター（ナレースワン大王生誕地）',
      ko: '짠 왕궁 역사 센터 (나레쑤언 대왕 탄생지)',
      fr: 'Palais Royal de Chan (Centre Historique)'
    },
    summary: {
      th: 'ที่ประทับของพระมหากษัตริย์และพระมหาอุปราชตั้งแต่สมัยสุโขทัยถึงอยุธยา และเป็นสถานที่พระราชสมภพของสมเด็จพระนเรศวรมหาราชเมื่อปี พ.ศ. 2098 ปัจจุบันปรากฏหลักฐานแนวกำแพงอิฐโบราณและสระสองห้องที่ขุดค้นพบจริง',
      en: 'Royal residence of monarchs and viceroys from the Sukhothai to Ayutthaya eras, and the birthplace of King Naresuan the Great in 1555 CE (B.E. 2098). Features authentic excavated ancient brick ramparts and the historic Sra Song Hong twin pond.',
      zh: '从素可泰到阿瑜陀耶时期历代君王与副王的驻跸王宫，也是佛历2098年（公元1555年）纳黎萱大帝的诞生地。现存经考古发掘的真实古砖城垣遗址与“双室池”（Sra Song Hong）。',
      ja: 'スコータイ朝からアユタヤ朝にかけて王や副王が居城とし、1555年（仏暦2098年）にナレースワン大王が生誕した王宮跡です。発掘された古代レンガ城壁や「サ・ソン・ホン（二室の池）」の遺構が現存します。',
      ko: '수코타이부터 아유타야 시대까지 국왕과 부왕이 머물던 궁궐이자, 불기 2098년(서기 1555년) 나레쑤언 대왕이 탄생한 역사적 장소입니다. 실제 발굴된 고대 벽돌 성벽 유적과 싸썽홍 연못이 보존되어 있습니다.',
      fr: 'Résidence royale des monarques et vice-rois de Sukhothai à Ayutthaya, et lieu de naissance du roi Naresuan le Grand en 1555 (E.B. 2098). Présente les remparts en briques mis au jour et le bassin historique Sra Song Hong.'
    },
    highlights: {
      th: ['สถานที่พระราชสมภพพระนเรศวร พ.ศ. 2098', 'แนวกำแพงอิฐโบราณและสระสองห้อง', 'ขุดแต่งโดยสำนักศิลปากรที่ 6 สุโขทัย'],
      en: ['Birthplace of King Naresuan (1555 CE)', 'Excavated brick walls & Sra Song Hong pond', 'Verified by 6th Fine Arts Office'],
      zh: ['1555年纳黎萱大帝诞生地', '古砖墙基址与双室池遗迹', '第六艺术局考古发掘认证'],
      ja: ['1555年ナレースワン大王生誕地', '古代レンガ壁と二室の池遺構', '第6芸術事務所による発掘遺跡'],
      ko: ['1555년 나레쑤언 대왕 탄생지', '고대 벽돌 성벽과 싸썽홍 연못', '제6예술사무소 고고학 발굴'],
      fr: ['Lieu de naissance du roi Naresuan (1555)', 'Remparts de brique et bassin Sra Song Hong', 'Fouilles du 6e Bureau des Beaux-Arts']
    },
    sections: [
      {
        title: {
          th: 'การขุดแต่งทางโบราณคดีและสระสองห้อง',
          en: 'Archaeological Excavations & Sra Song Hong',
          zh: '考古发掘与双室池遗址',
          ja: '考古学発掘とサ・ソン・ホン',
          ko: '고고학 발굴과 싸썽홍 연못',
          fr: 'Fouilles archéologiques et Sra Song Hong'
        },
        body: {
          th: 'สำนักศิลปากรที่ 6 สุโขทัย ดำเนินการขุดแต่งทางโบราณคดีพบแนวกำแพงพระราชวังชั้นใน-ชั้นนอก ฐานพระที่นั่ง และสระสองห้องซึ่งเป็นสระน้ำโบราณในเขตพระราชฐาน พร้อมจัดตั้งศูนย์ประวัติศาสตร์พระราชวังจันทน์และศาลสมเด็จพระนเรศวรมหาราช',
          en: 'The 6th Regional Office of Fine Arts excavated the inner and outer palace walls, throne hall foundations, and Sra Song Hong ancient royal reservoir, establishing the Chan Palace Historical Center and King Naresuan Shrine.',
          zh: '素可泰第六艺术局通过考古发掘揭示了内外宫墙、宫殿基址及御苑内的“双室池”古水池，并建立了詹宫历史中心与纳黎萱大帝神祠。',
          ja: 'スコータイ第6芸術事務所の発掘調査により内宮・外宮の城壁や宮殿礎石、王宮内の古池「サ・ソン・ホン」が発見され、歴史センターおよびナレースワン大王祠として整備されました。',
          ko: '수코타이 제6예술사무소의 고고학 발굴을 통해 내성·외성 성벽과 전각 기단, 왕실 연못인 싸썽홍이 확인되었으며 현재 역사 센터와 나레쑤언 대왕 사당으로 운영되고 있습니다.',
          fr: 'Les fouilles du 6e Bureau des Beaux-Arts ont révélé les enceintes intérieure et extérieure, les fondations du palais et le réservoir royal Sra Song Hong, formant aujourd’hui le centre historique et le sanctuaire du roi Naresuan.'
        }
      }
    ],
    signText: 'พระราชวังจันทร์ (ศูนย์ประวัติศาสตร์พระราชวังจันทร์)\nสถานที่พระราชสมภพสมเด็จพระนเรศวรมหาราช พ.ศ. ๒๐๙๘\nแนวกำแพงอิฐโบราณและสระสองห้อง\nรายงานการขุดแต่งทางโบราณคดี สำนักศิลปากรที่ ๖ สุโขทัย'
  },
  {
    id: 'wat-nang-phaya',
    lat: 16.8226,
    lng: 100.2631,
    builtYearBe: 2090,
    fineArtsRef: {
      th: 'ข้อมูลโบราณสถานจังหวัดพิษณุโลก กระทรวงวัฒนธรรม',
      en: 'Phitsanulok Ancient Monuments Archive, Ministry of Culture',
      zh: '泰国文化部彭世洛府古迹档案',
      ja: 'タイ文化省ピッサヌローク県遺跡アーカイブ',
      ko: '태국 문화부 핏사눌록주 고적 아카이브',
      fr: 'Archives des monuments anciens de Phitsanulok, Ministère de la Culture'
    },
    imageUrl: '/assets/photos/wat-nang-phaya.jpg',
    // Same bytes as the Commons 960px thumbnail; checked by eye that it shows this place.
    photoCredit: {
      author: 'Chainwit',
      license: 'CC BY-SA 4.0',
      source_url: 'https://commons.wikimedia.org/wiki/File:Wat_Nang_Phaya,_Phitsanulok_-_%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%99%E0%B8%B2%E0%B8%87%E0%B8%9E%E0%B8%8D%E0%B8%B2_%E0%B8%9E%E0%B8%B4%E0%B8%A9%E0%B8%93%E0%B8%B8%E0%B9%82%E0%B8%A5%E0%B8%81_(March_2022)_-_img_01.jpg'
    },
    fallbackImage: '/assets/photos/wat-nang-phaya.jpg',
    keywords: ['วัดนางพญา', 'พระนางพญา', 'เบญจภาคี', 'พระวิสุทธิกษัตรีย์', 'nang phaya', 'benjaphakee'],
    name: {
      th: 'วัดนางพญา',
      en: 'Wat Nang Phaya',
      zh: '南帕亚寺（女王佛寺）',
      ja: 'ワット・ナンパヤー',
      ko: '왓 낭파야',
      fr: 'Wat Nang Phaya'
    },
    summary: {
      th: 'สันนิษฐานว่าสร้างโดยพระวิสุทธิกษัตรีย์ พระราชมารดาของสมเด็จพระนเรศวรมหาราช เป็นต้นกำเนิด "พระพิมพ์นางพญา" หนึ่งในชุดเบญจภาคีที่มีชื่อเสียงระดับประเทศ',
      en: 'Attributed to Queen Wisutthikasat, royal mother of King Naresuan the Great. World-renowned as the origin of the "Phra Nang Phaya" votive tablet, one of Thailand’s five supreme Benjaphakee amulets.',
      zh: '相传由纳黎萱大帝之母威苏提卡萨王后创建，是享誉全泰的五大古佛（Benjaphakee）之一“南帕亚女王佛”圣物的发源地。',
      ja: 'ナレースワン大王の母ウィスッティカサット王妃により創建されたと伝わる古刹。タイ五大古仏（ベンジャパーキー）の一つとして名高い「プラ・ナンパヤー」護符の発祥地です。',
      ko: '나레쑤언 대왕의 모후인 위쑷티까쌋 왕비가 창건한 것으로 전해지며, 태국 5대 명품 불상 부적(벤짜파키) 중 하나인 "프라 낭파야"의 발상지로 유명합니다.',
      fr: 'Attribué à la reine Wisutthikasat, mère du roi Naresuan le Grand. Célèbre pour être le berceau des tablettes votives « Phra Nang Phaya », l’une des cinq amulettes suprêmes Benjaphakee de Thaïlande.'
    },
    highlights: {
      th: ['สร้างโดยพระวิสุทธิกษัตรีย์', 'ต้นกำเนิดพระพิมพ์นางพญา (เบญจภาคี)', 'ประดิษฐานสมเด็จนางพญาเรือนแก้ว'],
      en: ['Founded by Queen Wisutthikasat', 'Origin of Benjaphakee Nang Phaya amulet', 'Enshrines Somdet Nang Phaya Ruean Kaeo'],
      zh: ['威苏提卡萨王后创建', '五大古佛之南帕亚女王佛发源地', '毗邻大寺南侧古迹群'],
      ja: ['ウィスッティカサット王妃創建', '五大古仏プラ・ナンパヤー発祥地', 'ワット・ヤイ南隣の由緒ある寺院'],
      ko: ['위쑷티까쌋 왕비 창건 유적', '태국 5대 부적 프라 낭파야 발상지', '솜뎃 낭파야 르안 깨우 봉안'],
      fr: ['Fondé par la reine Wisutthikasat', 'Origine de l’amulette Benjaphakee', 'Sanctuaire Somdet Nang Phaya']
    },
    sections: [
      {
        title: {
          th: 'กรุพระนางพญาและสถาปัตยกรรม',
          en: 'Nang Phaya Reliquary & Architecture',
          zh: '南帕亚佛塔地宫与建筑艺术',
          ja: 'ナンパヤー仏塔と建築様式',
          ko: '낭파야 유물함과 건축 양식',
          fr: 'Reliquaire Nang Phaya et architecture'
        },
        body: {
          th: 'พระพิมพ์นางพญาถูกค้นพบครั้งแรกเมื่อ พ.ศ. 2444 จากการพังทลายของเจดีย์รายภายในวัด ลักษณะเป็นพระพิมพ์เนื้อดินเผาประทับนั่งปางมารวิชัยในกรอบสามเหลี่ยม ภายในวิหารประดิษฐานสมเด็จนางพญาเรือนแก้วและมีลวดลายปูนปั้นโบราณ',
          en: 'First discovered in 1901 when a stupa collapsed on the temple grounds, the triangular terracotta Nang Phaya tablets depict the Buddha in the Subduing Mara posture. The main vihara enshrines Somdet Nang Phaya Ruean Kaeo alongside ancient stucco reliefs.',
          zh: '佛历2444年（公元1901年）寺内佛塔坍塌时首次出土三角形陶土降魔印南帕亚佛牌。主殿内供奉南帕亚主佛并保存有精美古灰泥浮雕。',
          ja: '1901年に境内の仏塔が崩れた際、三角形のテラコッタ製仏像護符が多数発見されました。本堂にはソムデット・ナンパヤー・ルアンケーオが祀られ、古代漆喰彫刻が残されています。',
          ko: '1901년 경내 불탑이 무너지면서 삼각형 모양의 테라코타 불상 부적이 처음 발견되었습니다. 법당 안에는 솜뎃 낭파야 본존불과 고대 스투코 부조 장식이 보존되어 있습니다.',
          fr: 'Découvertes en 1901 lors de l’effondrement d’un stupa, ces tablettes triangulaires en terre cuite sont devenues légendaires. Le vihara principal abrite Somdet Nang Phaya Ruean Kaeo et des stucs anciens.'
        }
      }
    ],
    signText: 'วัดนางพญา จังหวัดพิษณุโลก\nสร้างโดยพระวิสุทธิกษัตรีย์ พระราชมารดาสมเด็จพระนเรศวรมหาราช\nต้นกำเนิดพระพิมพ์นางพญา ชุดเบญจภาคี\nข้อมูลโบราณสถาน กระทรวงวัฒนธรรม'
  },
  {
    id: 'wat-ratchaburana',
    lat: 16.8214,
    lng: 100.2625,
    builtYearBe: 1950,
    fineArtsRef: {
      th: 'ทะเบียนโบราณสถาน กรมศิลปากร',
      en: 'National Ancient Monument Registry, Fine Arts Department',
      zh: '泰国艺术厅国家古迹登记册',
      ja: 'タイ芸術局 国家遺跡登録',
      ko: '태국 예술청 국가고적등록',
      fr: 'Registre national des monuments anciens, Département des Beaux-Arts'
    },
    imageUrl: '/assets/photos/wat-ratchaburana.jpg',
    // Same bytes as the Commons 960px thumbnail; checked by eye that it shows this place.
    photoCredit: {
      author: 'Chainwit',
      license: 'CC BY-SA 4.0',
      source_url: 'https://commons.wikimedia.org/wiki/File:March_2022_-_Royal_Stupa,_Wat_Ratcha_Burana,_Phitsanulok_-_%E0%B8%9E%E0%B8%A3%E0%B8%B0%E0%B9%80%E0%B8%88%E0%B8%94%E0%B8%B5%E0%B8%A2%E0%B9%8C%E0%B8%AB%E0%B8%A5%E0%B8%A7%E0%B8%87_%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%A3%E0%B8%B2%E0%B8%8A%E0%B8%9A%E0%B8%B9%E0%B8%A3%E0%B8%93%E0%B8%B0_%E0%B8%9E%E0%B8%B4%E0%B8%A9%E0%B8%93%E0%B8%B8%E0%B9%82%E0%B8%A5%E0%B8%81_-_img_01.jpg'
    },
    fallbackImage: '/assets/photos/wat-ratchaburana.jpg',
    keywords: ['วัดราชบูรณะ', 'เจดีย์หลวง', 'รามเกียรติ์', 'ratchaburana', 'royal stupa', 'ramakien'],
    name: {
      th: 'วัดราชบูรณะ',
      en: 'Wat Ratchaburana',
      zh: '拉差布拉那寺（皇家古佛塔寺）',
      ja: 'ワット・ラーチャブラナ',
      ko: '왓 랏차부라나',
      fr: 'Wat Ratchaburana'
    },
    summary: {
      th: 'โบราณสถานเก่าแก่ริมแม่น้ำน่าน โดดเด่นด้วยเจดีย์หลวงทรงกลมแบบลังกา และภาพจิตรกรรมฝาผนังเรื่องรามเกียรติ์ในพระอุโบสถที่เขียนขึ้นในสมัยรัชกาลที่ 3',
      en: 'Ancient riverside temple along the Nan River, distinguished by its towering Sri Lankan-style bell-shaped Luang Chedi and rare Rama III-era Ramakien murals inside the ordination hall.',
      zh: '坐落于难河畔的千年古刹，以高耸的斯里兰卡钟形“皇家大佛塔”及戒堂内绘制于拉玛三世时期的《拉玛坚》壁画而闻名。',
      ja: 'ナン川沿いに佇む歴史ある古刹。スリランカ様式の巨大な鐘形仏塔「チェーディー・ルアン」と、ラーマ3世時代に描かれた本堂の『ラーマキエン』壁画が見どころです。',
      ko: '난 강변에 자리한 고찰로 스리랑카 양식의 거대한 종 모양 불탑(제디 루앙)과 라마 3세 시대에 그려진 법당 내부의 라마끼엔 벽화로 유명합니다.',
      fr: 'Ancien temple au bord de la rivière Nan, remarquable pour son grand chedi cinghalais en forme de cloche et ses peintures murales du Ramakien datant du règne de Rama III.'
    },
    highlights: {
      th: ['เจดีย์หลวงทรงกลมแบบลังกา', 'จิตรกรรมฝาผนังรามเกียรติ์ สมัย ร.3', 'วิหารหลวงพ่อทองดำริมแม่น้ำน่าน'],
      en: ['Sri Lankan bell-shaped Royal Chedi', 'Rama III Ramakien temple murals', 'Luang Pho Thong Dam riverside shrine'],
      zh: ['斯里兰卡钟形皇家大佛塔', '拉玛三世时期《拉玛坚》壁画', '难河畔黑金佛古殿'],
      ja: ['スリランカ様式の大仏塔', 'ラーマ3世時代のラーマキエン壁画', 'ルアン・ポー・トーンダム仏堂'],
      ko: ['스리랑카 양식 제디 루앙 대탑', '라마 3세 시대 라마끼엔 벽화', '루앙 포 통담 불전'],
      fr: ['Grand Chedi royal de style cinghalais', 'Fresques du Ramakien (Rama III)', 'Sanctuaire Luang Pho Thong Dam']
    },
    sections: [
      {
        title: {
          th: 'เจดีย์หลวงและจิตรกรรมฝาผนังสมัยรัชกาลที่ 3',
          en: 'Luang Chedi & Rama III Murals',
          zh: '皇家大佛塔与拉玛三世壁画',
          ja: 'チェーディー・ルアンとラーマ3世壁画',
          ko: '제디 루앙 대탑과 라마 3세 벽화',
          fr: 'Chedi Luang et peintures murales'
        },
        body: {
          th: 'พระเจดีย์หลวงเป็นเจดีย์ทรงกลมแบบลังกาตั้งอยู่บนฐานแปดเหลี่ยมซ้อนชั้น สันนิษฐานว่าสมเด็จพระบรมไตรโลกนาถทรงปฏิสังขรณ์ ส่วนในพระอุโบสถมีหงส์ไม้แกะสลักที่หัวเสาและภาพจิตรกรรมฝาผนังปูนเปียกเรื่องรามเกียรติ์ที่ทรงคุณค่าทางศิลปะ',
          en: 'The great bell-shaped chedi rests on tiered octagonal bases, believed to have been restored by King Borommatrailokanat. Inside the ubosot, carved wooden hamsa swans crown the pillars beneath rare fresco murals of the Ramakien epic.',
          zh: '皇家大佛塔坐落于多层八角基座之上，相传由波隆摩戴莱洛迦纳王重修。戒堂柱头饰有木雕天鹅，墙面绘有珍贵的《拉玛坚》史诗壁画。',
          ja: '八角形の基壇が重なる上にそびえる大仏塔はボロマトライローカナート王が修復したと伝えられます。布薩堂（本堂）には木彫りのハンサ（聖鳥）と貴重なラーマキエン壁画が残っています。',
          ko: '팔각형 기단 위에 세워진 대불탑은 보롬마트라이로까낫 왕이 중수한 것으로 전해집니다. 우보솟(계당) 내부에는 목조 함사 조각과 예술적 가치가 높은 라마끼엔 벽화가 남아 있습니다.',
          fr: 'Le grand chedi repose sur des bases octogonales superposées, restaurées sous le roi Borommatrailokanat. L’ubosot conserve des cygnes hamsa sculptés et de précieuses fresques du Ramakien.'
        }
      }
    ],
    signText: 'วัดราชบูรณะ จังหวัดพิษณุโลก\nพระเจดีย์หลวงทรงกลมแบบลังกา\nจิตรกรรมฝาผนังเรื่องรามเกียรติ์ สมัยรัชกาลที่ ๓\nทะเบียนโบราณสถาน กรมศิลปากร'
  },
  {
    id: 'city-pillar',
    lat: 16.8245,
    lng: 100.2598,
    builtYearBe: 2540,
    fineArtsRef: {
      th: 'เทศบาลนครพิษณุโลก และกรมศิลปากร',
      en: 'Phitsanulok City Municipality & Fine Arts Department Architectural Division',
      zh: '彭世洛市政府与泰国艺术厅建筑设计局',
      ja: 'ピッサヌローク市自治体およびタイ芸術局建築部門',
      ko: '핏사눌록 시청 및 태국 예술청 건축부',
      fr: 'Municipalité de Phitsanulok et Département des Beaux-Arts'
    },
    imageUrl: '/assets/photos/city-pillar.jpg',
    fallbackImage: '/assets/photos/city-pillar.jpg',
    // Verified byte-for-byte against the Commons 960px thumbnail of this file.
    photoCredit: {
      author: 'Christophe95',
      license: 'CC BY-SA 4.0',
      source_url: 'https://commons.wikimedia.org/wiki/File:Phitsanulok_City_Pillar_Shrine_1.jpg'
    },
    keywords: ['ศาลหลักเมือง', 'หลักเมืองพิษณุโลก', 'สวนชมน่าน', 'city pillar', 'suan chom nan'],
    name: {
      th: 'ศาลหลักเมืองพิษณุโลก & สวนชมน่านเฉลิมพระเกียรติ',
      en: 'Phitsanulok City Pillar Shrine & Chom Nan River Park',
      zh: '彭世洛城隍庙与难河滨江公园',
      ja: 'ピッサヌローク市の柱祠（ラックムアン）＆チョムナーン公園',
      ko: '핏사눌록 시티 필라 사당 & 촘난 강변공원',
      fr: 'Sanctuaire du Pilier de la Ville & Parc Chom Nan'
    },
    summary: {
      th: 'อาคารยอดปรางค์ออกแบบโดยกรมศิลปากร เสาหลักเมืองทำจากไม้มงคล 3 ชนิด (ราชพฤกษ์ ชัยพฤกษ์ กัลปพฤกษ์) ตั้งอยู่ริมฝั่งตะวันตกของแม่น้ำน่าน เชื่อมต่อกับสวนพักผ่อนริมน้ำของชาวเมือง',
      en: 'Crown-prang pavilion designed by the Fine Arts Department housing the sacred City Pillar crafted from three auspicious woods (Ratchaphruek, Chaiyaphruek, Kanlapaphruek) on the west bank of the Nan River, adjoining Chom Nan Riverside Park.',
      zh: '由泰国艺术厅设计的巴朗尖顶神祠，供奉由阿勃勒、爪哇决明、粉红决明三种吉祥木制成的城柱，位于难河西岸，与市民休闲的难河滨江公园相连。',
      ja: '芸術局設計のプラーン屋根の祠堂に、3種の吉祥木（ゴールデンシャワー等）で作られた市の柱を奉安。ナン川西岸に位置し、市民の憩いの場であるチョムナーン河畔公園に隣接しています。',
      ko: '태국 예술청이 설계한 쁘랑 지붕 양식의 사당으로, 3가지 길상목으로 제작된 도시 기둥을 모시고 있습니다. 난 강 서쪽 기슭에 위치하며 시민들의 휴식처인 촘난 강변공원과 이어져 있습니다.',
      fr: 'Pavillon à toit prang conçu par le Département des Beaux-Arts, abritant le pilier sacré façonné dans trois bois auspicieux sur la rive ouest de la rivière Nan, jouxtant le parc Chom Nan.'
    },
    highlights: {
      th: ['อาคารยอดปรางค์ออกแบบโดยกรมศิลปากร', 'เสาหลักเมืองไม้มงคล 3 ชนิด', 'เชื่อมต่อสวนชมน่านเฉลิมพระเกียรติ'],
      en: ['Fine Arts Dept. Prang pavilion', 'Sacred pillar of 3 auspicious woods', 'Connected to Chom Nan River Park'],
      zh: ['艺术厅设计巴朗顶神祠', '三种吉祥木合一神圣城柱', '毗邻难河滨江长廊公园'],
      ja: ['芸術局設計のプラーン祠堂', '3種の吉祥木による聖柱', 'チョムナーン河畔公園に直結'],
      ko: ['예술청 설계 쁘랑 양식 사당', '3대 길상목으로 만든 성스러운 기둥', '촘난 강변공원 산책로 연결'],
      fr: ['Pavillon prang des Beaux-Arts', 'Pilier sacré en trois bois précieux', 'Relié au parc fluvial Chom Nan']
    },
    sections: [
      {
        title: {
          th: 'เสาหลักเมืองไม้มงคล 3 ชนิดและสวนชมน่าน',
          en: 'Three Auspicious Woods & Riverside Promenade',
          zh: '三木合一城柱与滨江长廊',
          ja: '三吉祥木の柱と河畔プロムナード',
          ko: '삼길상목 기둥과 강변 산책로',
          fr: 'Les trois bois sacrés et la promenade fluviale'
        },
        body: {
          th: 'เสาหลักเมืองพิษณุโลกแกะสลักจากไม้มงคล 3 ชนิดคือ ไม้ราชพฤกษ์ ไม้ชัยพฤกษ์ และไม้กัลปพฤกษ์ ยอดเสาเป็นรูปพรหมสี่หน้า อาคารจัตุรมุขยอดปรางค์สะท้อนศิลปะสุโขทัย-อยุธยา รายล้อมด้วยสวนชมน่านเฉลิมพระเกียรติริมแม่น้ำน่าน',
          en: 'Carved from Ratchaphruek, Chaiyaphruek, and Kanlapaphruek trunks topped with a four-faced Brahma finial, the pillar stands inside a four-porch prang pavilion overlooking the scenic Chom Nan riverside park.',
          zh: '城柱由三种吉祥良木合制而成，柱顶雕有四面梵天像，安奉于苏可泰-阿瑜陀耶风格的四面巴朗亭内，周围环绕着风景秀丽的难河滨江公园。',
          ja: 'ラーチャプルック、チャイヤプルック、カンラパプルックの3種の聖木から彫り出され、頂部には四面ブラフマー像を冠しています。周囲は緑豊かなチョムナーン河畔公園として親しまれています。',
          ko: '라차프륵, 차이야프륵, 깔라빠프륵 세 종류의 길상목으로 조각되었으며 꼭대기에는 사면 브라흐마상이 조각되어 있습니다. 주변은 아름다운 촘난 강변공원으로 조성되어 있습니다.',
          fr: 'Sculpté dans les bois de Ratchaphruek, Chaiyaphruek et Kanlapaphruek et surmonté d’un Brahma à quatre visages, le pilier domine la promenade verdoyante des berges de la Nan.'
        }
      }
    ],
    signText: 'ศาลหลักเมืองพิษณุโลก และสวนชมน่านเฉลิมพระเกียรติ\nอาคารยอดปรางค์ออกแบบโดยกรมศิลปากร\nเสาหลักเมืองไม้มงคล ๓ ชนิด ราชพฤกษ์ ชัยพฤกษ์ กัลปพฤกษ์\nเทศบาลนครพิษณุโลก และกรมศิลปากร'
  }
];

// Short names for map labels and image fallbacks (Thai ≤ 14 characters). Full names stay in the cards.
const SHORT_NAMES = {
  'wat-yai': { th: 'วัดใหญ่', en: 'Wat Yai', zh: '大寺', ja: 'ワット・ヤイ', ko: '왓 야이', fr: 'Wat Yai' },
  'chan-palace': { th: 'วังจันทร์', en: 'Chan Palace', zh: '詹宫', ja: 'チャン王宮', ko: '짠 왕궁', fr: 'Palais Chan' },
  'wat-nang-phaya': { th: 'วัดนางพญา', en: 'Wat Nang Phaya', zh: '南帕亚寺', ja: 'ワット・ナンパヤー', ko: '왓 낭파야', fr: 'Wat Nang Phaya' },
  'wat-ratchaburana': { th: 'วัดราชบูรณะ', en: 'Wat Ratchaburana', zh: '拉差布拉那寺', ja: 'ワット・ラーチャブラナ', ko: '왓 랏차부라나', fr: 'Wat Ratchaburana' },
  'city-pillar': { th: 'ศาลหลักเมือง', en: 'City Pillar Shrine', zh: '城隍庙', ja: '市の柱祠', ko: '시티 필라 사당', fr: 'Pilier de la ville' },
  'hoi-kha-noodles': { th: 'ห้อยขาริมน่าน', en: 'Hoi Kha Noodles', zh: '垂腿船面', ja: 'ホイカー麺', ko: '호이카 국수', fr: 'Nouilles Hoi Kha' },
  'juk-kai-thai': { th: 'จุกไก่ไทย', en: 'Juk Kai Thai', zh: '泰式鸡饭', ja: 'ジュック・ガイ・タイ', ko: '죽 까이 타이', fr: 'Juk Kai Thai' },
  'pa-lom-noodles': { th: 'ไก่ป้าล้อม', en: 'Pa Lom Noodles', zh: '阿嬷炖鸡面', ja: 'パー・ロム麺', ko: '빠롬 국수', fr: 'Nouilles Pa Lom' },
  'pa-thanom-padthai': { th: 'ผัดไทยป้าถนอม', en: 'Pa Thanom Pad Thai', zh: '古法炒河粉', ja: 'パー・タノム', ko: '빠타놈 팟타이', fr: 'Pad thaï Pa Thanom' },
  'bang-krathum-otop': { th: 'ของฝากกล้วยตาก', en: 'Dried Banana Shop', zh: '香蕉干特产', ja: '干しバナナ土産', ko: '바나나 기념품', fr: 'Bananes séchées' },
  'yodia-heritage': { th: 'โยเดีย', en: 'Yodia Heritage', zh: 'Yodia 酒店', ja: 'ヨディア', ko: '요디아', fr: 'Yodia Heritage' },
  'topland-hotel': { th: 'ท็อปแลนด์', en: 'Topland', zh: '托普兰酒店', ja: 'トップランド', ko: '탑랜드', fr: 'Topland' },
  'imperial-hotel': { th: 'อิมพีเรียล', en: 'The Imperial', zh: '帝国酒店', ja: 'インペリアル', ko: '임페리얼', fr: 'The Imperial' }
};

const LANDMARKS = RAW_LANDMARKS.map((lm) => {
  const pos = gpsTo3D(lm.lat, lm.lng);
  return {
    ...lm,
    shortName: SHORT_NAMES[lm.id],
    x: pos.x,
    z: pos.z,
    dxM: pos.dxM,
    dzM: pos.dzM,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lm.lat},${lm.lng}`,
    googleEarthUrl: `https://earth.google.com/web/search/${lm.lat},${lm.lng}`
  };
});

// =========================================================================
// หมวด B (5 ร้านอาหาร/ของฝาก) + หมวด C (3 โรงแรมที่พัก) = 8 สถานที่สาธิตบนแผนที่
// =========================================================================
const DEMO_PROMPTPAY_ID = (process.env.DEMO_PROMPTPAY_ID || '').trim();

const RAW_MERCHANTS = [
  // --- 5 ร้านอาหารและของฝากในพิษณุโลก (สถานะเริ่มต้น: ข้อมูลสาธิต ยังไม่ใช่พาร์ทเนอร์) ---
  {
    slug: 'hoi-kha-noodles',
    kind: 'restaurant',
    category: 'food',
    partner_status: 'demo',
    lat: 16.8251,
    lng: 100.2618,
    nearest: 'wat-yai',
    plan: 'restaurant_saas',
    monthly_fee_satang: 19900,
    stamp_coupon_percent: 15,
    featured: 1,
    promptpay_id: DEMO_PROMPTPAY_ID,
    shop_status: 'open',
    imageUrl: '/assets/photos/hoi-kha-noodles.jpg',
    fallbackImage: '/assets/photos/hoi-kha-noodles.jpg',
    name: {
      th: 'ก๋วยเตี๋ยวห้อยขา ริมน่าน (ซอยพุทธบูชา ข้างวัดใหญ่)',
      en: 'Hoi Kha Hanging-Leg Noodles Rim Nan (Next to Wat Yai)',
      zh: '难河畔垂腿船面（大寺旁菩提布查巷）',
      ja: 'ホイカー足垂らしヌードル・リムナーン（ワット・ヤイ横）',
      ko: '호이카 난 강변 다리 걸치고 먹는 국수 (왓 야이 옆)',
      fr: 'Nouilles Hoi Kha au bord de la Nan (près de Wat Yai)'
    },
    blurb: {
      th: 'ต้นตำรับนั่งห้อยขาริมแม่น้ำน่าน ซอยพุทธบูชาข้างวัดใหญ่ น้ำซุปต้มยำสุโขทัยถั่วป่นคั่วสดและซี่โครงหมูอ่อนตุ๋น',
      en: 'Iconic riverside noodle house on Phutthabucha Alley next to Wat Yai. Famous for Sukhothai tom yum noodles with roasted peanuts and tender pork ribs.',
      zh: '位于大寺旁菩提布查巷的标志性河畔面馆，双腿悬垂赏河景，招牌素可泰酸辣花生碎汤面与软骨排骨面。',
      ja: 'ワット・ヤイ横のプッタบูチャー通りにある名物店。川辺で足を垂らして座り、スコータイ風トムヤム麺や軟骨スペアリブ麺を味わえます。',
      ko: '왓 야이 옆 풋타부차 골목의 명물 국수집. 난 강변에 다리를 걸치고 앉아 수코타이식 땅콩 똠얌 국수와 연골 돼지갈비 국수를 즐길 수 있습니다.',
      fr: 'Célèbre restaurant au bord de la rivière Nan près de Wat Yai, où l’on déguste des nouilles tom yum de Sukhothai les jambes suspendues au-dessus de l’eau.'
    }
  },
  {
    slug: 'juk-kai-thai',
    kind: 'restaurant',
    category: 'food',
    partner_status: 'demo',
    lat: 16.8195,
    lng: 100.2642,
    nearest: 'wat-ratchaburana',
    plan: 'restaurant_saas',
    monthly_fee_satang: 19900,
    stamp_coupon_percent: 15,
    featured: 1,
    promptpay_id: DEMO_PROMPTPAY_ID,
    shop_status: 'open',
    imageUrl: '/assets/photos/juk-kai-thai.jpg',
    fallbackImage: '/assets/photos/juk-kai-thai.jpg',
    name: {
      th: 'จุกไก่ไทย (ตำนานข้าวมันไก่-สะเต๊ะ เมืองพิษณุโลก)',
      en: 'Juk Kai Thai (Legendary Hainanese Chicken Rice & Satay)',
      zh: 'Juk泰式海南鸡饭与炭烤沙爹老店',
      ja: 'ジュック・ガイ・タイ（老舗カオマンガイ＆サテ）',
      ko: '죽 까이 타이 (핏사눌록 전통 카오만까이 & 사테 맛집)',
      fr: 'Juk Kai Thai (Riz au poulet légendaire & Satay)'
    },
    blurb: {
      th: 'ร้านข้าวมันไก่ตอนสับเนื้อนุ่มและหมูสะเต๊ะย่างเตาถ่านระดับตำนานคู่เมืองพิษณุโลก น้ำจิ้มเต้าเจี้ยวขิงสดรสเด็ด',
      en: 'Phitsanulok’s legendary Hainanese poached chicken rice and charcoal-grilled pork satay, served with signature ginger-soybean dip.',
      zh: '彭世洛传奇老字号，主打鲜嫩白切鸡油饭与炭火现烤猪肉沙爹，配秘制鲜姜豆瓣酱。',
      ja: 'ピッサヌロークで世代を超えて愛される老舗。しっとり柔らかいカオマンガイ（鶏飯）と炭火焼きポークサテが絶品です。',
      ko: '핏사눌록을 대표하는 전통 맛집으로 부드러운 토종닭 카오만까이와 숯불에 구운 돼지고기 사테가 일품입니다.',
      fr: 'Institution culinaire de Phitsanulok réputée pour son riz au poulet poché fondant et ses brochettes de porc satay grillées au charbon de bois.'
    }
  },
  {
    slug: 'pa-lom-noodles',
    kind: 'restaurant',
    category: 'food',
    partner_status: 'demo',
    lat: 16.8128,
    lng: 100.2595,
    nearest: 'wat-ratchaburana',
    plan: 'restaurant_saas',
    monthly_fee_satang: 19900,
    stamp_coupon_percent: 10,
    featured: 1,
    promptpay_id: DEMO_PROMPTPAY_ID,
    shop_status: 'open',
    imageUrl: '/assets/photos/pa-lom-noodles.jpg',
    fallbackImage: '/assets/photos/pa-lom-noodles.jpg',
    name: {
      th: 'ก๋วยเตี๋ยวไก่ป้าล้อม (วัดจันทร์ตะวันออก)',
      en: 'Pa Lom Braised Chicken Noodles (Wat Chan Tawan Ok)',
      zh: 'Pa Lom阿嬷药膳炖鸡面（东詹寺）',
      ja: 'パー・ロム鶏煮込みヌードル（ワット・チャン東）',
      ko: '빠롬 한방 닭국수 (왓 짠 따완옥)',
      fr: 'Nouilles au poulet braisé de Pa Lom (Wat Chan Est)'
    },
    blurb: {
      th: 'ก๋วยเตี๋ยวไก่ตุ๋นยาจีนเจ้าดังย่านวัดจันทร์ตะวันออก น่องไก่เปื่อยนุ่ม ตีนไก่ละลายในปาก และไข่อ่อนต้มยางมะตูม',
      en: 'Beloved local noodle shop in Wat Chan Tawan Ok, famed for Chinese-herb braised drumsticks, melt-in-the-mouth chicken feet, and soft-yolk eggs.',
      zh: '东詹寺街区超人气老店，中药材慢炖鸡腿软烂入味，搭配入口即化的凤爪与溏心幼蛋。',
      ja: 'ワット・チャン東エリアの人気店。漢方スパイスでじっくり煮込んだ鶏もも肉やトロトロのもみじ（鶏足）、半熟キンカン卵が自慢です。',
      ko: '왓 짠 따완옥 지역의 유명 맛집으로 한방 약재로 푹 고아낸 닭다리와 입에서 녹는 닭발, 반숙 알집 토핑이 유명합니다.',
      fr: 'Adresse incontournable du quartier Wat Chan Est, célèbre pour ses pilons de poulet braisés aux herbes chinoises et son bouillon parfumé.'
    }
  },
  {
    slug: 'pa-thanom-padthai',
    kind: 'restaurant',
    category: 'food',
    partner_status: 'demo',
    lat: 16.8208,
    lng: 100.2602,
    nearest: 'wat-ratchaburana',
    plan: 'restaurant_saas',
    monthly_fee_satang: 19900,
    stamp_coupon_percent: 10,
    featured: 1,
    promptpay_id: DEMO_PROMPTPAY_ID,
    shop_status: 'open',
    imageUrl: '/assets/photos/pa-thanom-padthai.jpg',
    fallbackImage: '/assets/photos/pa-thanom-padthai.jpg',
    name: {
      th: 'ผัดไทยป้าถนอม & ขนมเบื้องโบราณ ริมน่าน',
      en: 'Pa Thanom Ancient Pad Thai & Crispy Crepes Rim Nan',
      zh: 'Pa Thanom古法泰式炒河粉与传统脆煎饼',
      ja: 'パー・タノム伝統パッタイ＆カノムブアン（ナン川沿い）',
      ko: '빠타놈 옛날식 팟타이 & 전통 카놈브앙 (난 강변)',
      fr: 'Pad Thaï traditionnel de Pa Thanom & Crêpes croustillantes'
    },
    blurb: {
      th: 'ผัดไทยเส้นจันท์เหนียวนุ่มผัดซอสมะขามเตาถ่านห่อไข่กุ้งสด และขนมเบื้องไทยโบราณไส้หวาน-ไส้เค็มมะพร้าวขูดหอมกรุ่นริมแม่น้ำน่าน',
      en: 'Wok-fried tamarind Pad Thai wrapped in thin egg crepe with fresh river prawns, paired with traditional sweet and savory Thai crispy crepes (Khanom Bueang).',
      zh: '炭火罗望子酱炒尖竹汶河粉配鲜虾蛋皮包裹，以及难河畔现做的椰丝甜咸双味古法泰式脆饼。',
      ja: 'タマリンドソースが香る炭火炒めの卵包みエビパッタイと、削りたてココナッツを使った伝統菓子カノムブアンの名店です。',
      ko: '타마린드 소스로 볶아 계란 지단으로 감싼 생새우 팟타이와 고소한 코코넛을 얹은 태국 전통 크레페 카놈브앙 전문점입니다.',
      fr: 'Pad Thaï au tamarin enveloppé d’une fine omelette aux crevettes fraîches, accompagné de crêpes croustillantes thaïes anciennes (Khanom Bueang).'
    }
  },
  {
    slug: 'bang-krathum-otop',
    kind: 'restaurant',
    category: 'souvenir',
    partner_status: 'demo',
    lat: 16.8232,
    lng: 100.2640,
    nearest: 'wat-yai',
    plan: 'restaurant_saas',
    monthly_fee_satang: 19900,
    stamp_coupon_percent: 15,
    featured: 1,
    promptpay_id: DEMO_PROMPTPAY_ID,
    shop_status: 'open',
    imageUrl: '/assets/photos/bang-krathum-otop.jpg',
    fallbackImage: '/assets/photos/bang-krathum-otop.jpg',
    name: {
      th: 'ศูนย์ของฝากกล้วยตากบางกระทุ่ม & หมี่ซั่วพิษณุโลก',
      en: 'Bang Krathum Solar-Dried Banana & Phitsanulok Mee Sua OTOP Center',
      zh: '邦卡通太阳能香蕉干与彭世洛长寿面伴手礼中心',
      ja: 'バーンクラトゥム干しバナナ＆ピッサヌローク麺OTOPセンター',
      ko: '방끄라툼 태양광 바나나 말랭이 & 핏사눌록 미쑤아 기념품 센터',
      fr: 'Centre OTOP Bananes séchées de Bang Krathum & Nouilles Mee Sua'
    },
    blurb: {
      th: 'รวมสุดยอดของฝาก GI พิษณุโลก กล้วยตากพลังงานแสงอาทิตย์พาราโบลาโดมหวานธรรมชาติ หมี่ซั่วเตาถ่าน และน้ำพริกกุ้งเสียบสมุนไพร',
      en: 'Official GI souvenir hub featuring parabolic solar-dome dried bananas from Bang Krathum, traditional hand-pulled Mee Sua noodles, and herbal crispy shrimp chili paste.',
      zh: '汇集彭世洛地理标志（GI）特产：抛物面太阳能温室自然晒制香蕉干、传统炭烘长寿面（Mee Sua）及香草虾干辣酱。',
      ja: 'ピッサヌロークの名産品が一堂に。ソーラードーム熟成の無添加干しバナナや伝統製法のミー・スア（長寿麺）、ハーブ海老ナムプリックが揃います。',
      ko: '파라볼라 태양광 돔에서 자연 숙성한 방끄라툼 바나나 말랭이와 전통 수제 장수면(미쑤아), 허브 새우 칠리 페이스트를 만날 수 있는 특산품 센터입니다.',
      fr: 'Centre officiel de souvenirs OTOP : bananes séchées sous dôme solaire de Bang Krathum, nouilles artisanales Mee Sua et pâte de piment aux crevettes.'
    }
  },

  // --- 3 โรงแรมและสถานที่พักผ่อนในพิษณุโลก ---
  {
    slug: 'yodia-heritage',
    kind: 'hotel',
    category: 'stay',
    partner_status: 'demo',
    lat: 16.8285,
    lng: 100.2588,
    nearest: 'chan-palace',
    plan: 'hotel_saas',
    monthly_fee_satang: 49900,
    room_rate_satang: 185000,
    stamp_coupon_percent: 10,
    featured: 1,
    promptpay_id: DEMO_PROMPTPAY_ID,
    shop_status: 'open',
    imageUrl: '/assets/photos/yodia-heritage.jpg',
    fallbackImage: '/assets/photos/yodia-heritage.jpg',
    name: {
      th: 'Yodia Heritage Hotel (โยเดีย เฮอริเทจ โฮเทล)',
      en: 'Yodia Heritage Hotel (Nan Riverside Boutique Hotel)',
      zh: 'โยเดีย历史文化精品酒店（Yodia Heritage Hotel）',
      ja: 'ヨディア・ヘリテージ・ホテル（Yodia Heritage Hotel）',
      ko: '요디아 헤리티지 호텔 (Yodia Heritage Hotel)',
      fr: 'Yodia Heritage Hotel (Hôtel Boutique au bord de la Nan)'
    },
    blurb: {
      th: 'บูติคโฮเทลริมแม่น้ำน่าน ติดพระราชวังจันทร์ ตกแต่งกลิ่นอายประวัติศาสตร์อยุธยา-สุโขทัย พร้อมสระว่ายน้ำและอาหารเช้าพื้นเมือง | ราคาตัวอย่างเริ่มต้น 1,850 บาท/คืน',
      en: 'Boutique riverside sanctuary beside Chan Royal Palace blending Ayutthaya-Sukhothai heritage aesthetics with river views. Sample rate from 1,850 THB/night.',
      zh: '紧邻詹宫的难河畔精品文化酒店，融合阿瑜陀耶与素可泰古典美学，含河景泳池与本地特色早餐 | 示例价格1,850泰铢/晚起。',
      ja: 'チャン王宮のすぐ隣、ナン川沿いに佇むブティックホテル。アユタヤとスコータイの歴史美が融合した空間です｜参考価格1泊1,850バーツ〜。',
      ko: '짠 왕궁 바로 옆 난 강변에 위치한 부티크 호텔로 아유타야와 수코타이 역사 미학을 담고 있습니다 | 예시 요금 1박 1,850바트부터.',
      fr: 'Hôtel-boutique de charme au bord de la rivière Nan, jouxtant le Palais Royal de Chan | Tarif indicatif dès 1 850 THB/nuit.'
    }
  },
  {
    slug: 'topland-hotel',
    kind: 'hotel',
    category: 'stay',
    partner_status: 'demo',
    lat: 16.8221,
    lng: 100.2658,
    nearest: 'wat-yai',
    plan: 'hotel_saas',
    monthly_fee_satang: 49900,
    room_rate_satang: 129000,
    stamp_coupon_percent: 10,
    featured: 1,
    promptpay_id: DEMO_PROMPTPAY_ID,
    shop_status: 'open',
    imageUrl: '/assets/photos/topland-hotel.jpg',
    fallbackImage: '/assets/photos/topland-hotel.jpg',
    name: {
      th: 'Topland Hotel & Convention Centre (โรงแรมท็อปแลนด์)',
      en: 'Topland Hotel & Convention Centre Phitsanulok',
      zh: '彭世洛托普兰会议中心大酒店（Topland Hotel）',
      ja: 'トップランド・ホテル＆コンベンションセンター',
      ko: '탑랜드 호텔 & 컨벤션 센터 (Topland Hotel)',
      fr: 'Topland Hotel & Convention Centre Phitsanulok'
    },
    blurb: {
      th: 'โรงแรมแลนด์มาร์กใจกลางเมือง ห่างจากวัดใหญ่และสะพานนเรศวรเพียง 400 เมตร มองเห็นวิวแม่น้ำน่านมุมสูงและตัวเมืองพิษณุโลก | ราคาตัวอย่างเริ่มต้น 1,290 บาท/คืน',
      en: 'Iconic high-rise landmark hotel in the city center, just 400 m from Wat Yai and Naresuan Bridge with panoramic Nan River views. Sample rate from 1,290 THB/night.',
      zh: '市中心地标高空酒店，距离大寺与纳黎萱桥仅400米，俯瞰难河全景与彭世洛城市天际线 | 示例价格1,290泰铢/晚起。',
      ja: 'ワット・ヤイやナレースワン橋からわずか400m、市街中心部にそびえるランドマークホテル｜参考価格1泊1,290バーツ〜。',
      ko: '왓 야이와 나레쑤언 다리에서 불과 400m 거리에 위치한 도심 랜드마크 호텔로 난 강의 파노라마 전망을 자랑합니다 | 예시 요금 1박 1,290바트부터.',
      fr: 'Hôtel emblématique au cœur de la ville, à seulement 400 m de Wat Yai et du pont Naresuan | Tarif indicatif dès 1 290 THB/nuit.'
    }
  },
  {
    slug: 'imperial-hotel',
    kind: 'hotel',
    category: 'stay',
    partner_status: 'demo',
    lat: 16.8042,
    lng: 100.2785,
    nearest: 'wat-ratchaburana',
    plan: 'hotel_saas',
    monthly_fee_satang: 49900,
    room_rate_satang: 145000,
    stamp_coupon_percent: 10,
    featured: 1,
    promptpay_id: DEMO_PROMPTPAY_ID,
    shop_status: 'open',
    imageUrl: '/assets/photos/imperial-hotel.jpg',
    fallbackImage: '/assets/photos/imperial-hotel.jpg',
    name: {
      th: 'The Imperial Hotel & Convention Centre Phitsanulok',
      en: 'The Imperial Hotel & Convention Centre Phitsanulok',
      zh: '彭世洛帝国会议中心度假酒店（The Imperial Hotel）',
      ja: 'ジ・インペリアル・ホテル＆コンベンションセンター・ピッサヌローク',
      ko: '더 임페리얼 호텔 & 컨벤션 센터 핏사눌록',
      fr: 'The Imperial Hotel & Convention Centre Phitsanulok'
    },
    blurb: {
      th: 'โรงแรมหรูพร้อมสระว่ายน้ำขนาดใหญ่และพื้นที่พักผ่อนร่มรื่น รองรับกรุ๊ปทัวร์ นักธุรกิจ และครอบครัว | ราคาเริ่มต้น 1,450 บาท/คืน',
      en: 'Upscale resort-style hotel featuring a grand swimming pool, lush tropical gardens, and full convention facilities. Starting at 1,450 THB/night.',
      zh: '豪华园林式会议度假酒店，配备大型游泳池与绿意盎然的休闲花园，适合旅游团与商务旅客 | 1,450泰铢/晚起。',
      ja: '広大なスイミングプールと緑豊かな庭園を備えた高級ホテル。ツアー団体やビジネス、ファミリーに最適です｜1泊1,450バーツ〜。',
      ko: '대형 수영장과 푸른 정원을 갖춘 고급 호텔로 단체 여행객과 비즈니스 고객 모두에게 최적의 휴식을 제공합니다 | 1박 1,450바트부터.',
      fr: 'Hôtel de luxe avec vaste piscine extérieure et jardins tropicaux verdoyants, idéal pour les séjours d’affaires et les familles | Dès 1 450 THB/nuit.'
    }
  }
];

const MERCHANTS = RAW_MERCHANTS.map((m) => {
  const pos = gpsTo3D(m.lat, m.lng);
  const nearLm = LANDMARKS.find((l) => l.id === m.nearest) || LANDMARKS[0];
  const distM = haversineM(m.lat, m.lng, nearLm.lat, nearLm.lng);
  return {
    ...m,
    shortName: SHORT_NAMES[m.slug],
    x: pos.x,
    z: pos.z,
    dxM: pos.dxM,
    dzM: pos.dzM,
    distance_m: distM,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`,
    googleEarthUrl: `https://earth.google.com/web/search/${m.lat},${m.lng}`
  };
});

// No synthetic network merchants: we strictly keep the 5 real restaurants + 3 real hotels (+5 heritage sites = 13 pins).
const NETWORK_MERCHANTS = [];

// =========================================================================
// รายการเมนูอาหารจริง + แพ็กเกจห้องพักโรงแรมจริง แปลครบ 6 ภาษา
// =========================================================================
const MENU_ITEMS = [
  // 1. ก๋วยเตี๋ยวห้อยขา ริมน่าน
  {
    merchant: 'hoi-kha-noodles', code: 'HK01', price: 60, unit: 'ชาม', category: 'food',
    allergens: ['peanut', 'pork'], spicy: 2, vegetarian: 0, halal: 0,
    imageUrl: '/assets/photos/hoi-kha-noodles.jpg',
    fallbackImage: '/assets/photos/hoi-kha-noodles.jpg',
    name: {
      th: 'ก๋วยเตี๋ยวต้มยำสุโขทัยหมูแดงถั่วป่น',
      en: 'Sukhothai Tom Yum Noodles with Roast Pork & Crushed Peanuts',
      zh: '素可泰叉烧碎花生酸辣汤面',
      ja: 'スコータイ風トムヤム麺（焼豚・砕きピーナッツ入り）',
      ko: '수코타이식 차슈 땅콩 똠얌 국수',
      fr: 'Nouilles Tom Yum de Sukhothai au porc rôti et cacahuètes'
    },
    desc: {
      th: 'น้ำซุปต้มยำมะนาวสดพริกเผา หมูแดงย่าง ถั่วฝักยาวซอย และถั่วลิสงคั่วบดใหม่',
      en: 'Zesty lime-chili tom yum broth, roast pork, sliced long beans, and freshly roasted crushed peanuts.',
      zh: '鲜青柠辣椒酸辣汤底，配蜜汁叉烧、切丝长豆角与现烤碎花生。',
      ja: '生ライムとチリの甘酸っぱいトムヤムスープに、焼豚、インゲン豆、香ばしい煎りピーナッツをトッピング。',
      ko: '생라임과 칠리로 맛을 낸 새콤매콤한 육수에 차슈, 줄콩, 갓 볶은 땅콩 가루를 얹은 대표 국수.',
      fr: 'Bouillon tom yum au citron vert frais, porc rôti, haricots longs et cacahuètes grillées concassées.'
    }
  },
  {
    merchant: 'hoi-kha-noodles', code: 'HK02', price: 70, unit: 'ชาม', category: 'food',
    allergens: ['pork', 'soy', 'dairy'], spicy: 2, vegetarian: 0, halal: 0,
    imageUrl: '/assets/photos/food-ribs.jpg',
    fallbackImage: '/assets/photos/food-ribs.jpg',
    name: {
      th: 'ก๋วยเตี๋ยวต้มยำน้ำข้นซี่โครงหมูอ่อน',
      en: 'Creamy Tom Yum Noodles with Tender Pork Ribs',
      zh: '浓汤酸辣软骨排骨面',
      ja: '濃厚クリーミートムヤム軟骨スペアリブ麺',
      ko: '진한 크리미 똠얌 연골 돼지갈비 국수',
      fr: 'Nouilles Tom Yum crémeuses aux travers de porc fondants'
    },
    desc: {
      th: 'ซี่โครงหมูอ่อนตุ๋นนานกว่า 4 ชั่วโมงในน้ำซุปต้มยำน้ำข้นหอมพริกเผา (ไม่ใส่ถั่วลิสง)',
      en: 'Slow-braised tender pork cartilage ribs in rich chili-paste creamy tom yum broth (peanut-free).',
      zh: '慢炖4小时的软骨排骨，配浓郁辣椒膏酸辣汤底（不含花生）。',
      ja: '4時間じっくり煮込んだ豚軟骨スペアリブ入りの濃厚トムヤム麺（ピーナッツ不使用）。',
      ko: '4시간 이상 푹 고아낸 부드러운 연골 갈비가 들어간 진한 똠얌 국수 (땅콩 무첨가).',
      fr: 'Travers de porc mijotés 4 heures dans un bouillon tom yum onctueux au piment doux (sans arachide).'
    }
  },
  {
    merchant: 'hoi-kha-noodles', code: 'HK03', price: 50, unit: 'จาน', category: 'food',
    allergens: ['pork', 'gluten', 'egg', 'soy'], spicy: 0, vegetarian: 0, halal: 0,
    imageUrl: '/assets/photos/food-wonton.jpg',
    fallbackImage: '/assets/photos/food-wonton.jpg',
    name: {
      th: 'เกี๊ยวทอดกรอบไส้หมู',
      en: 'Crispy Fried Pork Wontons with Plum Dip',
      zh: '黄金酥炸猪肉云吞配梅子酱',
      ja: '揚げ豚ワンタン（甘い梅ソース添え）',
      ko: '바삭한 돼지고기 군만두 (매실 소스)',
      fr: 'Wontons croustillants au porc frit et sauce aux prunes'
    },
    desc: {
      th: 'แผ่นเกี๊ยวไข่ห่อหมูเด้งปรุงรส ทอดกรอบใหม่ทุกจาน เสิร์ฟพร้อมน้ำจิ้มบ๊วยเจี่ย',
      en: 'Golden egg-wrapper wontons stuffed with seasoned minced pork, fried crisp to order with sweet plum sauce.',
      zh: '鸡蛋皮包裹鲜嫩猪肉馅现炸至金黄酥脆，蘸甜梅子酱享用。',
      ja: '味付け豚ミンチを包んでカリッと揚げた黄金ワンタン。甘酸っぱい梅ソース付き。',
      ko: '양념한 다진 돼지고기를 넣고 주문 즉시 바삭하게 튀겨낸 만두와 달콤한 매실 소스.',
      fr: 'Raviolis wonton dorés farcis au porc assaisonné, frits à la commande et servis avec une sauce aux prunes.'
    }
  },

  // 2. จุกไก่ไทย
  {
    merchant: 'juk-kai-thai', code: 'JK01', price: 80, unit: 'จาน', category: 'food',
    allergens: ['soy'], spicy: 1, vegetarian: 0, halal: 1,
    imageUrl: '/assets/photos/juk-kai-thai.jpg',
    fallbackImage: '/assets/photos/juk-kai-thai.jpg',
    name: {
      th: 'ข้าวมันไก่ตอนสับจานกลาง',
      en: 'Hainanese Poached Chicken Rice (Medium Platter)',
      zh: '招牌白切鸡油饭（中盘）',
      ja: '特製カオマンガイ・蒸し鶏ライス（中皿）',
      ko: '시그니처 카오만까이 백숙 닭고기 덮밥 (중짜)',
      fr: 'Riz parfumé au poulet poché à la haïnanaise (Assiette moyenne)'
    },
    desc: {
      th: 'ไก่ตอนเนื้อนุ่มหนังตึง หุงข้าวมันด้วยน้ำซุปกระดูกไก่หอมกระเทียมขิง เสิร์ฟคู่น้ำจิ้มเต้าเจี้ยวขิงสด',
      en: 'Silky poached capon chicken over ginger-garlic fragrance rice, served with clear broth and fermented soybean-ginger sauce.',
      zh: '皮爽肉滑的阉鸡配姜蒜鸡汤香米饭，附清汤与鲜姜豆瓣蘸酱。',
      ja: '生姜とニンニクが香る鶏だしご飯としっとり柔らかい蒸し鶏。特製タオチオ生姜タレとスープ付き。',
      ko: '생강과 마늘 향이 배어든 닭 육수 밥과 촉촉한 닭고기, 특제 된장 생강 소스와 맑은 국물 제공.',
      fr: 'Poulet poché tendre sur riz parfumé au bouillon de gingembre et ail, servi avec sauce soja fermentée.'
    }
  },
  {
    merchant: 'juk-kai-thai', code: 'JK02', price: 70, unit: 'ชุด', category: 'food',
    allergens: ['pork', 'peanut'], spicy: 1, vegetarian: 0, halal: 0,
    imageUrl: '/assets/photos/food-satay.jpg',
    fallbackImage: '/assets/photos/food-satay.jpg',
    name: {
      th: 'หมูสะเต๊ะย่างเตาถ่านพร้อมอาจาด',
      en: 'Charcoal-Grilled Pork Satay with Peanut Sauce & Cucumber Relish',
      zh: '炭烤猪肉沙爹配花生酱与酸甜黄瓜泡菜',
      ja: '炭火焼きポークサテ（ピーナッツソース＆アジャード添え）',
      ko: '숯불 돼지고기 사테 (땅콩 소스 & 오이 피클)',
      fr: 'Brochettes de porc Satay au charbon, sauce arachide et pickles'
    },
    desc: {
      th: 'หมูหมักขมิ้นกะทิย่างเตาถ่านร้อนๆ เสิร์ฟพร้อมน้ำจิ้มถั่วลิสงเคี่ยวกะทิและอาจาดแตงกวาพริกชี้ฟ้า',
      en: 'Turmeric and coconut-milk marinated pork skewers grilled over charcoal, served with rich peanut sauce and cucumber-chili relish.',
      zh: '姜黄椰奶腌制猪肉串炭火慢烤，配香浓花生沙爹酱与黄瓜甜醋泡菜。',
      ja: 'ターメリックとココナッツミルクに漬け込んで炭火で焼いた豚串。濃厚ピーナッツソースと甘酢キュウリ付き。',
      ko: '강황과 코코넛밀크로 재워 숯불에 구운 돼지고기 꼬치와 고소한 땅콩 소스, 새콤달콤한 오이 아잣.',
      fr: 'Brochettes de porc marinées au curcuma et lait de coco grillées sur braise, sauce cacahuète et pickles.'
    }
  },
  {
    merchant: 'juk-kai-thai', code: 'JK03', price: 50, unit: 'ถ้วย', category: 'food',
    allergens: ['pork', 'soy'], spicy: 0, vegetarian: 0, halal: 0,
    imageUrl: '/assets/photos/food-soup.jpg',
    fallbackImage: '/assets/photos/food-soup.jpg',
    name: {
      th: 'ต้มจืดมะระซี่โครงหมู',
      en: 'Stuffed Bitter Melon & Pork Rib Clear Soup',
      zh: '苦瓜炖排骨清汤',
      ja: 'ゴーヤ（苦瓜）と豚スペアリブの澄ましスープ',
      ko: '여주(쓴오이) 돼지갈비 맑은 국',
      fr: 'Soupe claire de margose farcie et travers de porc'
    },
    desc: {
      th: 'มะระจีนคว้านไส้ตุ๋นกับซี่โครงหมูและเห็ดหอมจนเปื่อยนุ่ม น้ำซุปใสกลมกล่อมไม่ขม',
      en: 'Slow-simmered Chinese bitter melon with tender pork ribs and shiitake mushrooms in a soothing, non-bitter clear broth.',
      zh: '甄选大苦瓜配猪排骨与香菇慢火清炖，汤头甘醇清爽不苦涩。',
      ja: '苦味を抜いた中国ゴーヤと豚スペアリブ、椎茸をじっくり煮込んだ優しい味わいの澄ましスープ。',
      ko: '쓴맛을 잡은 여주와 부드러운 돼지갈비, 표고버섯을 푹 끓여낸 깔끔하고 시원한 맑은 보양 국물.',
      fr: 'Margose mijotée lentement avec des travers de porc et champignons shiitake dans un bouillon clair très doux.'
    }
  },

  // 3. ก๋วยเตี๋ยวไก่ป้าล้อม
  {
    merchant: 'pa-lom-noodles', code: 'PL01', price: 55, unit: 'ชาม', category: 'food',
    allergens: ['soy'], spicy: 0, vegetarian: 0, halal: 1,
    imageUrl: '/assets/photos/pa-lom-noodles.jpg',
    fallbackImage: '/assets/photos/pa-lom-noodles.jpg',
    name: {
      th: 'ก๋วยเตี๋ยวไก่ฉีก-น่องไก่ตุ๋นยาจีน',
      en: 'Shredded Chicken & Chinese-Herb Braised Drumstick Noodles',
      zh: '药膳炖鸡腿与手撕鸡丝汤面',
      ja: '漢方煮込み鶏ドラムスティック＆ほぐし鶏ヌードル',
      ko: '한방 닭다리 조림 & 결대로 찢은 닭살 국수',
      fr: 'Nouilles au pilon de poulet braisé aux herbes et poulet effiloché'
    },
    desc: {
      th: 'น้ำซุปยาจีนหอมเก๋ากี้และรากผักชี ใส่น่องไก่ตุ๋นเปื่อยนุ่มและเนื้อไก่ฉีก ไม่มีส่วนผสมของหมูและถั่ว',
      en: 'Fragrant Chinese-herb broth with goji berries and coriander root, topped with a fall-off-the-bone drumstick and shredded chicken (pork & peanut free).',
      zh: '枸杞香菜根药膳清汤，配软烂炖鸡腿与嫩鸡丝（不含猪肉与花生）。',
      ja: 'クコの実とパクチー根が香る漢方スープに、ホロホロの鶏ドラムスティックと蒸し鶏を乗せた一杯（豚肉・ピーナッツ不使用）。',
      ko: '구기자와 고수 뿌리를 넣은 향긋한 한방 육수에 부드러운 닭다리와 닭가슴살을 얹은 국수 (돼지고기·땅콩 무첨가).',
      fr: 'Bouillon aux herbes chinoises et baies de goji, garni d’un pilon fondant et de poulet effiloché (sans porc ni arachide).'
    }
  },
  {
    merchant: 'pa-lom-noodles', code: 'PL02', price: 65, unit: 'ชาม', category: 'food',
    allergens: ['soy', 'egg'], spicy: 0, vegetarian: 0, halal: 1,
    imageUrl: '/assets/photos/food-soup.jpg',
    fallbackImage: '/assets/photos/food-soup.jpg',
    name: {
      th: 'เกาเหลาตีนไก่เปื่อย-ไข่อ่อน',
      en: 'Braised Chicken Feet & Soft-Yolk Egg Herbal Soup (No Noodles)',
      zh: '入口即化药膳凤爪配溏心幼蛋汤（无面）',
      ja: 'トロトロ鶏もみじ＆半熟キンカン卵の漢方スープ（麺なし）',
      ko: '푹 고은 한방 닭발 & 반숙 알집 보양탕 (면 없음)',
      fr: 'Soupe aux herbes de pattes de poulet fondantes et œufs mollets'
    },
    desc: {
      th: 'ตีนไก่ตุ๋นสมุนไพรจนเปื่อยละลายในปาก เสิร์ฟพร้อมพวงไข่อ่อนต้มยางมะตูมและถั่วงอกลวก',
      en: 'Collagen-rich chicken feet braised until melt-in-the-mouth tender, served with golden soft yolks and blanched bean sprouts.',
      zh: '富含胶原蛋白的药膳凤爪炖至脱骨，搭配金黄溏心幼蛋与爽脆豆芽。',
      ja: 'コラーゲンたっぷりの鶏足を口の中でとろけるまで煮込み、濃厚な半熟キンカン卵ともやしを添えました。',
      ko: '콜라겐이 풍부한 닭발을 입에서 녹을 정도로 고아내고 고소한 반숙 알집과 숙주를 듬뿍 넣은 보양 수프.',
      fr: 'Bouillon riche en collagène avec pattes de poulet ultra-fondantes, jaunes d’œufs coulants et germes de soja.'
    }
  },

  // 4. ผัดไทยป้าถนอม & ขนมเบื้องโบราณ ริมน่าน
  {
    merchant: 'pa-thanom-padthai', code: 'PT01', price: 65, unit: 'จาน', category: 'food',
    allergens: ['shellfish', 'egg', 'peanut', 'soy'], spicy: 1, vegetarian: 0, halal: 1,
    imageUrl: '/assets/photos/pa-thanom-padthai.jpg',
    fallbackImage: '/assets/photos/pa-thanom-padthai.jpg',
    name: {
      th: 'ผัดไทยห่อไข่กุ้งสดสูตรโบราณ',
      en: 'Ancient Tamarind Pad Thai Wrapped in Egg with Fresh River Prawns',
      zh: '古法罗望子鲜虾蛋包泰式炒河粉',
      ja: '伝統タマリンドソースの生エビ卵包みパッタイ',
      ko: '옛날식 타마린드 생새우 계란말이 팟타이',
      fr: 'Pad Thaï ancien au tamarin enveloppé d’omelette aux crevettes'
    },
    desc: {
      th: 'เส้นจันท์ผัดซอสมะขามเปียกเคี่ยวน้ำตาลมะพร้าว ห่อด้วยไข่เป็ดบางกรอบ วางกุ้งแม่น้ำสดและถั่วลิสงคั่วแยกข้างจาน',
      en: 'Chanthaburi rice noodles wok-tossed in palm-sugar tamarind reduction, wrapped in a lacy duck-egg crepe with fresh prawns and crushed peanuts on the side.',
      zh: '尖竹汶米线以椰糖罗望子酱大火快炒，外裹薄脆鸭蛋皮，配鲜河虾与盘边烤花生碎。',
      ja: 'パームシュガーとタマリンドで炒めたモチモチ米麺を薄焼き卵で包み、新鮮な川エビと砕きピーナッツを添えました。',
      ko: '코코넛 슈거와 타마린드 소스로 볶은 쫄깃한 쌀국수를 얇은 계란 지단으로 감싸고 생새우와 땅콩 가루를 곁들인 요리.',
      fr: 'Nouilles de riz sautées au tamarin et sucre de palme, enveloppées d’une crêpe d’œuf fine avec crevettes fraîches.'
    }
  },
  {
    merchant: 'pa-thanom-padthai', code: 'PT02', price: 40, unit: 'ชุด', category: 'dessert',
    allergens: ['egg', 'shellfish'], spicy: 0, vegetarian: 0, halal: 1,
    imageUrl: '/assets/photos/food-dessert.jpg',
    fallbackImage: '/assets/photos/food-dessert.jpg',
    name: {
      th: 'ขนมเบื้องไทยไส้หวาน-ไส้เค็มมะพร้าวขูด',
      en: 'Traditional Thai Crispy Crepes (Sweet Foy Thong & Savory Shrimp-Coconut)',
      zh: '古法泰式脆煎饼（金丝甜味与椰丝虾蓉咸味双拼）',
      ja: '伝統カノムブアン・タイ風クリスピークレープ（甘口＆塩味ココナッツ）',
      ko: '전통 태국 바삭 크레페 카놈브앙 (달콤 금실 & 고소 코코넛 새우)',
      fr: 'Crêpes croustillantes thaïes Khanom Bueang (Sucrées & Salées au coco)'
    },
    desc: {
      th: 'แป้งถั่วเขียวละเลงบนเตาถ่านบางกรอบ ไส้หวานฝอยทองครีมไข่ขาว และไส้เค็มกุ้งสับผัดมะพร้าวขูดใบมะกรูด',
      en: 'Charcoal-baked mung-bean crispy shells filled with airy meringue, golden egg threads (sweet), and kaffir-lime toasted coconut with shrimp (savory).',
      zh: '绿豆粉炭火摊成薄脆饼皮，包含蛋白霜金丝甜馅与柠檬叶炒虾蓉椰丝咸馅。',
      ja: '炭火で薄くパリッと焼いた生地に、メレンゲと鶏卵素麺の甘口と、エビそぼろ＆ココナッツの塩味を詰めた伝統菓子。',
      ko: '숯불에 얇고 바삭하게 구운 반죽 위에 머랭과 포이통(달콤한 맛), 코코넛 새우 보푸라기(짭조름한 맛)를 올린 전통 간식.',
      fr: 'Galettes fines et croquantes cuites sur braise, garnies de meringue aux fils d’or sucrés et de noix de coco râpée aux crevettes.'
    }
  },

  // 5. ศูนย์ของฝากกล้วยตากบางกระทุ่ม & หมี่ซั่วพิษณุโลก
  {
    merchant: 'bang-krathum-otop', code: 'OT01', price: 120, unit: 'กล่อง', category: 'souvenir',
    allergens: [], spicy: 0, vegetarian: 1, halal: 1,
    imageUrl: '/assets/photos/bang-krathum-otop.jpg',
    fallbackImage: '/assets/photos/bang-krathum-otop.jpg',
    name: {
      th: 'กล้วยตากพลังงานแสงอาทิตย์พาราโบลาโดม',
      en: 'Parabolic Solar-Dome Dried Namwa Bananas (GI Phitsanulok)',
      zh: '抛物面太阳能温室天然香蕉干（彭世洛GI认证）',
      ja: 'パラボラ・ソーラードーム熟成干しバナナ（GI認証・無添加）',
      ko: '파라볼라 태양광 돔 자연 숙성 바나나 말랭이 (무설탕 GI 인증)',
      fr: 'Bananes Namwa séchées sous dôme solaire parabolique (IG Phitsanulok)'
    },
    desc: {
      th: 'กล้วยน้ำว้ามะลิอ่องอำเภอบางกระทุ่ม ตากในโดมกระจกสะอาด ไร้ฝุ่น ไม่เติมน้ำตาล หวานฉ่ำน้ำผึ้งธรรมชาติ 100%',
      en: 'Authentic Mali-Ong Namwa bananas from Bang Krathum, hygienically sun-cured in parabolic glass domes. 100% natural honey-like sweetness, no added sugar.',
      zh: '甄选邦卡通县优质南芭蕉，在密闭抛物面阳光房内自然晒制，无尘卫生、零添加糖，蜜香浓郁。',
      ja: 'バーンクラトゥム産ナムワー種バナナを密閉ソーラードームで衛生的に天日熟成。砂糖不使用で蜂蜜のような自然な甘さです。',
      ko: '방끄라툼산 남와 바나나를 위생적인 유리 태양광 돔에서 건조하여 설탕 없이도 꿀처럼 달콤하고 쫀득한 특산품.',
      fr: 'Bananes Namwa de Bang Krathum séchées hygiéniquement sous dôme solaire. Douceur miellée 100 % naturelle sans sucre ajouté.'
    }
  },
  {
    merchant: 'bang-krathum-otop', code: 'OT02', price: 95, unit: 'ห่อ', category: 'souvenir',
    allergens: ['gluten'], spicy: 0, vegetarian: 1, halal: 1,
    imageUrl: '/assets/photos/hoi-kha-noodles.jpg',
    fallbackImage: '/assets/photos/hoi-kha-noodles.jpg',
    name: {
      th: 'หมี่ซั่วเตาถ่านสูตรดั้งเดิมพิษณุโลก',
      en: 'Traditional Charcoal-Baked Phitsanulok Mee Sua Longevity Noodles',
      zh: '彭世洛传统古法炭烘手工长寿面（Mee Sua）',
      ja: 'ピッサヌローク伝統の炭火乾燥ミー・スア（長寿小麦麺）',
      ko: '핏사눌록 전통 수제 장수면 미쑤아 (선물용 패키지)',
      fr: 'Nouilles de longévité artisanales Mee Sua de Phitsanulok'
    },
    desc: {
      th: 'เส้นหมี่ซั่วนวดมือดึงเส้นตากแดดและอบเตาถ่านหอมกรุ่น เส้นเหนียวนุ่มไม่เค็ม เหมาะซื้อเป็นของฝากมงคล',
      en: 'Hand-pulled wheat longevity noodles sun-dried and lightly finished over charcoal. Silky, non-salty texture—an auspicious gift from Phitsanulok.',
      zh: '手工拉制并经阳光晾晒与微炭烘焙的吉祥长寿面，口感柔韧且不咸，送礼佳品。',
      ja: '手延べ天日干しと炭火乾燥で作られる縁起物の小麦麺。塩辛くなくコシがあり、お土産に最適です。',
      ko: '손으로 직접 뽑아 햇볕과 숯불 열기로 건조한 전통 장수면으로 짜지 않고 쫄깃하여 선물용으로 인기가 높습니다.',
      fr: 'Nouilles de blé étirées à la main et séchées au soleil, symbole de longévité et cadeau traditionnel de Phitsanulok.'
    }
  },
  {
    merchant: 'bang-krathum-otop', code: 'OT03', price: 85, unit: 'กระปุก', category: 'souvenir',
    allergens: ['shellfish'], spicy: 2, vegetarian: 0, halal: 1,
    imageUrl: '/assets/photos/pa-thanom-padthai.jpg',
    fallbackImage: '/assets/photos/pa-thanom-padthai.jpg',
    name: {
      th: 'น้ำพริกกุ้งเสียบสมุนไพร',
      en: 'Crispy Smoked Shrimp & Thai Herb Chili Relish Jar',
      zh: '泰式香草脆烤虾干辣酱（密封罐装）',
      ja: 'ハーブ＆クリスピー焼き海老のナムプリック（瓶詰め）',
      ko: '크리스피 훈제 새우 & 타이 허브 칠리 페이스트 (병포장)',
      fr: 'Pâte de piment croustillante aux crevettes fumées et herbes thaïes'
    },
    desc: {
      th: 'กุ้งเสียบย่างกรอบคลุกเคล้าหอมเจียว กระเทียมเจียว ตะไคร้ซอย และพริกแห้งคั่วหอม บรรจุกระปุกซีลพกขึ้นเครื่องได้',
      en: 'Charcoal-smoked crispy shrimp tossed with fried shallots, garlic, lemongrass, and roasted chilies in a travel-sealed jar.',
      zh: '炭烤脆虾干拌炸红葱酥、蒜酥、香茅丝与烤干椒，密封包装方便携带登机。',
      ja: '香ばしい焼き海老にフライドシャロット、ニンニク、レモングラスを合わせた食べるラー油風ナムプリック。機内持込可能な密封容器入り。',
      ko: '바삭하게 구운 새우와 튀긴 샬롯, 마늘, 레몬그라스, 구운 고추를 버무린 밥도둑 칠리 페이스트 (기내 반입 가능 밀폐 용기).',
      fr: 'Crevettes fumées croustillantes aux échalotes frites, ail, citronnelle et piments torréfiés en pot scellé pour le voyage.'
    }
  },

  // 6. Yodia Heritage Hotel
  {
    merchant: 'yodia-heritage', code: 'YH01', price: 1850, unit: 'คืน', category: 'stay',
    room: { tier: 'deluxe', bed: 'double', sizeSqm: 28, maxGuests: 2, breakfast: true, view: 'river', amenities: ['wifi', 'aircon', 'tv', 'fridge', 'kettle', 'shower'] },
    allergens: [], spicy: 0, vegetarian: 1, halal: 1,
    imageUrl: '/assets/photos/yodia-heritage.jpg',
    fallbackImage: '/assets/photos/yodia-heritage.jpg',
    name: {
      th: 'ห้องพัก Deluxe River Heritage (รวมอาหารเช้า 2 ท่าน)',
      en: 'Deluxe River Heritage Room (Breakfast for 2 Included)',
      zh: '豪华河景历史文化客房（含双人早餐）',
      ja: 'デラックス・リバーヘリテージルーム（2名様朝食付）',
      ko: '디럭스 리버 헤리티지 룸 (2인 조식 포함)',
      fr: 'Chambre Deluxe River Heritage (Petit-déjeuner pour 2 inclus)'
    },
    desc: {
      th: 'ห้องพักบูติควิวแม่น้ำน่าน ติดศูนย์ประวัติศาสตร์พระราชวังจันทร์ ตกแต่งไม้สักและผ้าทอพื้นเมือง พร้อมอาหารเช้าริมน้ำ',
      en: 'Boutique Nan River view room beside Chan Royal Palace, adorned with teakwood and local textiles, including riverside breakfast.',
      zh: '紧邻詹宫的难河景精品客房，采用柚木与手工织物装饰，含河畔双人特色早餐。',
      ja: 'チャン王宮隣のナン川を望むブティック客室。チーク材と伝統織物のインテリア、川辺での朝食2名様分付き。',
      ko: '짠 왕궁 옆 난 강이 내려다보이는 부티크 객실로 티크 원목과 전통 직물로 꾸며져 있으며 강변 조식이 제공됩니다.',
      fr: 'Chambre de charme avec vue sur la rivière Nan près du Palais Chan, décorée de teck et tissus locaux, petit-déjeuner au bord de l’eau.'
    }
  },

  // 7. Topland Hotel & Convention Centre
  {
    merchant: 'topland-hotel', code: 'TL01', price: 1290, unit: 'คืน', category: 'stay',
    room: { tier: 'superior', bed: 'double', sizeSqm: 30, maxGuests: 2, breakfast: true, view: 'city', amenities: ['wifi', 'aircon', 'tv', 'fridge', 'kettle', 'safe', 'shower'] },
    allergens: [], spicy: 0, vegetarian: 1, halal: 1,
    imageUrl: '/assets/photos/topland-hotel.jpg',
    fallbackImage: '/assets/photos/topland-hotel.jpg',
    name: {
      th: 'ห้องพัก Superior Panorama City & River View (รวมอาหารเช้า)',
      en: 'Superior Panorama City & Nan River View Room (Breakfast Included)',
      zh: '高层全景河景高级客房（含双人自助早餐）',
      ja: 'スーペリア・パノラマシティ＆リバービュールーム（朝食付）',
      ko: '슈페리어 파노라마 시티 & 리버뷰 룸 (조식 포함)',
      fr: 'Chambre Supérieure Vue Panoramique Ville & Rivière (Petit-déjeuner inclus)'
    },
    desc: {
      th: 'ห้องพักมุมสูงมองเห็นแม่น้ำน่านและสะพานนเรศวร ห่างวัดใหญ่เพียง 400 เมตร พร้อมบุฟเฟต์อาหารเช้านานาชาติ',
      en: 'High-floor room overlooking the Nan River and Naresuan Bridge, just 400 m from Wat Yai, with international breakfast buffet.',
      zh: '高层客房俯瞰难河与纳黎萱桥，距大寺仅400米，含丰盛国际自助早餐。',
      ja: '高層階からナン川とナレースワン橋を一望。ワット・ヤイまで徒歩圏（400m）、インターナショナル朝食ビュッフェ付き。',
      ko: '고층에서 난 강과 나레쑤언 다리를 조망할 수 있는 객실로 왓 야이에서 400m 거리에 있으며 인터내셔널 조식 뷔페가 포함됩니다.',
      fr: 'Chambre en étage élevé dominant la rivière Nan et le pont Naresuan, à 400 m de Wat Yai, avec buffet petit-déjeuner.'
    }
  },

  // 8. The Imperial Hotel & Convention Centre Phitsanulok
  {
    merchant: 'imperial-hotel', code: 'IM01', price: 1450, unit: 'คืน', category: 'stay',
    room: { tier: 'deluxe', bed: 'king', sizeSqm: 34, maxGuests: 2, breakfast: true, view: 'pool', amenities: ['wifi', 'aircon', 'tv', 'fridge', 'kettle', 'safe', 'balcony', 'bathtub'] },
    allergens: [], spicy: 0, vegetarian: 1, halal: 1,
    imageUrl: '/assets/photos/imperial-hotel.jpg',
    fallbackImage: '/assets/photos/imperial-hotel.jpg',
    name: {
      th: 'ห้องพัก Grand Deluxe Pool & Garden View (รวมอาหารเช้า)',
      en: 'Grand Deluxe Pool & Tropical Garden View Room (Breakfast Included)',
      zh: '尊贵泳池花园景豪华客房（含双人早餐）',
      ja: 'グランドデラックス・プール＆ガーデンビュールーム（朝食付）',
      ko: '그랜드 디럭스 풀 & 가든뷰 룸 (조식 포함)',
      fr: 'Chambre Grand Deluxe Vue Piscine & Jardin (Petit-déjeuner inclus)'
    },
    desc: {
      th: 'ห้องพักกว้างขวางพร้อมระเบียงชมสระว่ายน้ำขนาดใหญ่และสวนร่มรื่น บริการระดับ 4 ดาวพร้อมฟิตเนสและอาหารเช้า',
      en: 'Spacious 4-star room overlooking the lagoon pool and lush gardens, complete with fitness access and morning buffet.',
      zh: '宽敞四星级客房，坐拥大型泳池与热带花园景观，免费使用健身房并含双人早餐。',
      ja: '大型プールと緑豊かな庭園を望む広々とした4つ星客室。フィットネス利用および朝食ビュッフェ付き。',
      ko: '대형 수영장과 열대 정원이 내려다보이는 넓은 4성급 객실로 피트니스 센터 이용과 조식 뷔페가 포함되어 있습니다.',
      fr: 'Vaste chambre 4 étoiles donnant sur la grande piscine et les jardins, avec accès fitness et petit-déjeuner buffet.'
    }
  },

  // Extra room types (sample data, shown with a "sample price" badge): each has its own bed, size, guests and amenities
  {
    merchant: 'yodia-heritage', code: 'YH00', price: 1450, unit: 'คืน', category: 'stay',
    room: { tier: 'standard', bed: 'twin', sizeSqm: 24, maxGuests: 2, breakfast: false, view: null, amenities: ['wifi', 'aircon', 'tv', 'shower'] },
    allergens: [], spicy: 0, vegetarian: 0, halal: 0,
    imageUrl: '/assets/photos/yodia-heritage.jpg',
    fallbackImage: '/assets/photos/yodia-heritage.jpg',
    name: { th: 'ห้องสแตนดาร์ด เตียงเดี่ยว 2 เตียง', en: 'Standard Twin Room', zh: '标准双床房', ja: 'スタンダードツイン', ko: '스탠더드 트윈룸', fr: 'Chambre Standard lits jumeaux' },
    desc: { th: 'ห้องพักมาตรฐานเตียงเดี่ยว 2 เตียง เหมาะกับเพื่อนหรือครอบครัวเล็ก ไม่รวมอาหารเช้า', en: 'Standard room with two single beds, good for friends or a small family. Breakfast not included.', zh: '两张单人床的标准客房，适合朋友或小家庭，不含早餐。', ja: 'シングルベッド2台の標準客室。友人同士や少人数の家族に。朝食なし。', ko: '싱글 침대 2개가 있는 스탠더드 객실로 친구나 소가족에게 알맞습니다. 조식 불포함.', fr: 'Chambre standard avec deux lits simples, idéale entre amis ou en petite famille. Petit-déjeuner non inclus.' }
  },
  {
    merchant: 'yodia-heritage', code: 'YH02', price: 3200, unit: 'คืน', category: 'stay',
    room: { tier: 'suite', bed: 'king', sizeSqm: 48, maxGuests: 3, breakfast: true, view: null, amenities: ['wifi', 'aircon', 'tv', 'fridge', 'kettle', 'safe', 'bathtub', 'living', 'minibar'] },
    allergens: [], spicy: 0, vegetarian: 0, halal: 0,
    imageUrl: '/assets/photos/yodia-heritage.jpg',
    fallbackImage: '/assets/photos/yodia-heritage.jpg',
    name: { th: 'ห้องสวีท VIP เตียงคิงไซซ์ (รวมอาหารเช้า)', en: 'VIP Suite, King Bed (Breakfast Included)', zh: 'VIP 套房 · 特大床（含早餐）', ja: 'VIPスイート・キングベッド（朝食付）', ko: 'VIP 스위트 킹베드 (조식 포함)', fr: 'Suite VIP lit king size (petit-déjeuner inclus)' },
    desc: { th: 'ห้องสวีทแยกส่วนนั่งเล่น เตียงคิงไซซ์ อ่างอาบน้ำ พักได้ 3 ท่าน (เสริมเตียงได้) รวมอาหารเช้า', en: 'Suite with a separate living area, king bed and bathtub. Sleeps 3 with an extra bed. Breakfast included.', zh: '带独立客厅的套房，特大床与浴缸，加床可住 3 人，含早餐。', ja: 'リビング付きスイート。キングベッドとバスタブ、エキストラベッドで3名まで。朝食付き。', ko: '거실이 분리된 스위트로 킹베드와 욕조를 갖췄고 엑스트라 베드로 3인까지 숙박 가능합니다. 조식 포함.', fr: 'Suite avec salon séparé, lit king size et baignoire, jusqu’à 3 personnes avec lit d’appoint. Petit-déjeuner inclus.' }
  },
  {
    merchant: 'topland-hotel', code: 'TL00', price: 990, unit: 'คืน', category: 'stay',
    room: { tier: 'standard', bed: 'twin', sizeSqm: 26, maxGuests: 2, breakfast: false, view: null, amenities: ['wifi', 'aircon', 'tv', 'shower'] },
    allergens: [], spicy: 0, vegetarian: 0, halal: 0,
    imageUrl: '/assets/photos/topland-hotel.jpg',
    fallbackImage: '/assets/photos/topland-hotel.jpg',
    name: { th: 'ห้องสแตนดาร์ด เตียงเดี่ยว 2 เตียง', en: 'Standard Twin Room', zh: '标准双床房', ja: 'スタンダードツイン', ko: '스탠더드 트윈룸', fr: 'Chambre Standard lits jumeaux' },
    desc: { th: 'ห้องพักมาตรฐานเตียงเดี่ยว 2 เตียง เหมาะกับเพื่อนหรือครอบครัวเล็ก ไม่รวมอาหารเช้า', en: 'Standard room with two single beds, good for friends or a small family. Breakfast not included.', zh: '两张单人床的标准客房，适合朋友或小家庭，不含早餐。', ja: 'シングルベッド2台の標準客室。友人同士や少人数の家族に。朝食なし。', ko: '싱글 침대 2개가 있는 스탠더드 객실로 친구나 소가족에게 알맞습니다. 조식 불포함.', fr: 'Chambre standard avec deux lits simples, idéale entre amis ou en petite famille. Petit-déjeuner non inclus.' }
  },
  {
    merchant: 'topland-hotel', code: 'TL02', price: 2900, unit: 'คืน', category: 'stay',
    room: { tier: 'suite', bed: 'king', sizeSqm: 56, maxGuests: 3, breakfast: true, view: null, amenities: ['wifi', 'aircon', 'tv', 'fridge', 'kettle', 'safe', 'bathtub', 'living', 'minibar'] },
    allergens: [], spicy: 0, vegetarian: 0, halal: 0,
    imageUrl: '/assets/photos/topland-hotel.jpg',
    fallbackImage: '/assets/photos/topland-hotel.jpg',
    name: { th: 'ห้องสวีท VIP เตียงคิงไซซ์ (รวมอาหารเช้า)', en: 'VIP Suite, King Bed (Breakfast Included)', zh: 'VIP 套房 · 特大床（含早餐）', ja: 'VIPスイート・キングベッド（朝食付）', ko: 'VIP 스위트 킹베드 (조식 포함)', fr: 'Suite VIP lit king size (petit-déjeuner inclus)' },
    desc: { th: 'ห้องสวีทแยกส่วนนั่งเล่น เตียงคิงไซซ์ อ่างอาบน้ำ พักได้ 3 ท่าน (เสริมเตียงได้) รวมอาหารเช้า', en: 'Suite with a separate living area, king bed and bathtub. Sleeps 3 with an extra bed. Breakfast included.', zh: '带独立客厅的套房，特大床与浴缸，加床可住 3 人，含早餐。', ja: 'リビング付きスイート。キングベッドとバスタブ、エキストラベッドで3名まで。朝食付き。', ko: '거실이 분리된 스위트로 킹베드와 욕조를 갖췄고 엑스트라 베드로 3인까지 숙박 가능합니다. 조식 포함.', fr: 'Suite avec salon séparé, lit king size et baignoire, jusqu’à 3 personnes avec lit d’appoint. Petit-déjeuner inclus.' }
  },
  {
    merchant: 'imperial-hotel', code: 'IM00', price: 1100, unit: 'คืน', category: 'stay',
    room: { tier: 'standard', bed: 'twin', sizeSqm: 30, maxGuests: 2, breakfast: false, view: null, amenities: ['wifi', 'aircon', 'tv', 'shower'] },
    allergens: [], spicy: 0, vegetarian: 0, halal: 0,
    imageUrl: '/assets/photos/imperial-hotel.jpg',
    fallbackImage: '/assets/photos/imperial-hotel.jpg',
    name: { th: 'ห้องสแตนดาร์ด เตียงเดี่ยว 2 เตียง', en: 'Standard Twin Room', zh: '标准双床房', ja: 'スタンダードツイン', ko: '스탠더드 트윈룸', fr: 'Chambre Standard lits jumeaux' },
    desc: { th: 'ห้องพักมาตรฐานเตียงเดี่ยว 2 เตียง เหมาะกับเพื่อนหรือครอบครัวเล็ก ไม่รวมอาหารเช้า', en: 'Standard room with two single beds, good for friends or a small family. Breakfast not included.', zh: '两张单人床的标准客房，适合朋友或小家庭，不含早餐。', ja: 'シングルベッド2台の標準客室。友人同士や少人数の家族に。朝食なし。', ko: '싱글 침대 2개가 있는 스탠더드 객실로 친구나 소가족에게 알맞습니다. 조식 불포함.', fr: 'Chambre standard avec deux lits simples, idéale entre amis ou en petite famille. Petit-déjeuner non inclus.' }
  },
  {
    merchant: 'imperial-hotel', code: 'IM02', price: 2600, unit: 'คืน', category: 'stay',
    room: { tier: 'suite', bed: 'king', sizeSqm: 52, maxGuests: 3, breakfast: true, view: null, amenities: ['wifi', 'aircon', 'tv', 'fridge', 'kettle', 'safe', 'bathtub', 'living', 'minibar'] },
    allergens: [], spicy: 0, vegetarian: 0, halal: 0,
    imageUrl: '/assets/photos/imperial-hotel.jpg',
    fallbackImage: '/assets/photos/imperial-hotel.jpg',
    name: { th: 'ห้องสวีท VIP เตียงคิงไซซ์ (รวมอาหารเช้า)', en: 'VIP Suite, King Bed (Breakfast Included)', zh: 'VIP 套房 · 特大床（含早餐）', ja: 'VIPスイート・キングベッド（朝食付）', ko: 'VIP 스위트 킹베드 (조식 포함)', fr: 'Suite VIP lit king size (petit-déjeuner inclus)' },
    desc: { th: 'ห้องสวีทแยกส่วนนั่งเล่น เตียงคิงไซซ์ อ่างอาบน้ำ พักได้ 3 ท่าน (เสริมเตียงได้) รวมอาหารเช้า', en: 'Suite with a separate living area, king bed and bathtub. Sleeps 3 with an extra bed. Breakfast included.', zh: '带独立客厅的套房，特大床与浴缸，加床可住 3 人，含早餐。', ja: 'リビング付きスイート。キングベッドとバスタブ、エキストラベッドで3名まで。朝食付き。', ko: '거실이 분리된 스위트로 킹베드와 욕조를 갖췄고 엑스트라 베드로 3인까지 숙박 가능합니다. 조식 포함.', fr: 'Suite avec salon séparé, lit king size et baignoire, jusqu’à 3 personnes avec lit d’appoint. Petit-déjeuner inclus.' }
  }
];

// Platform pricing & 4 revenue streams (all money in satang).
const PRICING = {
  vipPassSatang: 9900,            // 3. บัตรนักท่องเที่ยว Phitsanulok VIP Pass 99฿
  saasMonthlySatang: 19900,       // 1. ค่าสมาชิก SaaS ร้านอาหาร 199฿/เดือน
  hotelSaasMonthlySatang: 49900,  // 2. ค่าสมาชิก SaaS โรงแรมที่พัก 499฿/เดือน
  orderFeeRate: 0.04,             // 4. ค่าธรรมเนียมสั่งอาหารและจองที่พัก 3-5% (ค่าเฉลี่ย 4%: ร้านอาหาร 3%, โรงแรม 5%)
  restaurantFeeRate: 0.03,
  hotelFeeRate: 0.05,
  // VIP pass voucher bundle: total value 500 THB across real partners.
  vipVouchers: [
    { merchant: 'hoi-kha-noodles', valueSatang: 5000, minSpendSatang: 12000, count: 2 },
    { merchant: 'juk-kai-thai', valueSatang: 7500, minSpendSatang: 15000, count: 2 },
    { merchant: 'bang-krathum-otop', valueSatang: 12500, minSpendSatang: 25000, count: 2 }
  ]
};

// Default cost assumptions for the unit-economics calculator (THB / month).
const COST_ASSUMPTIONS = {
  server_cost_month: 1800,
  api_cost_per_scan: 0.12,
  scans_per_tourist: 4,
  fixed_ops_month: 22000,
  vip_conversion: 0.18,
  orders_per_tourist: 1.4,
  avg_order_value: 220,
  merchant_churn: 0.04
};

module.exports = {
  ORIGIN_GPS,
  gpsTo3D,
  haversineM,
  SHORT_NAMES,
  LANDMARKS,
  MERCHANTS,
  NETWORK_MERCHANTS,
  MENU_ITEMS,
  PRICING,
  COST_ASSUMPTIONS
};

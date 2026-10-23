'use strict';
/*
 * Bilingual Kitchen & Booking Ticket (6 languages: TH, EN, ZH, JA, KO, FR).
 * Displays large, high-contrast Thai instructions and red allergy banners for the vendor,
 * plus the guest's chosen language for counter verification.
 */

const DIETARY_FLAGS = {
  no_peanut: {
    label: {
      th: 'แพ้ถั่วลิสง',
      en: 'Peanut allergy',
      zh: '花生过敏',
      ja: 'ピーナッツアレルギー',
      ko: '땅콩 알레르기',
      fr: 'Allergie aux arachides'
    },
    kitchen: 'ลูกค้าต่างชาติแพ้ถั่วลิสง ห้ามใส่ถั่วเด็ดขาด! และห้ามใช้อุปกรณ์ที่ปนเปื้อนถั่ว',
    guest: {
      th: 'แพ้ถั่วลิสง — ห้ามใส่ถั่วเด็ดขาด',
      en: 'Peanut allergy — absolutely no peanuts',
      zh: '花生过敏——绝对不能放花生',
      ja: 'ピーナッツアレルギー — ピーナッツは絶対に入れないでください',
      ko: '땅콩 알레르기 — 땅콩 절대 넣지 마세요',
      fr: 'Allergie aux arachides — absolument aucune cacahuète'
    },
    applies: (line) => line.allergens.includes('peanut'),
    lineNote: 'ห้ามใส่ถั่วลิสงเด็ดขาด! (ลูกค้าแพ้ถั่ว)'
  },
  no_spicy: {
    label: {
      th: 'ไม่ทานเผ็ด',
      en: 'No chili / Non-spicy',
      zh: '不吃辣',
      ja: '辛くしないで（唐辛子抜き）',
      ko: '맵지 않게 (고추 빼기)',
      fr: 'Non épicé (sans piment)'
    },
    kitchen: 'ลูกค้าไม่ทานเผ็ด — ห้ามใส่พริก พริกป่น และน้ำพริกเผา',
    guest: {
      th: 'ไม่เผ็ด — ไม่ใส่พริก',
      en: 'Not spicy — no chili at all',
      zh: '不辣——不要放辣椒',
      ja: '辛くしないでください（唐辛子なし）',
      ko: '맵지 않게 — 고추 넣지 마세요',
      fr: 'Non épicé — sans aucun piment'
    },
    applies: (line) => line.spicy > 0,
    lineNote: 'ทำแบบไม่เผ็ด ไม่ใส่พริก'
  },
  no_pork: {
    label: {
      th: 'ไม่ทานหมู (ฮาลาล)',
      en: 'No pork (Halal-friendly)',
      zh: '不吃猪肉（清真友好）',
      ja: '豚肉抜き（ハラール対応）',
      ko: '돼지고기 없이 (할랄)',
      fr: 'Sans porc (compatible Halal)'
    },
    kitchen: 'ลูกค้าไม่ทานหมู (ฮาลาล) — ห้ามใช้หมู น้ำมันหมู และน้ำซุปกระดูกหมูเด็ดขาด',
    guest: {
      th: 'ไม่ทานหมู',
      en: 'No pork, lard or pork broth',
      zh: '不要猪肉、猪油或猪骨汤',
      ja: '豚肉・ラード・豚骨スープ不使用',
      ko: '돼지고기·라드·돼지뼈 육수 없이',
      fr: 'Sans porc, saindoux ni bouillon de porc'
    },
    applies: (line) => line.allergens.includes('pork'),
    lineNote: 'ห้ามใส่หมู/น้ำซุปหมู'
  },
  vegetarian: {
    label: {
      th: 'มังสวิรัติ',
      en: 'Vegetarian',
      zh: '素食',
      ja: 'ベジタリアン（菜食）',
      ko: '채식 (베지테리언)',
      fr: 'Végétarien'
    },
    kitchen: 'ลูกค้าทานมังสวิรัติ — ห้ามใส่เนื้อสัตว์ น้ำปลา และซอสหอยนางรม',
    guest: {
      th: 'มังสวิรัติ — ไม่มีเนื้อสัตว์',
      en: 'Vegetarian — no meat, fish sauce or oyster sauce',
      zh: '素食——不要肉、鱼露或蚝油',
      ja: 'ベジタリアン — 肉・魚醤（ナンプラー）・オイスターソース不使用',
      ko: '채식 — 고기·피시소스·굴소스 없이',
      fr: 'Végétarien — sans viande, sauce de poisson ni sauce d’huître'
    },
    applies: (line) => ['pork', 'beef', 'shellfish'].some((a) => line.allergens.includes(a)) || line.vegetarian === 0,
    lineNote: 'ทำแบบมังสวิรัติ ไม่ใส่เนื้อสัตว์'
  },
  no_shellfish: {
    label: {
      th: 'แพ้อาหารทะเล',
      en: 'Shellfish allergy',
      zh: '海鲜/贝类过敏',
      ja: '甲殻類・魚介アレルギー',
      ko: '갑각류·해산물 알레르기',
      fr: 'Allergie aux crustacés et fruits de mer'
    },
    kitchen: 'ลูกค้าแพ้อาหารทะเล — ห้ามใส่กุ้ง หอย กะปิ และซอสหอยนางรมเด็ดขาด!',
    guest: {
      th: 'แพ้อาหารทะเล',
      en: 'Shellfish allergy — no shrimp, shellfish, shrimp paste or oyster sauce',
      zh: '贝类过敏——不要虾、贝类、虾酱或蚝油',
      ja: '甲殻類アレルギー — エビ・貝・シュリンプペースト・オイスターソース厳禁',
      ko: '갑각류 알레르기 — 새우·조개·새우장·굴소스 없이',
      fr: 'Allergie aux crustacés — sans crevettes, coquillages ni sauce d’huître'
    },
    applies: (line) => line.allergens.includes('shellfish'),
    lineNote: 'ห้ามใส่กุ้ง/หอย/กะปิ/ซอสหอยนางรมเด็ดขาด!'
  }
};

const LANGS = ['th', 'en', 'zh', 'ja', 'ko', 'fr'];

function sanitizeFlags(flags) {
  if (!Array.isArray(flags)) return [];
  return [...new Set(flags.filter((f) => typeof f === 'string' && DIETARY_FLAGS[f]))];
}

function buildKitchenTicket({ orderNo, tableLabel, merchantName, lines, flags, guestLang }) {
  const lang = LANGS.includes(guestLang) ? guestLang : 'en';
  const cleanFlags = sanitizeFlags(flags);
  const tableTh = tableLabel || 'โต๊ะ 4 / สั่งล่วงหน้า';
  return {
    orderNo,
    tableTh,
    merchantName,
    guestLang: lang,
    lines: lines.map((line) => ({
      qty: line.qty,
      unit: line.unit,
      nameTh: line.name.th,
      nameGuest: line.name[lang] || line.name.en || line.name.th,
      notesTh: cleanFlags.filter((f) => DIETARY_FLAGS[f].applies(line)).map((f) => DIETARY_FLAGS[f].lineNote)
    })),
    warningsTh: cleanFlags.map((f) => DIETARY_FLAGS[f].kitchen),
    warningsGuest: cleanFlags.map((f) => DIETARY_FLAGS[f].guest[lang] || DIETARY_FLAGS[f].guest.en),
    flags: cleanFlags
  };
}

module.exports = { DIETARY_FLAGS, buildKitchenTicket, sanitizeFlags, LANGS };

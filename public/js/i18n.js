// Interface text for the traveler side of the app in 6 languages: [th, en, zh, ja, ko, fr].
// The merchant and admin screens stay Thai on purpose (Thai staff, Thai kitchen tickets).
const ORDER = ['th', 'en', 'zh', 'ja', 'ko', 'fr'];
let uiLang = 'th';

export const setUiLang = (lang) => { if (ORDER.includes(lang)) uiLang = lang; };
export const getUiLang = () => uiLang;

/** Translate a key, filling {placeholders} from vars. Falls back to English, then Thai. */
export function t(key, vars, lang = uiLang) {
  const row = K[key];
  if (!row) return key;
  let text = row[ORDER.indexOf(lang)] ?? row[1] ?? row[0];
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
  return text;
}

/** Apply data-i18n / data-i18n-aria / data-i18n-title / data-i18n-placeholder inside root. */
export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  root.querySelectorAll('[data-i18n-title]').forEach((el) => el.setAttribute('title', t(el.dataset.i18nTitle)));
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder)));
}

const LOCALE = { th: 'th-TH', en: 'en-GB', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR' };
export const locale = () => LOCALE[uiLang];

/** A YYYY-MM-DD calendar day in the visitor's language (Thai shows the Buddhist year). */
export function formatDay(day, { weekday = true, lang = uiLang } = {}) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(LOCALE[lang] || LOCALE.en, { timeZone: 'UTC', weekday: weekday ? 'short' : undefined, day: 'numeric', month: 'short', year: 'numeric' });
}

/** Year a site was built: Buddhist Era for Thai readers, Common Era for everyone else. */
export function builtYear(be) {
  const n = Number(be);
  if (!n) return '-';
  return uiLang === 'th' ? String(n) : String(n - 543);
}

/** Server messages are Thai; other languages get a translated generic message. */
export function errText(err, fallbackKey = 'err.request') {
  if (uiLang === 'th' && err && err.message) return err.message;
  if (err && err.status === 0) return t('err.network');
  return t(fallbackKey);
}

// Units used on menu items (seed data stores the Thai word).
const UNITS = {
  'ชาม': ['ชาม', 'bowl', '碗', '杯', '그릇', 'bol'],
  'จาน': ['จาน', 'plate', '盘', '皿', '접시', 'assiette'],
  'ชุด': ['ชุด', 'set', '份', 'セット', '세트', 'menu'],
  'ถ้วย': ['ถ้วย', 'cup', '杯', 'カップ', '컵', 'coupe'],
  'คืน': ['คืน', 'night', '晚', '泊', '박', 'nuit'],
  'กล่อง': ['กล่อง', 'box', '盒', '箱', '상자', 'boîte'],
  'ห่อ': ['ห่อ', 'pack', '包', '袋', '봉지', 'sachet'],
  'กระปุก': ['กระปุก', 'jar', '罐', '瓶', '병', 'pot']
};
export function unitName(thai) {
  const row = UNITS[thai];
  return row ? row[ORDER.indexOf(uiLang)] : thai;
}

const K = {
  // ---------- page & header
  'title': ['PHITLOK NEXUS — แผนที่ 3 มิติ เสียงบรรยาย และสั่งอาหารพิษณุโลก 6 ภาษา', 'PHITLOK NEXUS · 3D map, audio guide and ordering in Phitsanulok', 'PHITLOK NEXUS · 彭世洛 3D 地图、语音导览与点餐', 'PHITLOK NEXUS · ピッサヌロークの3Dマップ・音声ガイド・注文', 'PHITLOK NEXUS · 핏사눌록 3D 지도, 음성 가이드, 주문', 'PHITLOK NEXUS · Carte 3D, audioguide et commandes à Phitsanulok'],
  'skip': ['ข้ามไปยังเนื้อหาหลัก', 'Skip to main content', '跳到主要内容', 'メインコンテンツへ移動', '본문으로 건너뛰기', 'Aller au contenu principal'],
  'nav.home': ['หน้าแรก', 'Home', '首页', 'ホーム', '홈', 'Accueil'],
  'nav.app': ['แอป', 'App', '应用', 'アプリ', '앱', 'Application'],
  'nav.credits': ['เครดิต', 'Credits', '致谢', 'クレジット', '크레딧', 'Crédits'],
  'brand.aria': ['PHITLOK NEXUS — หน้าแรก', 'PHITLOK NEXUS home', 'PHITLOK NEXUS 首页', 'PHITLOK NEXUS ホーム', 'PHITLOK NEXUS 홈', 'Accueil PHITLOK NEXUS'],
  'mode.aria': ['เลือกโหมด', 'Choose a mode', '选择模式', 'モードを選ぶ', '모드 선택', 'Choisir un mode'],
  'mode.tourist': ['นักท่องเที่ยว', 'Traveler', '游客', '旅行者', '여행자', 'Voyageur'],
  'mode.merchant': ['ร้านและโรงแรม', 'Shops & hotels', '商家与酒店', '店舗・ホテル', '업체·호텔', 'Commerces'],
  'mode.admin': ['ผู้บริหาร', 'Admin', '管理', '運営', '운영', 'Admin'],
  'aria.cart': ['ตะกร้า', 'Cart', '购物车', 'カート', '장바구니', 'Panier'],
  'aria.wallet': ['คูปองของฉัน', 'My coupons', '我的优惠券', 'マイクーポン', '내 쿠폰', 'Mes coupons'],
  'aria.theme': ['สลับธีมสว่างหรือมืด', 'Switch light or dark theme', '切换浅色或深色主题', 'ライト/ダークテーマを切り替え', '라이트 또는 다크 테마 전환', 'Basculer le thème clair ou sombre'],
  'aria.menu': ['เปิดเมนู', 'Open menu', '打开菜单', 'メニューを開く', '메뉴 열기', 'Ouvrir le menu'],
  'menu.aria': ['เมนู', 'Menu', '菜单', 'メニュー', '메뉴', 'Menu'],
  'menu.vip': ['อัปเกรด VIP Pass (99฿)', 'Upgrade to VIP Pass (฿99)', '升级 VIP 通行证（99 泰铢）', 'VIPパスにアップグレード（99バーツ）', 'VIP 패스 업그레이드 (99바트)', 'Passer au Pass VIP (99 ฿)'],
  'menu.wallet': ['คูปองของฉัน', 'My coupons', '我的优惠券', 'マイクーポン', '내 쿠폰', 'Mes coupons'],
  'menu.theme': ['สลับธีมสว่าง/มืด', 'Light / dark theme', '切换浅色 / 深色', 'ライト / ダーク切替', '라이트 / 다크 전환', 'Thème clair / sombre'],
  'lang.button': ['เปลี่ยนภาษา (ภาษาปัจจุบัน: {l})', 'Change language (current: {l})', '切换语言（当前：{l}）', '言語を変更（現在：{l}）', '언어 변경 (현재: {l})', 'Changer de langue (actuelle : {l})'],
  'lang.menu': ['เลือกภาษา · Language', 'Language', '语言 · Language', '言語 · Language', '언어 · Language', 'Langue · Language'],
  'lang.switcher': ['เลือกภาษา', 'Choose a language', '选择语言', '言語を選ぶ', '언어 선택', 'Choisir la langue'],
  'close': ['ปิด', 'Close', '关闭', '閉じる', '닫기', 'Fermer'],
  'retry': ['ลองอีกครั้ง', 'Try again', '重试', 'もう一度試す', '다시 시도', 'Réessayer'],
  'err.request': ['ทำรายการไม่สำเร็จ ลองอีกครั้ง', 'Something went wrong. Please try again.', '操作失败，请重试。', 'うまくいきませんでした。もう一度お試しください。', '처리하지 못했습니다. 다시 시도하세요.', 'Une erreur est survenue. Réessayez.'],
  'err.network': ['เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่', 'Can’t reach the server. Check your internet and try again.', '无法连接服务器，请检查网络后重试。', 'サーバーに接続できません。インターネット接続を確認してください。', '서버에 연결할 수 없습니다. 인터넷을 확인하세요.', 'Serveur injoignable. Vérifiez votre connexion.'],
  'err.booking': ['ข้อมูลการเข้าพักไม่ถูกต้อง ตรวจวันที่ จำนวนคืน และผู้เข้าพัก', 'Please check the stay details: date, nights and guests.', '请检查入住日期、晚数和人数。', '宿泊日・泊数・人数をご確認ください。', '숙박 날짜, 박 수, 인원을 확인하세요.', 'Vérifiez la date, le nombre de nuits et de personnes.'],
  'err.boot': ['โหลดข้อมูลไม่สำเร็จ', 'Couldn’t load the app data', '无法加载数据', 'データを読み込めませんでした', '데이터를 불러오지 못했습니다', 'Impossible de charger les données'],
  'unit.m': ['ม.', 'm', '米', 'm', 'm', 'm'],

  // ---------- categories & demo labels
  'cat.heritage': ['โบราณสถาน', 'Heritage', '古迹', '史跡', '유적', 'Patrimoine'],
  'cat.restaurant': ['ร้านอาหาร', 'Restaurants', '餐厅', '飲食店', '식당', 'Restaurants'],
  'cat.souvenir': ['ของฝาก', 'Souvenirs', '特产', 'お土産', '기념품', 'Souvenirs'],
  'cat.hotel': ['ที่พัก', 'Stays', '住宿', '宿泊', '숙소', 'Hébergements'],
  'cat.cafe': ['คาเฟ่', 'Café', '咖啡馆', 'カフェ', '카페', 'Café'],
  'cat.tour': ['ทัวร์', 'Tours', '旅游团', 'ツアー', '투어', 'Visites'],
  'demo.partner': ['ยังไม่ใช่พาร์ทเนอร์ · ข้อมูลสาธิต', 'Not a partner yet · demo data', '尚非合作商家 · 演示数据', '未提携 · デモデータ', '미제휴 · 데모 데이터', 'Pas encore partenaire · démo'],
  'demo.verified': ['พาร์ทเนอร์ที่ยืนยันแล้ว', 'Verified partner', '已认证合作商家', '確認済みパートナー', '인증된 파트너', 'Partenaire vérifié'],
  'demo.price': ['ราคาตัวอย่าง', 'Sample prices', '示例价格', '価格は例です', '예시 가격', 'Prix indicatifs'],
  'demo.menu': ['เมนูตัวอย่าง / ราคาตัวอย่าง', 'Sample menu & prices', '示例菜单与价格', 'メニュー・価格は例です', '예시 메뉴·가격', 'Menu et prix indicatifs'],
  'status.busy': ['คิวเต็มชั่วคราว', 'Busy right now', '暂时满座', '現在混雑中', '현재 붐빔', 'Complet pour le moment'],
  'status.open': ['เปิดรับลูกค้า', 'Open now', '营业中', '営業中', '영업 중', 'Ouvert'],
  'ref.fad': ['อ้างอิงข้อมูล: กรมศิลปากร ↗', 'Source: Fine Arts Department ↗', '资料来源：泰国艺术厅 ↗', '出典：タイ芸術局 ↗', '출처: 태국 예술청 ↗', 'Source : Département des Beaux-Arts ↗'],
  'ref.fadShort': ['กรมศิลปากร', 'Fine Arts Department', '泰国艺术厅', 'タイ芸術局', '태국 예술청', 'Département des Beaux-Arts'],

  // ---------- map
  'map.title': ['แผนที่ 3 มิติ จังหวัดพิษณุโลก', 'Phitsanulok Province in 3D', '彭世洛府 3D 地图', 'ピッサヌローク県3Dマップ', '핏사눌록주 3D 지도', 'La province de Phitsanulok en 3D'],
  'map.lead': ['แตะอำเภอเพื่อดูสถานที่ แตะหมุดเพื่อดูเรื่องเล่า เมนู และที่พัก', 'Tap a district to see its places, or a pin for stories, menus and stays', '点按县区查看地点，点按标记查看故事、菜单与住宿', '郡をタップして場所を、ピンで物語・メニュー・宿を見る', '군을 눌러 장소를, 핀을 눌러 이야기·메뉴·숙소를 보세요', 'Touchez un district pour ses lieux, ou un repère pour récits, menus et hébergements'],
  'map.canvas': ['แผนที่ 3 มิติของพิษณุโลก', '3D map of Phitsanulok', '彭世洛 3D 地图', 'ピッサヌロークの3D地図', '핏사눌록 3D 지도', 'Carte 3D de Phitsanulok'],
  'map.loading': ['กำลังโหลดแผนที่ 3 มิติ…', 'Loading the 3D map…', '正在加载 3D 地图…', '3Dマップを読み込み中…', '3D 지도를 불러오는 중…', 'Chargement de la carte 3D…'],
  'map.no3d': ['อุปกรณ์นี้แสดงแผนที่ 3 มิติไม่ได้ แตะชื่อสถานที่ด้านล่างเพื่อดูข้อมูล', 'This device can’t show the 3D map. Tap a place below to see it.', '此设备无法显示 3D 地图，请点按下方地点查看。', 'この端末では3Dマップを表示できません。下の場所をタップしてください。', '이 기기에서는 3D 지도를 볼 수 없습니다. 아래 장소를 누르세요.', 'Cet appareil ne peut pas afficher la carte 3D. Touchez un lieu ci-dessous.'],
  'map.tools': ['เครื่องมือแผนที่', 'Map tools', '地图工具', '地図ツール', '지도 도구', 'Outils de la carte'],
  'map.layers': ['เลือกหมวดที่แสดงบนแผนที่', 'Choose what to show on the map', '选择地图上显示的类别', '地図に表示するカテゴリ', '지도에 표시할 분류', 'Catégories affichées sur la carte'],
  'map.count': ['{name} {n} แห่ง', '{name}: {n} places', '{name} {n} 处', '{name} {n}か所', '{name} {n}곳', '{name} : {n} lieux'],
  'map.labelsOn': ['🏷️ ชื่อสถานที่: เปิด', '🏷️ Names: on', '🏷️ 地名：开', '🏷️ 名前：表示', '🏷️ 이름: 켜짐', '🏷️ Noms : oui'],
  'map.labelsOff': ['🏷️ ชื่อสถานที่: ปิด', '🏷️ Names: off', '🏷️ 地名：关', '🏷️ 名前：非表示', '🏷️ 이름: 꺼짐', '🏷️ Noms : non'],
  'map.legend': ['สัญลักษณ์', 'Legend', '图例', '凡例', '범례', 'Légende'],
  'map.legendAria': ['ความหมายของสัญลักษณ์', 'What the colours mean', '图例说明', '記号の意味', '기호 설명', 'Signification des couleurs'],
  'map.trail': ['เส้นทางจากวัดไปร้านใกล้ ๆ', 'Route from temples to nearby places', '从寺庙到附近店家的路线', '寺から近くのお店へのルート', '사원에서 주변 업체로 가는 길', 'Trajet des temples vers les lieux proches'],
  'map.reset': ['กลับมุมมองเริ่มต้น', 'Reset view', '重置视角', '初期表示に戻す', '처음 화면으로', 'Réinitialiser la vue'],
  'map.fsOn': ['เปิดเต็มจอ', 'Full screen', '全屏', '全画面表示', '전체 화면', 'Plein écran'],
  'map.fsOff': ['ออกจากเต็มจอ', 'Exit full screen', '退出全屏', '全画面を終了', '전체 화면 종료', 'Quitter le plein écran'],
  'map.cardHint': ['แตะอำเภอหรือหมุดบนแผนที่เพื่อดูรูปและรายละเอียด', 'Tap a district or a pin to see photos and details', '点按县区或标记查看照片和详情', '郡やピンをタップすると写真と詳細を表示', '군이나 핀을 누르면 사진과 정보를 볼 수 있습니다', 'Touchez un district ou un repère pour voir photos et détails'],
  'map.labelAria': ['ดูข้อมูล {name}', 'Show {name}', '查看 {name}', '{name}を表示', '{name} 보기', 'Voir {name}'],
  'signup.btn': ['สมัครสมาชิก', 'Sign up', '注册', '新規登録', '회원가입', 'S’inscrire'],
  'signup.menu': ['สมัครสมาชิก (นักท่องเที่ยว · ร้านค้า · ที่พัก)', 'Sign up (traveler · shop · hotel)', '注册（游客 · 商家 · 住宿）', '新規登録（旅行者・お店・宿）', '회원가입 (여행자 · 상점 · 숙소)', 'S’inscrire (voyageur · commerce · hébergement)'],
  'map.viewAria': ['เลือกมุมมองแผนที่', 'Map view', '地图视图', '地図の表示', '지도 보기', 'Vue de la carte'],
  'map.viewProvince': ['ทั้งจังหวัด', 'Province', '全府', '県全体', '주 전체', 'Province'],
  'map.viewCity': ['ตัวเมือง', 'City', '市区', '市街地', '시내', 'Ville'],
  'dock.aria': ['เมนูลัด', 'Shortcuts', '快捷菜单', 'ショートカット', '바로가기', 'Raccourcis'],
  'dock.map': ['แผนที่', 'Map', '地图', '地図', '지도', 'Carte'],
  'dock.places': ['สถานที่', 'Places', '地点', 'スポット', '장소', 'Lieux'],
  'dock.passport': ['สมุดสะสม', 'Passport', '集章册', 'スタンプ帳', '스탬프북', 'Carnet'],
  'dock.shop': ['ร้าน &amp; VIP', 'Shop &amp; VIP', '商店与 VIP', 'ショップ &amp; VIP', '상점 &amp; VIP', 'Boutique &amp; VIP'],
  'dock.settings': ['ตั้งค่า', 'Settings', '设置', '設定', '설정', 'Réglages'],
  'prov.districtAria': ['อำเภอ{name} · {n} จุด', '{name} district · {n} places', '{name} · {n} 处', '{name} · {n}か所', '{name} · {n}곳', '{name} · {n} lieux'],
  'prov.cityPin': ['ตัวเมืองพิษณุโลก · {n} จุด', 'Phitsanulok city · {n} places', '彭世洛市区 · {n} 处', 'ピッサヌローク市街 · {n}か所', '핏사눌록 시내 · {n}곳', 'Ville de Phitsanulok · {n} lieux'],
  'prov.kicker': ['อำเภอในจังหวัดพิษณุโลก', 'District of Phitsanulok', '彭世洛府县区', 'ピッサヌローク県の郡', '핏사눌록주의 군', 'District de Phitsanulok'],
  'prov.places': ['{n} จุดในระบบเดโมนี้', '{n} places in this demo', '本演示中有 {n} 处', 'このデモに{n}か所', '이 데모에 {n}곳', '{n} lieux dans cette démo'],
  'prov.none': ['ยังไม่มีสถานที่ในระบบเดโมนี้ จะเพิ่มเมื่อได้ข้อมูลที่ตรวจสอบแล้ว', 'No places here in this demo yet. We add them only after checking the facts.', '本演示暂未收录此地的地点，核实后再添加。', 'このデモにはまだ場所がありません。確認後に追加します。', '이 데모에는 아직 장소가 없습니다. 확인 후 추가합니다.', 'Aucun lieu ici dans cette démo. Nous les ajoutons après vérification.'],
  'prov.openCity': ['ดูแผนที่ตัวเมือง', 'Open the city map', '查看市区地图', '市街地マップを見る', '시내 지도 보기', 'Voir la carte de la ville'],
  'prov.source': ['ขอบเขตอำเภอ: © OpenStreetMap contributors', 'District borders: © OpenStreetMap contributors', '县界：© OpenStreetMap contributors', '郡の境界：© OpenStreetMap contributors', '군 경계: © OpenStreetMap contributors', 'Limites : © OpenStreetMap contributors'],
  'hud.title': ['การสำรวจของคุณ', 'Your exploring', '你的探索', 'あなたの探索', '나의 탐험', 'Votre exploration'],
  'hud.stamps': ['ตราประทับ {n}/{t}', 'Stamps {n}/{t}', '印章 {n}/{t}', 'スタンプ {n}/{t}', '스탬프 {n}/{t}', 'Tampons {n}/{t}'],
  'hud.places': ['{n} จุด · มีจุดใน {d}/9 อำเภอ', '{n} places · in {d}/9 districts', '{n} 处 · 分布于 {d}/9 县', '{n}か所 · {d}/9郡', '{n}곳 · {d}/9개 군', '{n} lieux · {d}/9 districts'],
  'hud.vip': ['VIP ใช้งานอยู่', 'VIP active', 'VIP 已开通', 'VIP 有効', 'VIP 이용 중', 'VIP actif'],
  'hud.scan': ['สแกนป้ายโบราณสถานเพื่อรับตรา', 'Scan a heritage sign to earn a stamp', '扫描古迹标牌获得印章', '史跡の看板をスキャンしてスタンプ', '유적 안내판을 스캔해 스탬프 받기', 'Scannez un panneau pour un tampon'],

  // ---------- place card
  'card.heritageYear': ['โบราณสถาน · พ.ศ. {y}', 'Heritage site · {y}', '古迹 · {y} 年', '史跡 · {y}年', '유적 · {y}년', 'Site historique · {y}'],
  'card.details': ['รายละเอียดและพิกัด', 'Details and coordinates', '详情与坐标', '詳細と座標', '상세 정보와 좌표', 'Détails et coordonnées'],
  'card.gps': ['พิกัด GPS', 'GPS coordinates', 'GPS 坐标', 'GPS座標', 'GPS 좌표', 'Coordonnées GPS'],
  'card.gmaps': ['เปิดใน Google Maps', 'Open in Google Maps', '在 Google 地图中打开', 'Google マップで開く', 'Google 지도에서 열기', 'Ouvrir dans Google Maps'],
  'card.gearth': ['เปิดใน Google Earth', 'Open in Google Earth', '在 Google 地球中打开', 'Google Earth で開く', 'Google 어스에서 열기', 'Ouvrir dans Google Earth'],
  'card.history': ['ดูประวัติ', 'Read the story', '了解历史', '歴史を見る', '역사 보기', 'Découvrir l’histoire'],
  'card.listen': ['ฟังเสียงบรรยาย', 'Listen', '收听讲解', '音声を聞く', '음성 듣기', 'Écouter'],
  'card.nearby': ['ร้านและที่พักใกล้เคียง', 'Nearby food and stays', '附近的餐厅与住宿', '近くの飲食店と宿', '주변 식당과 숙소', 'À proximité'],
  'card.distance': ['ห่างจาก{place} {d}', '{d} from {place}', '距{place} {d}', '{place}から{d}', '{place}에서 {d}', 'À {d} de {place}'],
  'card.menuCount': ['เมนู 6 ภาษา ({n} รายการ)', 'Menu in 6 languages ({n} items)', '6 种语言菜单（{n} 项）', '6言語メニュー（{n}品）', '6개 언어 메뉴 ({n}개)', 'Menu en 6 langues ({n} articles)'],
  'card.roomCount': ['ห้องพัก {n} แบบ', '{n} room types', '{n} 种房型', '{n}タイプの客室', '객실 {n}종', '{n} types de chambre'],
  'card.order': ['ดูเมนูและสั่งอาหาร', 'See menu & order', '查看菜单并点餐', 'メニューを見て注文', '메뉴 보고 주문', 'Voir le menu et commander'],
  'card.book': ['ดูห้องพักและจอง', 'See rooms & book', '查看客房并预订', '客室を見て予約', '객실 보고 예약', 'Voir les chambres et réserver'],
  'card.noItems': ['ยังไม่มีรายการ', 'No items yet', '暂无项目', 'まだ項目がありません', '아직 항목이 없습니다', 'Aucun article pour l’instant'],
  'card.nearHeritage': ['ดูโบราณสถานใกล้เคียง: {name}', 'Nearby heritage: {name}', '附近古迹：{name}', '近くの史跡：{name}', '가까운 유적: {name}', 'Site proche : {name}'],

  // ---------- directory
  'dir.eyebrow': ['ข้อมูลโบราณสถานอ้างอิงกรมศิลปากร · ร้านและโรงแรมเป็นข้อมูลสาธิต', 'Heritage facts from the Fine Arts Department · shops and hotels are demo data', '古迹资料来自泰国艺术厅 · 商家与酒店为演示数据', '史跡情報はタイ芸術局より · 店舗とホテルはデモデータ', '유적 정보는 태국 예술청 자료 · 업체와 호텔은 데모 데이터', 'Patrimoine : Département des Beaux-Arts · commerces et hôtels : démo'],
  'dir.title': ['สถานที่ทั้งหมดบนแผนที่', 'Every place on the map', '地图上的所有地点', '地図上のすべての場所', '지도 위 모든 장소', 'Tous les lieux de la carte'],
  'dir.lead': ['เลือกสถานที่เพื่อฟังเรื่องเล่า สั่งอาหาร หรือจองที่พัก', 'Pick a place to hear its story, order food or book a stay', '选择地点收听故事、点餐或预订住宿', '場所を選んで物語を聞く・注文する・宿を予約', '장소를 골라 이야기 듣기, 주문, 숙소 예약', 'Choisissez un lieu pour l’écouter, commander ou réserver'],
  'dir.foodFrom': ['อาหาร · เริ่ม {p}', 'Food · from {p}', '餐饮 · {p} 起', '料理 · {p}〜', '음식 · {p}부터', 'Repas · dès {p}'],
  'dir.stayFrom': ['ที่พัก · เริ่ม {p}', 'Stay · from {p}', '住宿 · {p} 起', '宿泊 · {p}〜', '숙소 · {p}부터', 'Séjour · dès {p}'],
  'dir.onMap': ['ดูบนแผนที่', 'See on map', '在地图上查看', '地図で見る', '지도에서 보기', 'Voir sur la carte'],
  'dir.order': ['สั่งอาหาร', 'Order food', '点餐', '注文する', '주문하기', 'Commander'],
  'dir.book': ['จองห้องพัก', 'Book a room', '预订客房', '客室を予約', '객실 예약', 'Réserver'],

  // ---------- lens (heritage + menu)
  'lens.title': ['ฟังเรื่องเล่าและสั่งอาหาร 6 ภาษา', 'Stories and ordering in 6 languages', '6 种语言的讲解与点餐', '6言語の歴史ガイドと注文', '6개 언어 이야기와 주문', 'Récits et commandes en 6 langues'],
  'lens.lead': ['ข้อมูลโบราณสถานจากกรมศิลปากร กรองอาหารที่แพ้ และจ่ายด้วยพร้อมเพย์', 'Heritage facts from the Fine Arts Department, allergy filters and PromptPay payment', '泰国艺术厅的古迹资料、过敏原筛选与 PromptPay 支付', 'タイ芸術局の史跡情報、アレルギー絞り込み、PromptPay決済', '태국 예술청 유적 정보, 알레르기 필터, PromptPay 결제', 'Patrimoine officiel, filtres allergènes et paiement PromptPay'],
  'lens.ai': ['AI ช่วยอ่านป้ายและเมนู', 'AI reads signs and menus', 'AI 读取牌匾与菜单', 'AIが看板とメニューを読み取り', 'AI가 안내판과 메뉴를 읽음', 'L’IA lit panneaux et menus'],
  'lens.tabs': ['โหมดการใช้งาน', 'Modes', '模式', 'モード', '모드', 'Modes'],
  'lens.tabA': ['ฟังเรื่องเล่าโบราณสถาน', 'Heritage stories', '古迹讲解', '史跡の音声ガイド', '유적 이야기', 'Récits du patrimoine'],
  'lens.tabB': ['สั่งอาหารและจองที่พัก', 'Food & stays', '点餐与住宿', '料理と宿', '음식과 숙소', 'Repas et hébergement'],
  'lens.pick': ['เลือกโบราณสถาน', 'Choose a heritage site', '选择古迹', '史跡を選ぶ', '유적 선택', 'Choisir un site'],
  'preset.wat-yai': ['วัดพระศรีรัตนมหาธาตุวรมหาวิหาร (วัดใหญ่) · พ.ศ. 1900', 'Wat Phra Si Rattana Mahathat (Wat Yai) · 1357', '帕西拉达纳玛哈泰寺（大寺）· 1357 年', 'ワット・プラシーラッタナーマハータート（ワット・ヤイ）· 1357年', '왓 프라시랏따나마하탓 (왓 야이) · 1357년', 'Wat Phra Si Rattana Mahathat (Wat Yai) · 1357'],
  'preset.chan-palace': ['โบราณสถานพระราชวังจันทน์ (สมเด็จพระนเรศวรฯ)', 'Chan Palace ruins (King Naresuan)', '詹宫遗址（纳黎萱大帝）', 'チャン王宮跡（ナレースワン大王）', '짠 왕궁 유적 (나레쑤언 대왕)', 'Ruines du palais Chan (roi Naresuan)'],
  'preset.wat-nang-phaya': ['วัดนางพญา (ต้นกำเนิดพระนางพญา เบญจภาคี)', 'Wat Nang Phaya (home of the Phra Nang Phaya amulet)', '南帕亚寺（帕南帕亚佛牌的发源地）', 'ワット・ナンパヤー（プラ・ナーンパヤー仏の発祥地）', '왓 낭파야 (프라 낭파야 부적의 발상지)', 'Wat Nang Phaya (berceau de l’amulette Phra Nang Phaya)'],
  'preset.wat-ratchaburana': ['วัดราชบูรณะ (เจดีย์หลวง 700 ปี & จิตรกรรมฝาผนัง)', 'Wat Ratchaburana (700-year-old chedi and murals)', '拉差布拉那寺（700 年古塔与壁画）', 'ワット・ラーチャブラナ（700年の仏塔と壁画）', '왓 랏차부라나 (700년 된 탑과 벽화)', 'Wat Ratchaburana (chedi de 700 ans et fresques)'],
  'preset.city-pillar': ['ศาลหลักเมืองพิษณุโลก (เสาหลักเมืองไม้มงคล)', 'Phitsanulok City Pillar Shrine', '彭世洛城隍庙（城柱）', 'ピッサヌローク市の柱祠', '핏사눌록 시티 필라 사당', 'Pilier de la ville de Phitsanulok'],
  'lens.or': ['หรือถ่ายภาพป้ายจริง', 'or photograph a real sign', '或拍摄实地牌匾', 'または実際の看板を撮影', '또는 실제 안내판 촬영', 'ou photographiez un vrai panneau'],
  'lens.upload': ['อัปโหลด/ถ่ายภาพป้ายโบราณสถาน', 'Upload or take a photo of a sign', '上传或拍摄牌匾照片', '看板の写真をアップロード・撮影', '안내판 사진 올리기·찍기', 'Importer ou photographier un panneau'],
  'lens.uploadHint': ['รองรับ .jpg .png .webp ไม่เกิน 5MB', '.jpg, .png or .webp, up to 5 MB', '支持 .jpg .png .webp，最大 5 MB', '.jpg .png .webp（5MBまで）', '.jpg .png .webp, 최대 5MB', '.jpg, .png ou .webp, 5 Mo max.'],
  'pipe.ocr': ['อ่านตัวอักษรจากป้าย', 'Reading the sign', '读取牌匾文字', '看板の文字を読み取り', '안내판 글자 읽기', 'Lecture du panneau'],
  'pipe.rag': ['ค้นข้อมูลกรมศิลปากร', 'Looking up official records', '检索官方资料', '公式資料を検索', '공식 자료 검색', 'Recherche dans les archives'],
  'pipe.i18n': ['เตรียมเนื้อหาและเสียง 6 ภาษา', 'Preparing text and audio in 6 languages', '准备 6 种语言的文字与语音', '6言語の文章と音声を準備', '6개 언어 글과 음성 준비', 'Préparation du texte et de l’audio en 6 langues'],
  'pipe.mocr': ['อ่านรายการและราคา', 'Reading dishes and prices', '读取菜品与价格', '料理と価格を読み取り', '메뉴와 가격 읽기', 'Lecture des plats et des prix'],
  'pipe.allergen': ['ตรวจสารก่อภูมิแพ้', 'Checking allergens', '检查过敏原', 'アレルゲンを確認', '알레르기 성분 확인', 'Vérification des allergènes'],
  'pipe.menu': ['สร้างเมนูดิจิทัล 6 ภาษา', 'Building the menu in 6 languages', '生成 6 种语言菜单', '6言語メニューを作成', '6개 언어 메뉴 만들기', 'Création du menu en 6 langues'],
  'lens.emptyTitle': ['เลือกโบราณสถานด้านซ้ายเพื่อฟังเรื่องเล่า', 'Choose a site on the left to hear its story', '在左侧选择古迹收听故事', '左の史跡を選んで物語を聞く', '왼쪽에서 유적을 골라 이야기를 들어 보세요', 'Choisissez un site à gauche pour l’écouter'],
  'lens.emptyText': ['ฟังได้ 6 ภาษา: ไทย อังกฤษ จีน ญี่ปุ่น เกาหลี ฝรั่งเศส · ส่องป้ายแล้วรับคูปองส่วนลด 15%', 'Listen in Thai, English, Chinese, Japanese, Korean or French · scan a sign to earn a 15% coupon', '可用泰、英、中、日、韩、法 6 种语言收听 · 扫描牌匾获得 85 折优惠券', 'タイ語・英語・中国語・日本語・韓国語・フランス語に対応 · 看板を読み取ると15%クーポン', '태국어·영어·중국어·일본어·한국어·프랑스어 지원 · 안내판을 스캔하면 15% 쿠폰', 'En thaï, anglais, chinois, japonais, coréen ou français · scannez un panneau pour un bon de 15 %'],
  'menu.pick': ['เลือกร้านอาหารหรือที่พัก', 'Choose a restaurant or hotel', '选择餐厅或酒店', '飲食店かホテルを選ぶ', '식당 또는 호텔 선택', 'Choisir un restaurant ou un hôtel'],
  'menu.presetBtn': ['ลองดูเมนูร้านก๋วยเตี๋ยวห้อยขา', 'Try the Hoi Kha noodle menu', '试看垂腿船面的菜单', 'ホイカー麺のメニューを見る', '호이카 국수 메뉴 보기', 'Essayer le menu Hoi Kha'],
  'menu.or': ['หรือเลือกจากรายการ', 'or pick from the list', '或从列表中选择', 'またはリストから選ぶ', '또는 목록에서 선택', 'ou choisissez dans la liste'],
  'menu.selectLabel': ['ร้านอาหารหรือโรงแรม', 'Restaurant or hotel', '餐厅或酒店', '飲食店またはホテル', '식당 또는 호텔', 'Restaurant ou hôtel'],
  'menu.scan': ['สแกนเมนูกระดาษเพื่อแปล 6 ภาษา', 'Scan a paper menu to translate it', '扫描纸质菜单进行翻译', '紙のメニューを読み取って翻訳', '종이 메뉴를 스캔해 번역', 'Scanner un menu papier pour le traduire'],
  'menu.emptyTitle': ['เมนู 6 ภาษาและการจองห้องพักจะแสดงที่นี่', 'The menu and room booking appear here', '菜单与订房信息将显示在这里', 'ここにメニューと客室予約が表示されます', '여기에 메뉴와 객실 예약이 표시됩니다', 'Le menu et la réservation s’affichent ici'],
  'menu.emptyText': ['กรองอาหารที่แพ้ จ่ายด้วยพร้อมเพย์ แล้วร้านได้รับใบสั่งภาษาไทยทันที', 'Filter allergens, pay with PromptPay, and the shop instantly gets a Thai order ticket', '筛选过敏原，用 PromptPay 支付，店家立即收到泰文订单', 'アレルギーを絞り込み、PromptPayで支払うと、お店にタイ語の注文票がすぐ届きます', '알레르기를 거르고 PromptPay로 결제하면 가게에 태국어 주문서가 바로 갑니다', 'Filtrez les allergènes, payez par PromptPay : le commerce reçoit aussitôt un ticket en thaï'],

  // ---------- lens results
  'src.preset': ['ฐานข้อมูลกรมศิลปากร', 'Fine Arts Department records', '泰国艺术厅资料', 'タイ芸術局の資料', '태국 예술청 자료', 'Archives du Département des Beaux-Arts'],
  'src.fallback': ['โหมดสำรอง', 'Offline mode', '离线模式', 'オフラインモード', '오프라인 모드', 'Mode hors ligne'],
  'src.latency': ['ตอบกลับ {n} ms', 'Answered in {n} ms', '响应 {n} 毫秒', '応答 {n} ms', '응답 {n} ms', 'Réponse en {n} ms'],
  'lens.uploaded': ['ภาพที่อัปโหลด: {name}', 'Uploaded: {name}', '已上传：{name}', 'アップロード：{name}', '올린 사진: {name}', 'Importé : {name}'],
  'lens.reading': ['กำลังอ่านป้ายและดึงข้อมูล…', 'Reading the sign and looking up records…', '正在读取牌匾并检索资料…', '看板を読み取り、資料を検索中…', '안내판을 읽고 자료를 찾는 중…', 'Lecture du panneau et recherche…'],
  'lens.readingSub': ['อ่านป้าย → ค้นข้อมูล → เตรียมเสียง 6 ภาษา', 'Read → look up → audio in 6 languages', '读取 → 检索 → 6 种语言语音', '読み取り → 検索 → 6言語の音声', '읽기 → 검색 → 6개 언어 음성', 'Lecture → recherche → audio en 6 langues'],
  'file.none': ['ไม่ได้เลือกไฟล์', 'No file chosen', '未选择文件', 'ファイルが選択されていません', '선택한 파일이 없습니다', 'Aucun fichier choisi'],
  'file.type': ['รองรับเฉพาะไฟล์ .jpg .png .webp', 'Only .jpg, .png or .webp files', '仅支持 .jpg .png .webp', '.jpg .png .webp のみ対応', '.jpg .png .webp 파일만 가능', 'Fichiers .jpg, .png ou .webp uniquement'],
  'file.size': ['ไฟล์ใหญ่เกิน 5MB กรุณาย่อขนาดภาพ', 'The file is larger than 5 MB', '文件超过 5 MB', 'ファイルが5MBを超えています', '파일이 5MB를 넘습니다', 'Le fichier dépasse 5 Mo'],
  'lens.noMatch': ['ยังจับคู่ป้ายนี้ไม่ได้ เลือกสถานที่ด้านล่าง', 'We couldn’t match this sign. Choose the place below.', '无法识别此牌匾，请在下方选择地点。', 'この看板を特定できませんでした。下から場所を選んでください。', '이 안내판을 찾지 못했습니다. 아래에서 장소를 고르세요.', 'Panneau non reconnu. Choisissez le lieu ci-dessous.'],
  'lens.ocrText': ['ข้อความที่อ่านได้จากป้าย', 'Text read from the sign', '从牌匾读取的文字', '看板から読み取った文字', '안내판에서 읽은 글', 'Texte lu sur le panneau'],
  'lens.choose': ['เลือกโบราณสถานที่ต้องการฟัง:', 'Choose the site you want to hear about:', '选择想收听的古迹：', '聞きたい史跡を選んでください：', '듣고 싶은 유적을 고르세요:', 'Choisissez le site à écouter :'],
  'lens.refYear': ['อ้างอิงข้อมูล: กรมศิลปากร · พ.ศ. {y} ↗', 'Source: Fine Arts Department · {y} ↗', '资料来源：泰国艺术厅 · {y} 年 ↗', '出典：タイ芸術局 · {y}年 ↗', '출처: 태국 예술청 · {y}년 ↗', 'Source : Beaux-Arts · {y} ↗'],
  'lens.result': ['ผลการสแกน · ตรงกัน {c}% · อ้างอิง: {ref}', 'Scan result · {c}% match · source: {ref}', '扫描结果 · 匹配度 {c}% · 来源：{ref}', 'スキャン結果 · 一致度 {c}% · 出典：{ref}', '스캔 결과 · 일치도 {c}% · 출처: {ref}', 'Résultat · {c} % de correspondance · source : {ref}'],
  'lens.highlights': ['จุดเด่นสำคัญ:', 'Highlights:', '亮点：', '見どころ：', '핵심 포인트:', 'À retenir :'],
  'audio.play': ['▶ เล่นเสียงบรรยาย ({l})', '▶ Play audio ({l})', '▶ 播放讲解（{l}）', '▶ 音声を再生（{l}）', '▶ 음성 재생 ({l})', '▶ Écouter ({l})'],
  'audio.pause': ['⏸ หยุดชั่วคราว', '⏸ Pause', '⏸ 暂停', '⏸ 一時停止', '⏸ 일시정지', '⏸ Pause'],
  'audio.full': ['ฟังฉบับเต็ม (VIP)', 'Full version (VIP)', '完整版（VIP）', '完全版（VIP）', '전체 버전 (VIP)', 'Version complète (VIP)'],
  'audio.fullLocked': ['ฉบับเต็ม (VIP Pass)', 'Full version (VIP Pass)', '完整版（VIP 通行证）', '完全版（VIPパス）', '전체 버전 (VIP 패스)', 'Version complète (Pass VIP)'],
  'audio.unlock': ['👑 ปลดล็อกเสียงฉบับเต็ม + คูปอง 500฿', '👑 Unlock the full audio + ฿500 in coupons', '👑 解锁完整讲解 + 500 泰铢优惠券', '👑 完全版の音声＋500バーツ分のクーポン', '👑 전체 음성 + 500바트 쿠폰 받기', '👑 Audio complet + 500 ฿ de bons'],
  'audio.vipActive': ['👑 VIP · ปลดล็อกฉบับเต็มแล้ว', '👑 VIP · full version unlocked', '👑 VIP · 已解锁完整版', '👑 VIP · 完全版を利用可能', '👑 VIP · 전체 버전 이용 가능', '👑 VIP · version complète débloquée'],
  'audio.stop': ['⏹ หยุด', '⏹ Stop', '⏹ 停止', '⏹ 停止', '⏹ 정지', '⏹ Arrêter'],
  'audio.voice': ['เสียงภาษา: {l} · แหล่งอ้างอิง: {ref}', 'Voice: {l} · source: {ref}', '语音：{l} · 来源：{ref}', '音声：{l} · 出典：{ref}', '음성: {l} · 출처: {ref}', 'Voix : {l} · source : {ref}'],
  'lens.ocrDetails': ['ข้อความที่อ่านได้และแหล่งอ้างอิง', 'Text read and sources', '读取的文字与来源', '読み取った文字と出典', '읽은 글과 출처', 'Texte lu et sources'],
  'lens.matched': ['คำสำคัญที่จับคู่ได้: {k} · แหล่งอ้างอิง: {ref}', 'Matched keywords: {k} · source: {ref}', '匹配关键词：{k} · 来源：{ref}', '一致したキーワード：{k} · 出典：{ref}', '일치한 키워드: {k} · 출처: {ref}', 'Mots-clés reconnus : {k} · source : {ref}'],
  'reward.title': ['สะสมตราประทับสำเร็จ! ({n}/5 โบราณสถาน)', 'Stamp collected! ({n}/5 sites)', '集章成功！（{n}/5 处古迹）', 'スタンプ獲得！（{n}/5 史跡）', '스탬프 획득! ({n}/5 유적)', 'Tampon obtenu ! ({n}/5 sites)'],
  'reward.text': ['รับคูปองส่วนลด 15% ที่ร้านและโรงแรมพาร์ทเนอร์', 'You get 15% coupons at partner restaurants and hotels', '可在合作餐厅和酒店享 85 折优惠券', '提携の飲食店とホテルで使える15%クーポンを獲得', '제휴 식당·호텔 15% 쿠폰을 받았습니다', 'Des bons de 15 % chez les restaurants et hôtels partenaires'],
  'reward.new': ['คูปองใหม่: {c}', 'New coupons: {c}', '新优惠券：{c}', '新しいクーポン：{c}', '새 쿠폰: {c}', 'Nouveaux bons : {c}'],
  'reward.already': ['คุณได้รับคูปองชุดนี้แล้ว ดูได้ในคูปองของฉัน', 'You already have these coupons, see “My coupons”', '你已领取这些优惠券，可在“我的优惠券”查看', 'このクーポンは受け取り済みです（マイクーポン）', '이미 받은 쿠폰입니다. “내 쿠폰”에서 확인하세요', 'Vous avez déjà ces bons, voir « Mes coupons »'],
  'reward.orderAt': ['สั่งที่ {name}', 'Order at {name}', '在 {name} 点餐', '{name}で注文', '{name}에서 주문', 'Commander chez {name}'],
  'speech.unsupported': ['เบราว์เซอร์นี้ไม่รองรับเสียงสังเคราะห์', 'This browser can’t play spoken audio', '此浏览器不支持语音播放', 'このブラウザは音声読み上げに対応していません', '이 브라우저는 음성 재생을 지원하지 않습니다', 'Ce navigateur ne peut pas lire l’audio'],
  'speech.stopped': ['หยุดเสียงบรรยายแล้ว', 'Audio stopped', '已停止讲解', '音声を停止しました', '음성을 멈췄습니다', 'Audio arrêté'],
  'speech.paused': ['หยุดชั่วคราว กด ⏸ อีกครั้งเพื่อเล่นต่อ', 'Paused. Press ⏸ again to continue.', '已暂停，再按 ⏸ 继续。', '一時停止中。⏸ をもう一度押すと再開します。', '일시정지됨. ⏸ 를 다시 누르면 이어집니다.', 'En pause. Appuyez de nouveau sur ⏸ pour reprendre.'],
  'speech.resumed': ['กำลังเล่นต่อ…', 'Continuing…', '继续播放…', '再生を再開…', '이어서 재생 중…', 'Reprise…'],
  'speech.needVip': ['เสียงบรรยายฉบับเต็มสำหรับผู้ถือ VIP Pass (99฿)', 'The full audio guide is for VIP Pass holders (฿99)', '完整讲解仅限 VIP 通行证持有者（99 泰铢）', '完全版の音声ガイドはVIPパス（99バーツ）専用です', '전체 음성 가이드는 VIP 패스(99바트) 전용입니다', 'L’audioguide complet est réservé au Pass VIP (99 ฿)'],
  'speech.playing': ['กำลังบรรยายภาษา {l}…', 'Playing in {l}…', '正在用{l}讲解…', '{l}で再生中…', '{l}로 재생 중…', 'Lecture en {l}…'],
  'speech.toast': ['🔊 กำลังบรรยายภาษา {l}', '🔊 Playing in {l}', '🔊 正在用{l}讲解', '🔊 {l}で再生中', '🔊 {l}로 재생 중', '🔊 Lecture en {l}'],
  'speech.done': ['บรรยายจบแล้ว กด ▶ เพื่อฟังซ้ำ', 'Finished. Press ▶ to listen again.', '讲解结束，按 ▶ 重新收听。', '再生が終わりました。▶ でもう一度。', '재생이 끝났습니다. ▶ 를 눌러 다시 듣기.', 'Terminé. Appuyez sur ▶ pour réécouter.'],
  'speech.fail': ['เล่นเสียงไม่สำเร็จ ลองเปลี่ยนภาษาหรือเบราว์เซอร์', 'Couldn’t play audio. Try another language or browser.', '无法播放，请换一种语言或浏览器。', '再生できませんでした。別の言語かブラウザでお試しください。', '재생하지 못했습니다. 다른 언어나 브라우저로 시도하세요.', 'Lecture impossible. Essayez une autre langue ou un autre navigateur.'],
  'speech.system': ['กำลังบรรยาย ({l}) ด้วยเสียงสังเคราะห์ของอุปกรณ์', 'Playing ({l}) with your device’s built-in voice', '正在使用设备自带语音播放（{l}）', '端末の標準音声で再生中（{l}）', '기기 기본 음성으로 재생 중 ({l})', 'Lecture ({l}) avec la voix de l’appareil'],
  'menu.previewCap': ['ภาพจำลองเมนูกระดาษ ร้านก๋วยเตี๋ยวห้อยขา', 'Sample paper menu, Hoi Kha noodle shop', '纸质菜单示例：垂腿船面', '紙メニューの例：ホイカー麺', '종이 메뉴 예시: 호이카 국수', 'Exemple de menu papier : Hoi Kha'],
  'menu.reading': ['กำลังอ่านเมนูและแปล 6 ภาษา…', 'Reading the menu and translating…', '正在读取并翻译菜单…', 'メニューを読み取り翻訳中…', '메뉴를 읽고 번역하는 중…', 'Lecture et traduction du menu…'],
  'menu.readingSub': ['อ่านเมนู → ตรวจสารก่อภูมิแพ้ → แปล 6 ภาษา', 'Read → check allergens → translate into 6 languages', '读取 → 检查过敏原 → 翻译成 6 种语言', '読み取り → アレルゲン確認 → 6言語に翻訳', '읽기 → 알레르기 확인 → 6개 언어 번역', 'Lecture → allergènes → traduction en 6 langues'],
  'menu.noItems': ['{name} ยังไม่มีรายการ', '{name} has no items yet', '{name} 暂无项目', '{name}にはまだ項目がありません', '{name}에는 아직 항목이 없습니다', '{name} n’a pas encore d’articles'],

  // ---------- digital menu
  'filter.all': ['ทั้งหมด', 'All', '全部', 'すべて', '전체', 'Tout'],
  'filter.mild': ['ไม่เผ็ด', 'Not spicy', '不辣', '辛くない', '안 매운', 'Non épicé'],
  'filter.nopeanut': ['ไม่มีถั่วลิสง', 'No peanuts', '不含花生', 'ピーナッツなし', '땅콩 없음', 'Sans arachides'],
  'filter.halalveg': ['ฮาลาล / มังสวิรัติ', 'Halal / vegetarian', '清真 / 素食', 'ハラール / ベジ', '할랄 / 채식', 'Halal / végétarien'],
  'filter.aria': ['กรองตามอาหารที่แพ้', 'Allergy filters', '过敏原筛选', 'アレルギー絞り込み', '알레르기 필터', 'Filtres allergènes'],
  'block.soldout': ['ของหมดชั่วคราว', 'Sold out for now', '暂时售罄', '一時的に品切れ', '일시 품절', 'Épuisé pour le moment'],
  'block.spicy': ['เผ็ดระดับ {n}/3', 'Spicy level {n}/3', '辣度 {n}/3', '辛さ {n}/3', '매운맛 {n}/3', 'Piment {n}/3'],
  'block.peanut': ['มีถั่วลิสง', 'Contains peanuts', '含花生', 'ピーナッツを含む', '땅콩 포함', 'Contient des arachides'],
  'block.pork': ['มีหมู', 'Contains pork', '含猪肉', '豚肉を含む', '돼지고기 포함', 'Contient du porc'],
  'block.notHalal': ['ไม่ใช่ฮาลาลหรือมังสวิรัติ', 'Not halal or vegetarian', '非清真或素食', 'ハラール・ベジではありません', '할랄·채식 아님', 'Ni halal ni végétarien'],
  'tag.contains': ['มี{a}', 'Contains {a}', '含{a}', '{a}を含む', '{a} 포함', 'Contient : {a}'],
  'menu.add': ['+ สั่ง', '+ Add', '+ 加入', '+ 追加', '+ 담기', '+ Ajouter'],
  'menu.bookRoom': ['จองห้องนี้', 'Book this room', '预订此房', 'この部屋を予約', '이 객실 예약', 'Réserver'],
  'menu.addAria': ['{action} {name}', '{action}: {name}', '{action}：{name}', '{action}：{name}', '{action}: {name}', '{action} : {name}'],
  'menu.eyebrowFood': ['สั่งอาหาร (โหมดสาธิต)', 'Food ordering (demo)', '点餐（演示）', '料理の注文（デモ）', '음식 주문 (데모)', 'Commande de repas (démo)'],
  'menu.eyebrowHotel': ['จองห้องพัก (โหมดสาธิต)', 'Room booking (demo)', '订房（演示）', '客室予約（デモ）', '객실 예약 (데모)', 'Réservation (démo)'],
  'menu.srcPreset': ['เมนูตัวอย่างจากภาพ', 'Sample menu from a photo', '来自照片的示例菜单', '写真から作ったメニュー例', '사진으로 만든 예시 메뉴', 'Menu d’exemple tiré d’une photo'],
  'menu.srcFallback': ['โหมดสำรอง', 'Offline mode', '离线模式', 'オフラインモード', '오프라인 모드', 'Mode hors ligne'],
  'menu.srcDb': ['สถานที่บนแผนที่', 'Listed on the map', '已在地图上', '地図に掲載', '지도에 등록됨', 'Sur la carte'],
  'menu.busyNotice': ['ร้านแจ้งว่าคิวเต็มชั่วคราว ลองใหม่ภายหลัง', 'This place is busy right now. Please try again later.', '该店暂时满座，请稍后再试。', '現在混雑しています。しばらくしてからお試しください。', '지금은 붐빕니다. 잠시 후 다시 시도하세요.', 'Établissement complet pour le moment. Réessayez plus tard.'],
  'menu.flagHint': ['ครัวจะเห็นคำเตือน "{f}" เป็นตัวสีแดงบนใบสั่ง', 'The kitchen will see “{f}” in red on your order ticket', '厨房会在订单上看到红色提示“{f}”', '厨房の注文票に「{f}」が赤字で表示されます', '주방 주문서에 “{f}”가 빨간 글씨로 표시됩니다', 'La cuisine verra « {f} » en rouge sur le ticket'],
  'menu.none': ['ไม่มีรายการที่ตรงเงื่อนไข', 'Nothing matches this filter', '没有符合条件的项目', '条件に合う項目はありません', '조건에 맞는 항목이 없습니다', 'Aucun plat ne correspond'],
  'menu.blocked': ['รายการที่ถูกกรองออกหรือของหมด ({n})', 'Filtered out or sold out ({n})', '已筛除或售罄（{n}）', '除外・品切れ（{n}）', '제외 또는 품절 ({n})', 'Filtrés ou épuisés ({n})'],
  'menu.fee': ['ค่าธรรมเนียมแพลตฟอร์ม {p} คำนวณโดยเซิร์ฟเวอร์ · จ่ายด้วย QR พร้อมเพย์', '{p} platform fee, calculated by the server · pay by PromptPay QR', '平台服务费 {p}，由服务器计算 · 使用 PromptPay 二维码支付', 'プラットフォーム手数料 {p}（サーバーで計算）· PromptPay QRで支払い', '플랫폼 수수료 {p}(서버 계산) · PromptPay QR 결제', 'Frais de plateforme {p}, calculés par le serveur · paiement par QR PromptPay'],
  'menu.viewCart': ['ดูตะกร้า ({n})', 'View cart ({n})', '查看购物车（{n}）', 'カートを見る（{n}）', '장바구니 보기 ({n})', 'Voir le panier ({n})'],

  // ---------- cart & booking
  'cart.title': ['ตะกร้า', 'Cart', '购物车', 'カート', '장바구니', 'Panier'],
  'cart.empty': ['ตะกร้ายังว่าง', 'Your cart is empty', '购物车是空的', 'カートは空です', '장바구니가 비어 있습니다', 'Votre panier est vide'],
  'cart.emptyText': ['เลือกเมนูหรือห้องพักแล้วกดเพิ่มลงตะกร้า', 'Pick a dish or a room to get started', '选择菜品或客房开始吧', '料理か客室を選んでください', '메뉴나 객실을 골라 보세요', 'Choisissez un plat ou une chambre'],
  'cart.added': ['เพิ่ม "{name}" ลงตะกร้าแล้ว', 'Added “{name}” to your cart', '已将“{name}”加入购物车', '「{name}」をカートに追加しました', '“{name}”을(를) 담았습니다', '« {name} » ajouté au panier'],
  'cart.switch': ['ตะกร้ามีรายการจากร้านหรือโรงแรมอื่นอยู่ ต้องการล้างตะกร้าแล้วเริ่มรายการใหม่หรือไม่?', 'Your cart has items from another place. Clear it and start a new order?', '购物车里有其他店家的项目，要清空并重新开始吗？', 'カートに別のお店の商品があります。空にして新しく始めますか？', '장바구니에 다른 업체 항목이 있습니다. 비우고 새로 시작할까요?', 'Votre panier contient des articles d’un autre lieu. Le vider et recommencer ?'],
  'cart.eyebrowFood': ['สั่งอาหารล่วงหน้า', 'Food order', '提前点餐', '事前注文', '미리 주문', 'Commande de repas'],
  'cart.eyebrowHotel': ['จองห้องพัก', 'Room booking', '订房', '客室予約', '객실 예약', 'Réservation'],
  'cart.table': ['หมายเลขโต๊ะ / รูปแบบการรับอาหาร', 'Table number or pick-up', '桌号或取餐方式', 'テーブル番号または受け取り方法', '테이블 번호 또는 수령 방법', 'Numéro de table ou à emporter'],
  'cart.tablePh': ['เช่น โต๊ะ 4 หรือ สั่งกลับบ้าน', 'e.g. Table 4 or take-away', '例如：4 号桌或外带', '例：4番テーブル、持ち帰り', '예: 4번 테이블 또는 포장', 'ex. table 4 ou à emporter'],
  'cart.perRoomNight': ['ห้อง / คืน', 'room / night', '间 / 晚', '室 / 泊', '객실 / 박', 'chambre / nuit'],
  'cart.less': ['ลด 1: {name}', 'One less {name}', '减少 1：{name}', '1つ減らす：{name}', '하나 빼기: {name}', 'En retirer un : {name}'],
  'cart.more': ['เพิ่ม 1: {name}', 'One more {name}', '增加 1：{name}', '1つ増やす：{name}', '하나 더: {name}', 'En ajouter un : {name}'],
  'cart.flagsLegend': ['ข้อจำกัดด้านอาหาร (ครัวเห็นเป็นป้ายสีแดง)', 'Dietary needs (the kitchen sees them in red)', '饮食限制（厨房会看到红色提示）', '食事の制限（厨房に赤字で表示）', '식이 제한 (주방에 빨간 글씨로 표시)', 'Régime alimentaire (affiché en rouge en cuisine)'],
  'cart.flagsHelp': ['แปลเป็นคำเตือนภาษาไทยตัวใหญ่ให้ครัวโดยอัตโนมัติ', 'Turned into a large Thai warning for the kitchen automatically', '自动转为醒目的泰文提示给厨房', '厨房向けに大きなタイ語の警告へ自動変換', '주방용 큰 태국어 경고로 자동 변환', 'Converti automatiquement en avertissement thaï pour la cuisine'],
  'cart.noCoupon': ['ยังไม่มีคูปองสำหรับร้านนี้ ส่องป้ายโบราณสถาน หรือซื้อ VIP Pass (99฿) เพื่อรับคูปอง', 'No coupons for this place yet. Scan a heritage sign or buy a VIP Pass (฿99) to get some.', '此店暂无优惠券。扫描古迹牌匾或购买 VIP 通行证（99 泰铢）即可获得。', 'このお店のクーポンはまだありません。史跡の看板を読み取るかVIPパス（99バーツ）で入手できます。', '이 업체 쿠폰이 아직 없습니다. 유적 안내판을 스캔하거나 VIP 패스(99바트)를 구매하세요.', 'Pas encore de bon ici. Scannez un panneau ou prenez le Pass VIP (99 ฿).'],
  'cart.noCouponHotel': ['ยังไม่มีคูปองสำหรับโรงแรมนี้ ซื้อ VIP Pass (99฿) เพื่อรับคูปองที่พัก', 'No coupons for this hotel yet. Buy a VIP Pass (฿99) to get hotel coupons.', '此酒店暂无优惠券，购买 VIP 通行证（99 泰铢）可获得住宿券。', 'このホテルのクーポンはまだありません。VIPパス（99バーツ）で宿泊クーポンを入手できます。', '이 호텔 쿠폰이 아직 없습니다. VIP 패스(99바트)로 숙박 쿠폰을 받으세요.', 'Pas encore de bon pour cet hôtel. Le Pass VIP (99 ฿) en donne.'],
  'cart.couponsLegend': ['คูปองส่วนลดของคุณ', 'Your coupons', '你的优惠券', 'お持ちのクーポン', '내 쿠폰', 'Vos bons'],
  'cart.calculating': ['กำลังคำนวณราคา…', 'Calculating the price…', '正在计算价格…', '価格を計算中…', '가격 계산 중…', 'Calcul du prix…'],
  'cart.adjusted': ['ครัวจะปรับสูตรตามข้อจำกัดอาหารของคุณ', 'The kitchen will adapt your dishes to your dietary needs', '厨房会根据你的饮食限制调整菜品', '食事の制限に合わせて調理します', '주방이 식이 제한에 맞춰 조리합니다', 'La cuisine adaptera vos plats à votre régime'],
  'cart.ticketFood': ['ตัวอย่างใบสั่ง (ภาษาไทยสำหรับครัว)', 'Order ticket preview (in Thai for the kitchen)', '订单预览（泰文，供厨房使用）', '注文票のプレビュー（厨房向けタイ語）', '주문서 미리보기 (주방용 태국어)', 'Aperçu du ticket (en thaï pour la cuisine)'],
  'cart.ticketBooking': ['ตัวอย่างใบจองห้องพัก (ส่งถึงแผนกต้อนรับ)', 'Booking slip preview (sent to the front desk)', '订房单预览（发送至前台）', '予約票のプレビュー（フロントへ送信）', '예약증 미리보기 (프런트로 전송)', 'Aperçu de la réservation (envoyée à l’accueil)'],
  'cart.clear': ['ล้างตะกร้า', 'Clear cart', '清空购物车', 'カートを空にする', '장바구니 비우기', 'Vider le panier'],
  'cart.pay': ['ชำระเงินผ่าน QR PromptPay', 'Pay with PromptPay QR', '使用 PromptPay 二维码支付', 'PromptPay QRで支払う', 'PromptPay QR로 결제', 'Payer par QR PromptPay'],
  'cart.payAmount': ['ชำระ {v} ด้วย QR PromptPay', 'Pay {v} with PromptPay QR', '用 PromptPay 二维码支付 {v}', '{v}をPromptPay QRで支払う', 'PromptPay QR로 {v} 결제', 'Payer {v} par QR PromptPay'],
  'bk.legend': ['รายละเอียดการเข้าพัก', 'Your stay', '入住信息', 'ご宿泊の内容', '숙박 정보', 'Votre séjour'],
  'bk.checkin': ['วันเช็คอิน', 'Check-in date', '入住日期', 'チェックイン日', '체크인 날짜', 'Date d’arrivée'],
  'bk.nights': ['จำนวนคืน', 'Nights', '晚数', '泊数', '박 수', 'Nuits'],
  'bk.night1': ['1 คืน', '1 night', '1 晚', '1泊', '1박', '1 nuit'],
  'bk.nightN': ['{n} คืน', '{n} nights', '{n} 晚', '{n}泊', '{n}박', '{n} nuits'],
  'bk.guests': ['ผู้เข้าพัก', 'Guests', '入住人数', '人数', '인원', 'Personnes'],
  'bk.guest1': ['1 ท่าน', '1 guest', '1 位', '1名', '1명', '1 personne'],
  'bk.guestN': ['{n} ท่าน', '{n} guests', '{n} 位', '{n}名', '{n}명', '{n} personnes'],
  'bk.dates': ['เช็คอิน {a} → เช็คเอาต์ {b}', 'Check-in {a} → check-out {b}', '入住 {a} → 退房 {b}', 'チェックイン {a} → チェックアウト {b}', '체크인 {a} → 체크아웃 {b}', 'Arrivée {a} → départ {b}'],
  'bk.note': ['คำขอเพิ่มเติม (ถ้ามี)', 'Special requests (optional)', '其他要求（选填）', 'ご要望（任意）', '추가 요청 (선택)', 'Demandes particulières (facultatif)'],
  'bk.notePh': ['เช่น ขอห้องชั้นสูง, เช็คอินประมาณ 15:00 น.', 'e.g. high floor, arriving around 3 pm', '例如：高楼层，约 15:00 入住', '例：高層階希望、15時頃チェックイン', '예: 높은 층, 오후 3시쯤 도착', 'ex. étage élevé, arrivée vers 15 h'],
  'coupon.pct': ['ลด {v}%', '{v}% off', '减 {v}%', '{v}%オフ', '{v}% 할인', '-{v} %'],
  'coupon.fixed': ['ลด {v}', '{v} off', '减 {v}', '{v}引き', '{v} 할인', '-{v}'],
  'coupon.min': ['ขั้นต่ำ {v}', 'min. spend {v}', '满 {v} 可用', '{v}以上で利用可', '최소 {v}', 'dès {v}'],
  'coupon.vip': ['VIP Pass', 'VIP Pass', 'VIP 通行证', 'VIPパス', 'VIP 패스', 'Pass VIP'],
  'coupon.stamp': ['ตราประทับมรดก', 'Heritage stamp', '古迹印章', '史跡スタンプ', '유적 스탬프', 'Tampon patrimoine'],
  'coupon.vipAuto': ['👑 ส่วนลดสมาชิก VIP 15% อัตโนมัติ', '👑 Automatic 15% VIP discount', '👑 VIP 自动 85 折', '👑 VIP自動15%オフ', '👑 VIP 자동 15% 할인', '👑 Réduction VIP automatique de 15 %'],
  'coupon.saves': [' — ลด {v}', ' — saves {v}', ' — 省 {v}', ' — {v}お得', ' — {v} 할인', ' — économie de {v}'],
  'coupon.notYet': [' — ยอดยังไม่ถึงขั้นต่ำ', ' — below the minimum spend', ' — 未达最低消费', ' — 最低利用額に未達', ' — 최소 금액 미달', ' — montant minimum non atteint'],
  'coupon.none': ['ไม่ใช้คูปอง', 'No coupon', '不使用优惠券', 'クーポンを使わない', '쿠폰 사용 안 함', 'Pas de bon'],
  'coupon.used': ['ใช้แล้ว', 'Used', '已使用', '使用済み', '사용함', 'Utilisé'],
  'coupon.use': ['ใช้คูปอง', 'Use coupon', '使用', '使う', '사용하기', 'Utiliser'],

  // ---------- price breakdown
  'bd.rooms': [' × {q} ห้อง × {n} คืน', ' × {q} room(s) × {n} night(s)', ' × {q} 间 × {n} 晚', ' × {q}室 × {n}泊', ' × {q}실 × {n}박', ' × {q} chambre(s) × {n} nuit(s)'],
  'bd.subtotal': ['ยอดรวมรายการ', 'Subtotal', '小计', '小計', '소계', 'Sous-total'],
  'bd.vipDiscount': ['👑 ส่วนลดสมาชิก VIP 15%', '👑 VIP 15% discount', '👑 VIP 85 折', '👑 VIP 15%オフ', '👑 VIP 15% 할인', '👑 Réduction VIP 15 %'],
  'bd.coupon': ['ส่วนลดคูปอง {c}', 'Coupon {c}', '优惠券 {c}', 'クーポン {c}', '쿠폰 {c}', 'Bon {c}'],
  'bd.fee': ['ค่าธรรมเนียมแพลตฟอร์มและแปล 6 ภาษา ({p}%)', 'Platform and translation fee ({p}%)', '平台与翻译服务费（{p}%）', 'プラットフォーム・翻訳手数料（{p}%）', '플랫폼·번역 수수료 ({p}%)', 'Frais de plateforme et traduction ({p} %)'],
  'bd.total': ['ยอดชำระสุทธิ', 'Total to pay', '应付总额', 'お支払い合計', '결제 금액', 'Total à payer'],
  'bd.vipPass': ['Phitsanulok VIP Pass (7 วัน)', 'Phitsanulok VIP Pass (7 days)', '彭世洛 VIP 通行证（7 天）', 'ピッサヌローク VIPパス（7日間）', '핏사눌록 VIP 패스 (7일)', 'Pass VIP Phitsanulok (7 jours)'],

  // ---------- booking slip
  'slip.preview': ['ตัวอย่างใบจองห้องพัก', 'Booking slip preview', '订房单预览', '予約票のプレビュー', '예약증 미리보기', 'Aperçu de la réservation'],
  'slip.no': ['ใบจอง {no}', 'Booking {no}', '订单 {no}', '予約 {no}', '예약 {no}', 'Réservation {no}'],
  'slip.badge': ['{n} คืน · {g} ท่าน', '{n} night(s) · {g} guest(s)', '{n} 晚 · {g} 位', '{n}泊 · {g}名', '{n}박 · {g}명', '{n} nuit(s) · {g} pers.'],
  'slip.checkin': ['เช็คอิน', 'Check-in', '入住', 'チェックイン', '체크인', 'Arrivée'],
  'slip.checkout': ['เช็คเอาต์', 'Check-out', '退房', 'チェックアウト', '체크아웃', 'Départ'],
  'slip.room': ['{name} × {q} ห้อง', '{name} × {q} room(s)', '{name} × {q} 间', '{name} × {q}室', '{name} × {q}실', '{name} × {q} chambre(s)'],
  'slip.note': ['คำขอเพิ่มเติม: {v}', 'Requests: {v}', '其他要求：{v}', 'ご要望：{v}', '요청 사항: {v}', 'Demandes : {v}'],

  // ---------- payment dialog
  'pay.creating': ['กำลังสร้าง QR พร้อมเพย์…', 'Creating your PromptPay QR…', '正在生成 PromptPay 二维码…', 'PromptPay QRを作成中…', 'PromptPay QR 만드는 중…', 'Création du QR PromptPay…'],
  'pay.server': ['ยอดเงินคำนวณจากเซิร์ฟเวอร์', 'The amount is calculated by the server', '金额由服务器计算', '金額はサーバーで計算されます', '금액은 서버에서 계산됩니다', 'Le montant est calculé par le serveur'],
  'pay.failed': ['ชำระเงินไม่สำเร็จ', 'Payment failed', '支付失败', 'お支払いに失敗しました', '결제 실패', 'Échec du paiement'],
  'pay.eyebrow': ['ชำระด้วย Thai QR (โหมดสาธิต)', 'Pay with Thai QR (demo)', '使用泰国 QR 支付（演示）', 'タイQRで支払い（デモ）', '태국 QR 결제 (데모)', 'Paiement par QR thaï (démo)'],
  'pay.demo': ['โหมดสาธิต', 'Demo mode', '演示模式', 'デモモード', '데모 모드', 'Mode démo'],
  'pay.noBank': ['ไม่ได้ผูกบัญชีธนาคารจริง', 'Not linked to a real bank account', '未绑定真实银行账户', '実際の銀行口座とは連携していません', '실제 은행 계좌와 연결되지 않음', 'Non relié à un vrai compte'],
  'pay.sampleQr': ['QR ตัวอย่าง ห้ามโอนเงิน', 'Sample QR, do not transfer money', '示例二维码，请勿转账', 'サンプルQR：送金しないでください', '예시 QR, 송금하지 마세요', 'QR d’exemple, ne virez pas d’argent'],
  'pay.sampleText': ['ยังไม่ได้ตั้งค่าบัญชีรับเงิน จึงไม่มีใครโอนเงินผิดบัญชีได้', 'No receiving account is set up, so nobody can send money by mistake', '未设置收款账户，因此不会误转账', '受取口座が未設定のため、誤って送金されることはありません', '수취 계좌가 없어 잘못 송금될 일이 없습니다', 'Aucun compte de réception : pas de virement par erreur'],
  'pay.target': ['พร้อมเพย์สาธิต: {t} · ยอดชำระ {v}', 'Demo PromptPay: {t} · amount {v}', '演示 PromptPay：{t} · 金额 {v}', 'デモ用PromptPay：{t} · 金額 {v}', '데모 PromptPay: {t} · 금액 {v}', 'PromptPay démo : {t} · montant {v}'],
  'pay.expires': ['QR หมดอายุใน', 'QR expires in', '二维码有效期剩余', 'QRの有効期限まで', 'QR 만료까지', 'Le QR expire dans'],
  'pay.amountDemo': ['ยอดจำลอง: {v}', 'Demo amount: {v}', '演示金额：{v}', 'デモ金額：{v}', '데모 금액: {v}', 'Montant de démo : {v}'],
  'pay.demoWarn': ['โหมดสาธิต: กดปุ่มยืนยันด้านล่างแทนการโอนเงินจริง', 'Demo mode: press confirm below instead of transferring money', '演示模式：请点击下方确认，无需真实转账', 'デモモード：送金せずに下の確定ボタンを押してください', '데모 모드: 송금 대신 아래 확인을 누르세요', 'Mode démo : appuyez sur Confirmer au lieu de virer'],
  'pay.details': ['ข้อมูลรายการชำระเงิน (สาธิต)', 'Payment data (demo)', '支付数据（演示）', '支払いデータ（デモ）', '결제 데이터 (데모)', 'Données de paiement (démo)'],
  'pay.cancel': ['ยกเลิก', 'Cancel', '取消', 'キャンセル', '취소', 'Annuler'],
  'pay.confirm': ['ยืนยันการชำระเงิน (สาธิต)', 'Confirm payment (demo)', '确认支付（演示）', '支払いを確定（デモ）', '결제 확인 (데모)', 'Confirmer le paiement (démo)'],
  'pay.confirming': ['กำลังยืนยัน…', 'Confirming…', '正在确认…', '確認中…', '확인 중…', 'Confirmation…'],
  'pay.newQr': ['สร้าง QR ใหม่', 'New QR code', '重新生成二维码', 'QRを再作成', '새 QR 만들기', 'Nouveau QR'],
  'pay.titleFood': ['สั่งอาหารล่วงหน้า · {name}', 'Food order · {name}', '点餐 · {name}', '注文 · {name}', '음식 주문 · {name}', 'Commande · {name}'],
  'pay.titleHotel': ['จองห้องพัก · {name}', 'Room booking · {name}', '订房 · {name}', '客室予約 · {name}', '객실 예약 · {name}', 'Réservation · {name}'],
  'pay.vipDone': ['เปิดใช้ VIP Pass แล้ว', 'VIP Pass activated', 'VIP 通行证已开通', 'VIPパスが有効になりました', 'VIP 패스 활성화', 'Pass VIP activé'],
  'pay.until': ['ใช้ได้ถึง {d}', 'Valid until {d}', '有效期至 {d}', '{d}まで有効', '{d}까지 유효', 'Valable jusqu’au {d}'],
  'pay.vouchers': ['คูปองที่ได้รับ {n} ใบ (รวม {v})', '{n} vouchers received (worth {v})', '获得 {n} 张优惠券（共 {v}）', 'クーポン{n}枚（合計{v}）', '쿠폰 {n}장 (총 {v})', '{n} bons reçus (valeur {v})'],
  'pay.goLens': ['ฟังเรื่องเล่าฉบับเต็ม', 'Listen to the full audio guide', '收听完整讲解', '完全版の音声を聞く', '전체 음성 듣기', 'Écouter l’audioguide complet'],
  'pay.bookDone': ['จองห้องพักสำเร็จ · ใบจอง {no}', 'Room booked · booking {no}', '订房成功 · 订单 {no}', '予約完了 · 予約番号 {no}', '예약 완료 · 예약 {no}', 'Chambre réservée · {no}'],
  'pay.bookText': ['ส่งใบจองถึงโรงแรมแล้ว แสดงใบจองนี้ตอนเช็คอิน', 'Your booking slip has been sent to the hotel. Show it at check-in.', '订房单已发送至酒店，入住时请出示。', '予約票をホテルに送信しました。チェックイン時にご提示ください。', '예약증을 호텔에 보냈습니다. 체크인 때 보여 주세요.', 'La réservation a été envoyée à l’hôtel. Présentez-la à l’arrivée.'],
  'pay.toHotel': ['ดูการจองในหน้าจอโรงแรม (สาธิต)', 'See it on the hotel’s screen (demo)', '在酒店端查看（演示）', 'ホテル側の画面で見る（デモ）', '호텔 화면에서 보기 (데모)', 'Voir côté hôtel (démo)'],
  'pay.foodDone': ['ชำระเงินสำเร็จ · ออเดอร์ {no}', 'Paid · order {no}', '支付成功 · 订单 {no}', '支払い完了 · 注文 {no}', '결제 완료 · 주문 {no}', 'Payé · commande {no}'],
  'pay.foodText': ['ส่งใบสั่งภาษาไทยพร้อมคำเตือนภูมิแพ้ถึงครัวแล้ว', 'Your order went to the kitchen in Thai, with allergy warnings', '订单已以泰文连同过敏提示发送至厨房', 'アレルギー警告付きのタイ語注文票を厨房に送りました', '알레르기 경고가 담긴 태국어 주문서를 주방에 보냈습니다', 'Commande envoyée en cuisine en thaï, avec les alertes allergènes'],
  'pay.toShop': ['ดูออเดอร์ในหน้าจอร้าน (สาธิต)', 'See it on the shop’s screen (demo)', '在商家端查看（演示）', 'お店側の画面で見る（デモ）', '가게 화면에서 보기 (데모)', 'Voir côté commerce (démo)'],

  // ---------- VIP card & wallet & toasts
  'vip.title': ['ฟังเรื่องเล่าฉบับเต็ม + คูปอง {v}', 'Full audio guide + {v} in coupons', '完整讲解 + {v} 优惠券', '完全版の音声ガイド＋{v}分のクーポン', '전체 음성 가이드 + {v} 쿠폰', 'Audioguide complet + {v} de bons'],
  'vip.per': ['฿ ต่อทริป 7 วัน', '฿ per 7-day trip', '泰铢 / 7 天行程', 'バーツ / 7日間', '바트 / 7일 여행', '฿ par séjour de 7 jours'],
  'vip.buy': ['✨ อัปเกรด VIP Pass (99฿)', '✨ Upgrade to VIP Pass (฿99)', '✨ 升级 VIP 通行证（99 泰铢）', '✨ VIPパスにアップグレード（99バーツ）', '✨ VIP 패스 업그레이드 (99바트)', '✨ Passer au Pass VIP (99 ฿)'],
  'vip.active': ['✓ VIP ใช้ได้ถึง {d}', '✓ VIP valid until {d}', '✓ VIP 有效期至 {d}', '✓ VIPは{d}まで有効', '✓ VIP {d}까지 유효', '✓ VIP valable jusqu’au {d}'],
  'vip.coupons': ['ดูคูปอง ({n})', 'My coupons ({n})', '我的优惠券（{n}）', 'マイクーポン（{n}）', '내 쿠폰 ({n})', 'Mes coupons ({n})'],
  'wallet.title': ['คูปองและตราประทับ', 'Coupons and stamps', '优惠券与印章', 'クーポンとスタンプ', '쿠폰과 스탬프', 'Coupons et tampons'],
  'wallet.stamps': ['ตราประทับ 5 โบราณสถาน', 'Stamps from 5 heritage sites', '5 处古迹印章', '5つの史跡スタンプ', '유적 5곳 스탬프', 'Tampons des 5 sites'],
  'wallet.coupons': ['คูปองส่วนลดของฉัน', 'My discount coupons', '我的优惠券', '割引クーポン', '내 할인 쿠폰', 'Mes bons de réduction'],
  'wallet.none': ['ยังไม่มีคูปอง ส่องป้ายโบราณสถาน หรือซื้อ VIP Pass (99฿) เพื่อรับคูปอง', 'No coupons yet. Scan a heritage sign or buy a VIP Pass (฿99) to get some.', '还没有优惠券。扫描古迹牌匾或购买 VIP 通行证（99 泰铢）即可获得。', 'クーポンはまだありません。史跡の看板を読み取るかVIPパス（99バーツ）で入手できます。', '아직 쿠폰이 없습니다. 유적 안내판을 스캔하거나 VIP 패스(99바트)를 구매하세요.', 'Aucun bon pour l’instant. Scannez un panneau ou prenez le Pass VIP (99 ฿).'],
  'wallet.try': ['ลองส่องป้ายวัดใหญ่', 'Try scanning Wat Yai’s sign', '试试扫描大寺牌匾', 'ワット・ヤイの看板を試す', '왓 야이 안내판 스캔해 보기', 'Essayer avec le panneau de Wat Yai'],
  'toast.vipOn': ['👑 เปิดใช้ VIP Pass แล้ว รับคูปองและส่วนลดอาหาร 15%', '👑 VIP Pass active: coupons and 15% off food', '👑 VIP 通行证已开通：优惠券与餐饮 85 折', '👑 VIPパス有効：クーポンと料理15%オフ', '👑 VIP 패스 활성화: 쿠폰과 음식 15% 할인', '👑 Pass VIP actif : bons et -15 % sur les repas'],
  'toast.paid': ['ชำระเงินสำเร็จ', 'Payment complete', '支付成功', 'お支払い完了', '결제 완료', 'Paiement effectué'],
  'toast.booked': ['จองห้องพักสำเร็จ ส่งใบจอง {no} ถึงโรงแรมแล้ว', 'Room booked. Slip {no} sent to the hotel.', '订房成功，订单 {no} 已发送至酒店。', '予約完了。予約票 {no} をホテルに送信しました。', '예약 완료. 예약증 {no}을(를) 호텔에 보냈습니다.', 'Chambre réservée. {no} envoyée à l’hôtel.'],
  'toast.ordered': ['ชำระเงินสำเร็จ ส่งออเดอร์ {no} ถึงร้านแล้ว', 'Paid. Order {no} sent to the shop.', '支付成功，订单 {no} 已发送至店家。', '支払い完了。注文 {no} をお店に送信しました。', '결제 완료. 주문 {no}을(를) 가게에 보냈습니다.', 'Payé. Commande {no} envoyée.']
};

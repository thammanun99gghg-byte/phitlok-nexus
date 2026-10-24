// Home page translations. Thai is read from the page itself, so only the other 5 languages live here.
export const LANGS = ['th', 'en', 'zh', 'ja', 'ko', 'fr'];

// Shown next to the language buttons so a visitor recognises the switcher in any language.
export const LANG_WORD = { th: 'ภาษา', en: 'Language', zh: '语言', ja: '言語', ko: '언어', fr: 'Langue' };

export const TITLE = {
  en: 'PHITLOK NEXUS — Explore Phitsanulok in 3D, in 6 languages',
  zh: 'PHITLOK NEXUS — 3D 畅游彭世洛，支持 6 种语言',
  ja: 'PHITLOK NEXUS — ピッサヌロークを3Dで、6言語で',
  ko: 'PHITLOK NEXUS — 핏사눌록을 3D로, 6개 언어로',
  fr: 'PHITLOK NEXUS — Phitsanulok en 3D, en 6 langues'
};

// The highlighted headline line cycles through these.
export const HERO_FEATURES = {
  th: ['เห็นทั้งเมือง 3 มิติ', 'ฟังเรื่องเล่า 6 ภาษา', 'ส่องป้าย รู้ประวัติ', 'สั่งอาหารปลอดภัย', 'จองที่พักง่าย ๆ'],
  en: ['The city in 3D', 'Stories in 6 languages', 'Scan a sign, hear its past', 'Allergy-safe ordering', 'Book a stay in a tap'],
  zh: ['3D 全景看全城', '6 种语言听故事', '扫描牌匾知历史', '安心点餐避过敏', '轻松预订住宿'],
  ja: ['街まるごと3Dで', '6言語で歴史ガイド', '看板をかざして歴史を知る', 'アレルギーも安心の注文', '宿もかんたん予約'],
  ko: ['도시 전체를 3D로', '6개 언어 이야기 가이드', '안내판 스캔으로 역사 알기', '알레르기 걱정 없는 주문', '숙소도 간편 예약'],
  fr: ['La ville en 3D', 'Récits en 6 langues', 'Scannez, découvrez l’histoire', 'Commandez sans allergènes', 'Réservez en un geste']
};

// Units after the live numbers. Empty means the label above already says what is counted.
export const STAT_UNITS = {
  places: { th: ' แห่ง', en: '', zh: ' 处', ja: 'か所', ko: '곳', fr: '' },
  passes: { th: ' ใบ', en: '', zh: ' 张', ja: '枚', ko: '장', fr: '' },
  orders: { th: ' รายการ', en: '', zh: ' 笔', ja: '件', ko: '건', fr: '' }
};

export const T = {
  // header & menu
  skip: { en: 'Skip to main content', zh: '跳到主要内容', ja: 'メインコンテンツへ移動', ko: '본문으로 건너뛰기', fr: 'Aller au contenu principal' },
  'nav.home': { en: 'Home', zh: '首页', ja: 'ホーム', ko: '홈', fr: 'Accueil' },
  'nav.app': { en: 'App', zh: '应用', ja: 'アプリ', ko: '앱', fr: 'Application' },
  'nav.credits': { en: 'Credits', zh: '致谢', ja: 'クレジット', ko: '크레딧', fr: 'Crédits' },
  'nav.aria': { en: 'Main pages', zh: '主要页面', ja: 'メインページ', ko: '주요 페이지', fr: 'Pages principales' },
  'signup.btn': { en: 'Sign up', zh: '注册', ja: '新規登録', ko: '회원가입', fr: 'S’inscrire' },
  'signup.menu': { en: 'Sign up (traveler · shop · hotel)', zh: '注册（游客 · 商家 · 住宿）', ja: '新規登録（旅行者・お店・宿）', ko: '회원가입 (여행자 · 상점 · 숙소)', fr: 'S’inscrire (voyageur · commerce · hébergement)' },
  openApp: { en: 'Open app', zh: '打开应用', ja: 'アプリを開く', ko: '앱 열기', fr: 'Ouvrir l’app' },
  'menu.vip': { en: 'Upgrade to VIP Pass (฿99)', zh: '升级 VIP 通行证（99 泰铢）', ja: 'VIPパスにアップグレード（99バーツ）', ko: 'VIP 패스 업그레이드 (99바트)', fr: 'Passer au Pass VIP (99 ฿)' },
  'menu.theme': { en: 'Light / dark theme', zh: '切换浅色 / 深色', ja: 'ライト / ダーク切替', ko: '라이트 / 다크 전환', fr: 'Thème clair / sombre' },
  'menu.aria': { en: 'Menu', zh: '菜单', ja: 'メニュー', ko: '메뉴', fr: 'Menu' },
  'aria.theme': { en: 'Switch light or dark theme', zh: '切换浅色或深色主题', ja: 'ライト/ダークテーマを切り替え', ko: '라이트 또는 다크 테마 전환', fr: 'Basculer le thème clair ou sombre' },
  'aria.menu': { en: 'Open menu', zh: '打开菜单', ja: 'メニューを開く', ko: '메뉴 열기', fr: 'Ouvrir le menu' },

  // hero
  'hero.line': { en: 'Explore Phitsanulok', zh: '畅游彭世洛', ja: 'ピッサヌロークを旅しよう', ko: '핏사눌록 여행', fr: 'Explorez Phitsanulok' },
  'hero.sr': {
    en: 'The city in 3D, stories in 6 languages, scan a sign to hear its history, allergy-safe ordering and easy hotel booking',
    zh: '3D 全景看全城、6 种语言听故事、扫描牌匾了解历史、安心点餐避开过敏原、轻松预订住宿',
    ja: '街まるごと3D、6言語の歴史ガイド、看板をかざして歴史を知る、アレルギーも安心の注文、宿のかんたん予約',
    ko: '도시 전체를 3D로, 6개 언어 이야기 가이드, 안내판 스캔으로 역사 알기, 알레르기 걱정 없는 주문, 간편한 숙소 예약',
    fr: 'La ville en 3D, des récits en 6 langues, un panneau scanné pour découvrir son histoire, des commandes sans allergènes et une réservation simple'
  },
  'hero.lead': {
    en: 'Temples, palaces, great food and places to stay, on a real map, all in one app.',
    zh: '寺庙、宫殿、美食与住宿，尽在真实地图上，一个应用全搞定。',
    ja: '寺院、王宮、おいしいお店、宿泊先を実際の地図で。すべてひとつのアプリで。',
    ko: '사원, 왕궁, 맛집, 숙소까지 실제 지도 위에서 한 앱으로.',
    fr: 'Temples, palais, bonnes tables et hébergements sur une vraie carte, dans une seule application.'
  },
  'hero.start': { en: 'Start exploring', zh: '开始游览', ja: '旅を始める', ko: '여행 시작', fr: 'Commencer' },
  'hero.how': { en: 'How to try it', zh: '试用指南', ja: '使い方を見る', ko: '사용 방법', fr: 'Comment l’essayer' },
  'aria.feats': { en: 'What you can do in the app', zh: '应用功能', ja: 'アプリでできること', ko: '앱에서 할 수 있는 일', fr: 'Ce que propose l’application' },
  'feat.map': { en: '3D map', zh: '3D 地图', ja: '3Dマップ', ko: '3D 지도', fr: 'Carte 3D' },
  'feat.audio': { en: 'Audio guide in 6 languages', zh: '6 种语言语音导览', ja: '6言語の音声ガイド', ko: '6개 언어 음성 가이드', fr: 'Audioguide en 6 langues' },
  'feat.allergy': { en: 'Allergy filter', zh: '过敏原筛选', ja: 'アレルギー絞り込み', ko: '알레르기 필터', fr: 'Filtre allergènes' },
  'feat.pay': { en: 'Pay with PromptPay', zh: '使用 PromptPay 支付', ja: 'PromptPayで支払い', ko: 'PromptPay 결제', fr: 'Payer avec PromptPay' },
  'hero.caption': {
    en: 'Middle: real places in Phitsanulok · Left and right: illustrative food and stay photos',
    zh: '中间：彭世洛的真实景点 · 左右：餐饮与住宿示意图',
    ja: '中央：ピッサヌロークに実在する場所 · 左右：料理と宿泊のイメージ写真',
    ko: '가운데: 핏사눌록의 실제 장소 · 좌우: 음식·숙소 참고 이미지',
    fr: 'Au centre : lieux réels de Phitsanulok · À gauche et à droite : photos d’illustration'
  },
  'hero.credit': { en: 'Photo credits', zh: '图片来源', ja: '写真クレジット', ko: '사진 출처', fr: 'Crédits photo' },
  'aria.pause': { en: 'Pause moving photos', zh: '暂停滚动图片', ja: '写真の動きを止める', ko: '움직이는 사진 멈추기', fr: 'Mettre les photos en pause' },
  'aria.track': { en: 'Real places in Phitsanulok', zh: '彭世洛真实景点', ja: 'ピッサヌロークの実在スポット', ko: '핏사눌록의 실제 장소', fr: 'Lieux réels de Phitsanulok' },
  'place.chinnarat': { en: 'Phra Buddha Chinnarat', zh: '成功佛', ja: 'プラ・プッタチンナラート', ko: '프라 붓다 친나랏', fr: 'Phra Buddha Chinnarat' },
  'place.watyai': { en: 'Wat Yai', zh: '大寺', ja: 'ワット・ヤイ', ko: '왓 야이', fr: 'Wat Yai' },
  'place.naresuan': { en: 'King Naresuan Shrine', zh: '纳黎萱大帝神殿', ja: 'ナレースワン大王の祠', ko: '나레쑤언 대왕 사당', fr: 'Sanctuaire du roi Naresuan' },
  'place.nangphaya': { en: 'Wat Nang Phaya', zh: '南帕亚寺', ja: 'ワット・ナンパヤー', ko: '왓 낭파야', fr: 'Wat Nang Phaya' },
  'place.ratchaburana': { en: 'Wat Ratchaburana', zh: '拉差布拉那寺', ja: 'ワット・ラーチャブラナ', ko: '왓 랏차부라나', fr: 'Wat Ratchaburana' },
  'place.pillar': { en: 'City Pillar Shrine', zh: '城隍庙', ja: '市の柱祠', ko: '시티 필라 사당', fr: 'Pilier de la ville' },

  // live numbers
  'aria.stats': { en: 'Numbers from the system', zh: '系统数据', ja: 'システムの数値', ko: '시스템 수치', fr: 'Chiffres du système' },
  'stat.places': { en: 'Places on the map', zh: '地图上的地点', ja: '地図上のスポット', ko: '지도 위 장소', fr: 'Lieux sur la carte' },
  'stat.partners': { en: 'Verified partners', zh: '已认证商家', ja: '確認済みの店舗', ko: '인증된 업체', fr: 'Partenaires vérifiés' },
  'stat.vip': { en: 'VIP Passes sold', zh: '已售 VIP 通行证', ja: '販売済みVIPパス', ko: '판매된 VIP 패스', fr: 'Pass VIP vendus' },
  'stat.orders': { en: 'Orders', zh: '订单', ja: '注文', ko: '주문', fr: 'Commandes' },
  'stat.demo': { en: 'Demo data', zh: '演示数据', ja: 'デモデータ', ko: '데모 데이터', fr: 'Données de démo' },
  'stat.note': {
    en: 'Starting sales and orders are demo data for testing.',
    zh: '初始销售额与订单为测试用的演示数据。',
    ja: '初期の売上と注文はテスト用のデモデータです。',
    ko: '초기 매출과 주문은 테스트용 데모 데이터입니다.',
    fr: 'Les ventes et commandes de départ sont des données de démonstration.'
  },

  // three modes
  'aud.eyebrow': { en: 'Built for 3 kinds of users', zh: '为三类用户打造', ja: '3種類の利用者のために', ko: '세 가지 사용자를 위해', fr: 'Pensé pour 3 types d’utilisateurs' },
  'aud.title': { en: 'Pick the mode that fits you', zh: '选择适合你的模式', ja: 'あなたに合うモードを選ぶ', ko: '나에게 맞는 모드 선택', fr: 'Choisissez votre mode' },
  'aud.lead': {
    en: 'Separate screens and tools for travelers, local businesses and the platform team.',
    zh: '为游客、当地商家和平台团队分别设计界面与工具。',
    ja: '旅行者、地元のお店、運営チームそれぞれに専用の画面とツール。',
    ko: '여행자, 지역 업체, 플랫폼 운영팀을 위한 전용 화면과 도구.',
    fr: 'Des écrans et outils dédiés aux voyageurs, aux commerces locaux et à l’équipe de la plateforme.'
  },
  'aud.t1': { en: '1. Travelers', zh: '1. 游客', ja: '1. 旅行者', ko: '1. 여행자', fr: '1. Voyageurs' },
  'aud.s1': {
    en: 'Explore the 3D map · Hear history in 6 languages · Order allergy-safe food and book a stay',
    zh: '探索 3D 地图 · 用 6 种语言聆听历史 · 避开过敏原点餐并预订住宿',
    ja: '3D地図を探索 · 6言語で歴史を聞く · アレルギーに配慮した注文と宿の予約',
    ko: '3D 지도 탐색 · 6개 언어로 역사 듣기 · 알레르기 걱정 없는 주문과 숙소 예약',
    fr: 'Explorez la carte 3D · Écoutez l’histoire en 6 langues · Commandez sans allergènes et réservez'
  },
  'aud.b1': { en: 'Open traveler mode', zh: '进入游客模式', ja: '旅行者モードへ', ko: '여행자 모드 열기', fr: 'Mode voyageur' },
  'aud.t2': { en: '2. Restaurants & hotels', zh: '2. 餐厅与酒店', ja: '2. 飲食店・ホテル', ko: '2. 식당·호텔', fr: '2. Restaurants et hôtels' },
  'aud.s2': {
    en: 'Large-print orders with allergy alerts · Check your map pin · Mark a dish sold out in one tap',
    zh: '大字订单附过敏提醒 · 查看店铺地图位置 · 一键标记售罄',
    ja: '大きな文字の注文票とアレルギー警告 · 地図のピンを確認 · ワンタップで売り切れ設定',
    ko: '큰 글씨 주문서와 알레르기 경고 · 지도 위치 확인 · 한 번에 품절 설정',
    fr: 'Commandes en gros caractères avec alertes allergènes · Vérifiez votre position · Plat épuisé en un geste'
  },
  'aud.b2': { en: 'Open business mode', zh: '进入商家模式', ja: '店舗モードへ', ko: '업체 모드 열기', fr: 'Mode commerçant' },
  'aud.t3': { en: '3. Platform team', zh: '3. 平台团队', ja: '3. 運営チーム', ko: '3. 플랫폼 운영팀', fr: '3. Équipe de la plateforme' },
  'aud.s3': {
    en: 'Track 4 revenue streams (demo data) · Review all 13 partners · Automatic break-even calculator',
    zh: '追踪 4 种收入（演示数据）· 查看全部 13 个合作点 · 自动计算盈亏平衡点',
    ja: '4つの収益源を確認（デモデータ）· 13か所のパートナーを確認 · 損益分岐点を自動計算',
    ko: '4가지 수익원 확인(데모 데이터) · 13곳 파트너 확인 · 손익분기점 자동 계산',
    fr: 'Suivi des 4 sources de revenus (démo) · Les 13 partenaires · Seuil de rentabilité automatique'
  },
  'aud.b3': { en: 'Open admin mode', zh: '进入管理模式', ja: '運営モードへ', ko: '운영 모드 열기', fr: 'Mode administration' },

  // business model
  'biz.eyebrow': { en: 'Make Me Money · 4 revenue streams', zh: 'Make Me Money · 4 种收入模式', ja: 'Make Me Money · 4つの収益モデル', ko: 'Make Me Money · 4가지 수익 모델', fr: 'Make Me Money · 4 sources de revenus' },
  'biz.title': { en: '4 revenue streams that scale nationwide', zh: '可推广至全国的 4 种收入来源', ja: '全国に広げられる4つの収益源', ko: '전국으로 확장 가능한 4가지 수익원', fr: '4 sources de revenus déployables dans tout le pays' },
  'biz.lead': {
    en: 'Monthly subscriptions (B2B SaaS) combined with income that grows with visitors (B2C and transaction fees).',
    zh: '月度订阅收入（B2B SaaS）结合随游客增长的收入（B2C 与交易手续费）。',
    ja: '月額のサブスクリプション（B2B SaaS）と、観光客の増加に応じた収入（B2Cと取引手数料）の組み合わせ。',
    ko: '월 구독 수익(B2B SaaS)과 방문객에 따라 늘어나는 수익(B2C·거래 수수료)의 결합.',
    fr: 'Des abonnements mensuels (B2B SaaS) associés à des revenus qui suivent la fréquentation (B2C et frais de transaction).'
  },
  'biz.target': { en: 'For', zh: '目标客户', ja: '対象', ko: '대상', fr: 'Pour' },
  'biz.benefits': { en: 'Includes', zh: '权益', ja: '特典', ko: '혜택', fr: 'Inclus' },
  'biz.rate': { en: 'Rate', zh: '费率', ja: '料率', ko: '수수료율', fr: 'Taux' },
  'biz.highlight': { en: 'Highlight', zh: '亮点', ja: 'ポイント', ko: '특징', fr: 'Atout' },
  'biz.c1.t': { en: '1. Restaurant SaaS', zh: '1. 餐厅 SaaS', ja: '1. 飲食店向けSaaS', ko: '1. 식당 SaaS', fr: '1. SaaS restaurants' },
  'biz.c1.unit': { en: '/ shop / month', zh: '/ 店 / 月', ja: '/ 店舗 / 月', ko: '/ 매장 / 월', fr: '/ commerce / mois' },
  'biz.c1.dd1': { en: 'Restaurants and OTOP souvenir shops', zh: '餐厅与 OTOP 特产店', ja: '飲食店とOTOP土産店', ko: '식당과 OTOP 기념품점', fr: 'Restaurants et boutiques OTOP' },
  'biz.c1.dd2': { en: '3D map pin, menu in 6 languages, order screen', zh: '3D 地图标注、6 种语言菜单、接单屏幕', ja: '3Dピン、6言語メニュー、注文受付画面', ko: '3D 지도 핀, 6개 언어 메뉴, 주문 화면', fr: 'Repère 3D, menu en 6 langues, écran de commandes' },
  'biz.c2.t': { en: '2. Hotel SaaS', zh: '2. 酒店 SaaS', ja: '2. ホテル向けSaaS', ko: '2. 호텔 SaaS', fr: '2. SaaS hôtels' },
  'biz.c2.unit': { en: '/ hotel / month', zh: '/ 酒店 / 月', ja: '/ ホテル / 月', ko: '/ 호텔 / 월', fr: '/ hôtel / mois' },
  'biz.c2.dd1': { en: 'Boutique hotels and hotels in Phitsanulok', zh: '彭世洛的精品酒店与酒店', ja: 'ピッサヌロークのブティックホテルとホテル', ko: '핏사눌록의 부티크 호텔과 호텔', fr: 'Hôtels de charme et hôtels de Phitsanulok' },
  'biz.c2.dd2': { en: '3D hotel model, room booking in 6 languages', zh: '3D 酒店模型、6 种语言订房', ja: '3Dホテルモデル、6言語の客室予約', ko: '3D 호텔 모델, 6개 언어 객실 예약', fr: 'Modèle 3D de l’hôtel, réservation en 6 langues' },
  'biz.c3.unit': { en: '/ trip (7 days)', zh: '/ 行程（7 天）', ja: '/ 旅行（7日間）', ko: '/ 여행 (7일)', fr: '/ séjour (7 jours)' },
  'biz.c3.dd1': { en: 'Thai and international travelers', zh: '泰国及外国游客', ja: 'タイ人・外国人旅行者', ko: '태국인 및 외국인 여행자', fr: 'Voyageurs thaïlandais et étrangers' },
  'biz.c3.dd2': { en: 'Full audio guide in 6 languages + ฿500 in vouchers', zh: '6 种语言完整语音导览 + 500 泰铢优惠券', ja: '6言語の完全版音声ガイド＋500バーツ分のクーポン', ko: '6개 언어 전체 음성 가이드 + 500바트 쿠폰', fr: 'Audioguide complet en 6 langues + 500 ฿ de bons' },
  'biz.c4.t': { en: '4. Transaction fee', zh: '4. 交易手续费', ja: '4. 取引手数料', ko: '4. 거래 수수료', fr: '4. Frais de transaction' },
  'biz.c4.unit': { en: '/ order', zh: '/ 笔', ja: '/ 件', ko: '/ 건', fr: '/ transaction' },
  'biz.c4.dd1': { en: 'Food orders 3% · Hotel bookings 5%', zh: '点餐 3% · 订房 5%', ja: '料理の注文 3% · ホテル予約 5%', ko: '음식 주문 3% · 호텔 예약 5%', fr: 'Repas 3 % · Hôtels 5 %' },
  'biz.c4.dd2': { en: 'Paid with the Thai QR PromptPay standard', zh: '采用泰国 QR PromptPay 标准支付', ja: 'タイのQR PromptPay規格で支払い', ko: '태국 QR PromptPay 표준 결제', fr: 'Paiement au standard Thai QR PromptPay' },

  // judges
  'j.eyebrow': { en: 'For the judges', zh: '评审专用', ja: '審査員の方へ', ko: '심사위원용', fr: 'Pour le jury' },
  'j.title': { en: 'Try every feature in 3 minutes', zh: '3 分钟体验全部功能', ja: '3分ですべての機能を試す', ko: '3분 만에 모든 기능 체험', fr: 'Toutes les fonctions en 3 minutes' },
  'j.lead': {
    en: 'Three separate role views, large merchant buttons (≥ 48px), a Three.js real-coordinate 3D map and live transactions saved to a SQLite database.',
    zh: '三种角色界面完全分离、商家端大按钮（≥ 48px）、基于真实坐标的 Three.js 3D 地图，交易实时写入 SQLite 数据库。',
    ja: '3つの役割画面を分離、店舗向けの大きなボタン（48px以上）、実座標のThree.js 3Dマップ、取引はSQLiteにリアルタイム保存。',
    ko: '세 가지 역할 화면 분리, 큰 업체용 버튼(48px 이상), 실제 좌표 기반 Three.js 3D 지도, 거래는 SQLite에 실시간 저장.',
    fr: 'Trois vues de rôle séparées, de grands boutons côté commerçant (≥ 48 px), une carte 3D Three.js aux coordonnées réelles et des transactions enregistrées en direct dans SQLite.'
  },
  'j.open': { en: 'Open the app', zh: '打开应用', ja: 'アプリを開く', ko: '앱 열기', fr: 'Ouvrir l’application' },
  'j.s1': {
    en: '<b>Travelers:</b> switch the 3D map layers (heritage, restaurants, hotels) and open real locations on Google Maps',
    zh: '<b>游客：</b>切换 3D 地图图层（古迹、餐厅、酒店），并在 Google 地图上查看真实位置',
    ja: '<b>旅行者：</b>3D地図のカテゴリ（史跡・飲食店・ホテル）を切り替え、Google マップで実際の場所を開く',
    ko: '<b>여행자:</b> 3D 지도 분류(유적·식당·호텔)를 바꾸고 Google 지도에서 실제 위치 열기',
    fr: '<b>Voyageurs :</b> changez les couches de la carte 3D (patrimoine, restaurants, hôtels) et ouvrez les lieux réels dans Google Maps'
  },
  'j.b1': { en: '3D map', zh: '3D 地图', ja: '3Dマップ', ko: '3D 지도', fr: 'Carte 3D' },
  'j.s2': {
    en: '<b>Audio guide in 6 languages:</b> choose a heritage site, switch TH/EN/CN/JP/KR/FR, then press play',
    zh: '<b>6 种语言语音导览：</b>选择古迹，切换 TH/EN/CN/JP/KR/FR 后点击播放',
    ja: '<b>6言語の音声ガイド：</b>史跡を選び、TH/EN/CN/JP/KR/FRを切り替えて再生',
    ko: '<b>6개 언어 음성 가이드:</b> 유적을 고르고 TH/EN/CN/JP/KR/FR을 바꾼 뒤 재생',
    fr: '<b>Audioguide en 6 langues :</b> choisissez un site, changez TH/EN/CN/JP/KR/FR puis lancez la lecture'
  },
  'j.b2': { en: 'Audio guide', zh: '语音导览', ja: '音声ガイド', ko: '음성 가이드', fr: 'Audioguide' },
  'j.s3': {
    en: '<b>Food order and allergy filter:</b> open the Hoi Kha noodle menu, filter “no peanuts” and pay with QR PromptPay',
    zh: '<b>点餐与过敏筛选：</b>打开垂腿船面菜单，筛选“不含花生”，并用 QR PromptPay 支付',
    ja: '<b>注文とアレルギー絞り込み：</b>ホイカー麺のメニューで「ピーナッツなし」を選び、QR PromptPayで支払い',
    ko: '<b>주문과 알레르기 필터:</b> 호이카 국수 메뉴에서 “땅콩 없음”을 고르고 QR PromptPay로 결제',
    fr: '<b>Commande et filtre allergènes :</b> ouvrez le menu Hoi Kha, filtrez « sans arachides » et payez par QR PromptPay'
  },
  'j.b3': { en: 'Order food', zh: '点餐', ja: '注文する', ko: '주문하기', fr: 'Commander' },
  'j.s4': {
    en: '<b>Shop owners:</b> read the large-print ticket with its red peanut alert, press “Accept order”, check the shop location and mark a dish sold out',
    zh: '<b>店主：</b>查看带红色花生提醒的大字订单，点击“接单”，核对店铺位置并标记售罄',
    ja: '<b>店主：</b>赤いピーナッツ警告付きの大きな注文票を確認し「受注」を押し、店舗の位置を確認して売り切れを設定',
    ko: '<b>업주:</b> 빨간 땅콩 경고가 있는 큰 글씨 주문서를 보고 “주문 접수”를 누른 뒤 매장 위치 확인, 품절 설정',
    fr: '<b>Commerçants :</b> lisez le ticket en gros caractères avec l’alerte arachides, appuyez sur « Accepter », vérifiez l’emplacement et marquez un plat épuisé'
  },
  'j.b4': { en: 'Business mode', zh: '商家模式', ja: '店舗モード', ko: '업체 모드', fr: 'Mode commerçant' },
  'j.s5': {
    en: '<b>Platform team:</b> view the 4 revenue streams, the table of all 13 partners and adjust the break-even calculator',
    zh: '<b>平台团队：</b>查看 4 种收入、全部 13 个合作点的表格，并调整盈亏平衡计算器',
    ja: '<b>運営チーム：</b>4つの収益、13か所のパートナー表を確認し、損益分岐計算を調整',
    ko: '<b>플랫폼 운영팀:</b> 4가지 수익과 13곳 파트너 표를 보고 손익분기 계산기를 조정',
    fr: '<b>Équipe plateforme :</b> consultez les 4 revenus, le tableau des 13 partenaires et ajustez le calcul du seuil de rentabilité'
  },
  'j.b5': { en: 'Admin mode', zh: '管理模式', ja: '運営モード', ko: '운영 모드', fr: 'Mode administration' },

  // footer & scroll cue
  'f.about': {
    en: 'A 3D heritage travel platform for Phitsanulok, built on real GPS coordinates and Fine Arts Department sources.',
    zh: '彭世洛 3D 历史文化旅游平台，基于真实 GPS 坐标与泰国艺术厅资料。',
    ja: '実際のGPS座標とタイ芸術局の資料にもとづく、ピッサヌロークの3D歴史観光プラットフォーム。',
    ko: '실제 GPS 좌표와 태국 예술청 자료를 바탕으로 한 핏사눌록 3D 역사 관광 플랫폼.',
    fr: 'Une plateforme de tourisme patrimonial en 3D pour Phitsanulok, fondée sur de vraies coordonnées GPS et les sources du Département des Beaux-Arts.'
  },
  'f.h1': { en: 'Pages', zh: '页面', ja: 'ページ', ko: '페이지', fr: 'Pages' },
  'f.l1': { en: '01 Home', zh: '01 首页', ja: '01 ホーム', ko: '01 홈', fr: '01 Accueil' },
  'f.l2': { en: '02 App', zh: '02 应用', ja: '02 アプリ', ko: '02 앱', fr: '02 Application' },
  'f.l3': { en: '03 Credits', zh: '03 致谢', ja: '03 クレジット', ko: '03 크레딧', fr: '03 Crédits' },
  'f.h2': { en: '3 user roles', zh: '3 种用户角色', ja: '3つの利用者', ko: '3가지 사용자 역할', fr: '3 rôles' },
  'f.l4': { en: 'Travelers', zh: '游客', ja: '旅行者', ko: '여행자', fr: 'Voyageurs' },
  'f.l5': { en: 'Restaurants / hotels', zh: '餐厅 / 酒店', ja: '飲食店 / ホテル', ko: '식당 / 호텔', fr: 'Restaurants / hôtels' },
  'f.l6': { en: 'Platform team', zh: '平台团队', ja: '運営チーム', ko: '플랫폼 운영팀', fr: 'Équipe plateforme' },
  'f.h3': { en: 'References', zh: '参考资料', ja: '参考情報', ko: '참고 자료', fr: 'Références' },
  'f.l7': { en: 'Fine Arts Department sources', zh: '泰国艺术厅资料', ja: 'タイ芸術局の資料', ko: '태국 예술청 자료', fr: 'Sources du Département des Beaux-Arts' },
  'f.l8': { en: 'Open-source technology', zh: '开源技术', ja: 'オープンソース技術', ko: '오픈소스 기술', fr: 'Technologies open source' },
  'f.l9': { en: 'Disclaimer', zh: '免责声明', ja: '免責事項', ko: '면책 조항', fr: 'Avertissement' },
  'f.copy': {
    en: '© 2026 PHITLOK NEXUS · Software for Business &amp; Tourism (“Make Me Money”) competition entry',
    zh: '© 2026 PHITLOK NEXUS · Software for Business &amp; Tourism（“Make Me Money”）参赛作品',
    ja: '© 2026 PHITLOK NEXUS · Software for Business &amp; Tourism（「Make Me Money」）出品作品',
    ko: '© 2026 PHITLOK NEXUS · Software for Business &amp; Tourism (“Make Me Money”) 출품작',
    fr: '© 2026 PHITLOK NEXUS · Projet du concours Software for Business &amp; Tourism (« Make Me Money »)'
  },
  cue: { en: 'Scroll for the business model and how to try it ↓', zh: '向下滚动查看商业模式与试用方法 ↓', ja: '下へスクロールしてビジネスモデルと試し方を見る ↓', ko: '아래로 스크롤해 수익 모델과 사용 방법 보기 ↓', fr: 'Faites défiler pour le modèle économique et l’essai ↓' }
};

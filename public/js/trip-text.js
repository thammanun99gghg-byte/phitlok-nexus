// Shared v3 copy; kept independent of application state for home/app/credits.
const LANGS = ['th','en','zh','ja','ko','fr'];
const TEXT = {
  headline: ['เที่ยวพิษณุโลกไม่พัง! ไม่ต้องยืนรอคิวตากแดด ล็อกโต๊ะร้านดังล่วงหน้า & กู้ชีพทริปแบบ Real-Time','Save your Phitsanulok trip: reserve a table and change plans as conditions change','畅游彭世洛：提前锁桌，随时调整行程','ピッサヌロークの旅を救う。事前に席を確保、状況に合わせて予定変更','핏사눌록 여행을 지키세요. 테이블 예약과 실시간 일정 변경','Sauvez votre séjour à Phitsanulok : réservez une table et adaptez votre parcours'],
  lead: ['วิหารปิดหรือที่จอดเต็ม ร้านคิวยาว ฝนตกหรือแดดแรง? เลือกแผนใหม่บนแผนที่ 3 มิติ ล็อกโต๊ะล่วงหน้า และส่งข้อจำกัดอาหารให้ครัวรับทราบใน 6 ภาษา','Closed temple, full parking, long queues or sudden rain? Find another stop, reserve a table and send dietary needs to the kitchen in 6 languages.','寺庙关闭、停车位已满、排队或突然下雨？更换目的地、预约桌位，用6种语言向厨房传达饮食要求。','寺院の閉鎖、満車、行列、急な雨。次の目的地や席を探し、6言語で食事の制限を厨房へ。','사원 폐쇄, 만차, 긴 줄, 갑작스러운 비. 새 목적지와 테이블을 찾고 식이 제한을 6개 언어로 전달하세요.','Temple fermé, parking complet, file ou pluie ? Changez d’étape, réservez et transmettez vos besoins alimentaires en 6 langues.'],
  demo: ['สถานการณ์สาธิต · ไม่ใช่สถานะจริงของสถานที่','Demo scenario · not actual conditions','演示情景 · 非真实现场状态','デモ状況・実際の現地情報ではありません','시연 상황 · 실제 현장 정보 아님','Scénario de démo · pas les conditions réelles'],
  rescueTitle: ['เจอปัญหาหน้างาน? กดกู้ชีพทริป','Plans changed? Rescue your trip','行程有变？一键调整','予定が変わったら、旅を立て直す','계획이 바뀌었나요? 여행 구하기','Un imprévu ? Adaptez votre séjour'],
  weather: ['🔥 แดดร้อน / 🌧️ ฝนตก — หาที่ร่มใกล้ฉัน','🔥 Heat / 🌧️ rain — find indoor places','🔥 炎热 / 🌧️ 下雨 — 找室内场所','🔥 猛暑 / 🌧️ 雨 — 屋内の場所へ','🔥 더위 / 🌧️ 비 — 실내 찾기','🔥 Chaleur / 🌧️ pluie — trouver un abri'],
  hunger: ['🍜 หิว รอไม่ไหว — หาร้าน 0 คิว','🍜 Hungry? Find a place with no queue','🍜 饿了？找无需排队的店','🍜 お腹がすいたら行列のない店へ','🍜 배고파요 — 대기 없는 식당','🍜 Faim ? Trouver un restaurant sans file'],
  parking: ['🚗 ที่จอดเต็ม / วิหารปิด — สลับแผน','🚗 Full parking / closed temple — replan','🚗 停车位满 / 寺庙关闭 — 换计划','🚗 満車 / 寺院閉鎖 — 予定変更','🚗 만차 / 사원 폐쇄 — 일정 변경','🚗 Parking complet / temple fermé — autre étape'],
  location: ['ใช้ตำแหน่งของฉัน','Use my location','使用我的位置','現在地を使う','내 위치 사용','Utiliser ma position'],
  locationDefault: ['ยังไม่ใช้ GPS · อ้างอิงจากวัดใหญ่','No GPS · starting from Wat Yai','未使用GPS · 以大寺为起点','GPS未使用・ワット・ヤイを起点','GPS 미사용 · 왓 야이 출발 기준','Sans GPS · départ de Wat Yai'],
  locationDevice: ['อ้างอิงตำแหน่งจากอุปกรณ์','Using device location','使用设备位置','端末の現在地を使用','기기 위치 기준','Position de l’appareil'],
  locationDenied: ['ใช้ตำแหน่งไม่ได้ ใช้วัดใหญ่เป็นจุดอ้างอิงแทน','Location unavailable; using Wat Yai as the starting point','无法获取位置，以大寺为起点','現在地を取得できないためワット・ヤイを起点にします','위치를 얻을 수 없어 왓 야이를 기준으로 합니다','Position indisponible : départ de Wat Yai'],
  estimate: ['ระยะเส้นตรง {m} ม. · เดินประมาณ {n} นาที ไม่ใช่เส้นทางนำทาง','{m} m straight-line · about {n} min walking, not a routed estimate','直线距离{m}米 · 步行约{n}分钟，非导航路线','直線距離{m}m・徒歩目安{n}分（経路計算ではありません）','직선 {m}m · 도보 약 {n}분, 경로 안내 아님','{m} m à vol d’oiseau · environ {n} min à pied, sans calcul d’itinéraire'],
  loading: ['กำลังตรวจสถานะ…','Checking conditions…','查询状态…','状況を確認中…','상태 확인 중…','Vérification…'],
  noResult: ['ยังไม่มีสถานที่พร้อมตามเงื่อนไข ให้ผู้ดูแลอัปเดตสถานะสาธิตแล้วลองใหม่','No current match. Ask the demo operator to update conditions, then retry.','暂无符合条件的地点，请更新演示状态后重试。','条件に合う場所がありません。デモ担当者が更新後に再試行してください。','조건에 맞는 장소가 없습니다. 시연 상태를 갱신한 뒤 다시 시도하세요.','Aucun lieu disponible. Faites actualiser les conditions de démo puis réessayez.'],
  error: ['ทำรายการไม่ได้ กรุณารีเฟรชสถานะแล้วลองใหม่','Could not complete this action. Refresh and try again.','操作失败，请刷新后重试。','実行できませんでした。更新して再試行してください。','실행하지 못했습니다. 새로 고침 후 다시 시도하세요.','Action impossible. Actualisez et réessayez.'],
  refresh: ['อัปเดตสถานะ','Refresh','刷新','更新','새로 고침','Actualiser'],
  open: ['เปิด','Open','开放','営業中','운영 중','Ouvert'], busy: ['คิวเต็ม','Busy','繁忙','混雑','혼잡','Complet'], closed: ['ปิดชั่วคราว','Temporarily closed','暂时关闭','一時休業','일시 폐쇄','Fermé temporairement'],
  stale: ['ข้อมูลเก่า · โปรดให้ผู้ดูแลอัปเดต','Outdated · operator update needed','信息过期 · 请更新','古い情報・担当者の更新が必要','오래된 정보 · 갱신 필요','Données anciennes · mise à jour requise'],
  queue: ['{q} คิว · รอประมาณ {n} นาที','{q} parties · about {n} min wait','{q}组等待 · 约{n}分钟','{q}組待ち・約{n}分','{q}팀 대기 · 약 {n}분','{q} groupes · environ {n} min'],
  tables: ['โต๊ะจองล่วงหน้าว่าง {n} โต๊ะ','{n} reservable tables available','可预约桌位{n}桌','予約可能な席：{n}卓','예약 가능 테이블 {n}개','{n} tables réservables disponibles'],
  seats: ['ที่นั่งในร่ม {n} ที่ (สาธิต)','{n} indoor seats (demo)','室内座位{n}个（演示）','屋内席{n}席（デモ）','실내 좌석 {n}개 (시연)','{n} places à l’intérieur (démo)'],
  parkingFree: ['ที่จอดว่าง {n} คัน (สาธิต)','{n} parking spaces (demo)','空车位{n}个（演示）','駐車空き{n}台（デモ）','주차 여유 {n}대 (시연)','{n} places de parking (démo)'],
  parkingUnknown: ['ยังไม่มีข้อมูลที่จอดรถ','Parking availability unknown','暂无停车信息','駐車情報なし','주차 정보 없음','Disponibilité du parking inconnue'],
  updated: ['อัปเดต {time}','Updated {time}','更新于{time}','更新 {time}','갱신 {time}','Mis à jour {time}'],
  reserve: ['⚡ ล็อกโต๊ะ VIP & สั่งล่วงหน้า','⚡ VIP table lock & preorder','⚡ VIP锁桌并预点餐','⚡ VIP席確保・事前注文','⚡ VIP 테이블 예약 · 미리 주문','⚡ Bloquer une table VIP et commander'],
  vipCta: ['👑 VIP ข้ามคิว 99฿','👑 VIP table pass ฿99','👑 VIP预约通行证 ฿99','👑 VIP席予約 99฿','👑 VIP 예약 패스 ฿99','👑 Pass table VIP 99 ฿'],
  comparison: ['ทำไมต้อง PHITLOK NEXUS?','Why PHITLOK NEXUS?','为什么选择PHITLOK NEXUS？','PHITLOK NEXUSを選ぶ理由','왜 PHITLOK NEXUS인가요?','Pourquoi PHITLOK NEXUS ?'],
  compareMap: ['Google Maps / แผนที่ทั่วไป','Google Maps / general maps','Google Maps / 通用地图','Google Maps / 一般の地図','Google Maps / 일반 지도','Google Maps / cartes généralistes'],
  compareRoute: ['ค้นหาเส้นทาง สถานที่ และเวลารอในบางแห่ง','Directions, places and wait estimates at some venues','路线、地点和部分地点的等待预估','経路、場所、一部施設の待ち時間目安','경로, 장소 및 일부 장소의 대기 예상','Itinéraires, lieux et attente estimée dans certains établissements'],
  compareUs: ['สถานะที่ร้านกรอก → ล็อกโต๊ะ → สั่งล่วงหน้า → ครัวรับทราบข้อจำกัดอาหาร','Operator updates → table lock → preorder → kitchen acknowledgement','商家更新 → 锁桌 → 预点餐 → 厨房确认饮食要求','店舗の更新 → 席確保 → 事前注文 → 厨房が制限を確認','매장 갱신 → 테이블 예약 → 미리 주문 → 주방 요청 확인','Mise à jour du commerce → réservation → commande → confirmation des besoins'],
  compareNote: ['ระบบเชื่อมร้านของเราอยู่ในโหมดสาธิต ความพร้อมจริงต้องยืนยันกับพาร์ทเนอร์','Our connected workflow is a demo. Real availability requires partner confirmation.','本系统为演示，实际可用情况需商家确认。','連携機能はデモです。実際の空きは提携先の確認が必要です。','매장 연동은 시연입니다. 실제 이용 가능 여부는 파트너 확인이 필요합니다.','Notre parcours connecté est une démo. La disponibilité réelle doit être confirmée par les partenaires.'],
  vipCompare: ['ฟรี: รอคิวหน้าร้านตามสถานะที่แจ้ง · VIP 99฿: ใช้โควตาโต๊ะจองล่วงหน้า 15 นาที เมื่อมีโต๊ะว่าง + คูปองตามเงื่อนไข','Free: join the walk-in queue · VIP ฿99: hold an available reservation table for 15 minutes + conditional vouchers','免费：现场排队 · VIP ฿99：有空位时锁桌15分钟，并获有条件优惠券','無料：当日順番待ち・VIP 99฿：空き予約席を15分確保＋条件付きクーポン','무료: 현장 대기 · VIP ฿99: 빈 예약석 15분 확보 + 조건부 쿠폰','Gratuit : file sur place · VIP 99 ฿ : bloquer une table disponible 15 min + bons sous conditions'],
  vipPerk: ['ล็อกโต๊ะล่วงหน้า ไม่ต้องยืนเข้าคิวหน้าร้าน','Reserve a table instead of waiting in the walk-in line','提前锁桌，无需现场排队','店頭の行列に並ばず事前に席を確保','현장 줄 대신 미리 테이블 예약','Réservez au lieu d’attendre dans la file'],
  vipTerms: ['เฉพาะโควตาโต๊ะจองที่ว่าง ไม่รับประกันอาหารพร้อมทันที · ระบบสาธิต','Subject to reservation capacity; food may still take time · demo','限可预约空桌；出餐仍需时间 · 演示','予約枠に空きがある場合のみ。料理には時間がかかります・デモ','빈 예약석 한정, 음식 준비 시간은 별도 · 시연','Selon les tables disponibles ; préparation des plats non instantanée · démo'],
  myTrip: ['บัตรคิวและสถานะครัวของฉัน','My table passes and kitchen updates','我的预约与厨房状态','予約パスと厨房の状況','내 예약 패스와 주방 상태','Mes réservations et nouvelles de la cuisine'],
  emptyTrip: ['ยังไม่มีบัตรคิวหรือออเดอร์ของคุณ','No table passes or orders yet','暂无预约或订单','予約・注文はまだありません','예약이나 주문이 아직 없습니다','Aucune réservation ou commande'],
  pass: ['{pass} · โต๊ะ {n}','{pass} · table {n}','{pass} · {n}号桌','{pass}・テーブル{n}','{pass} · 테이블 {n}','{pass} · table {n}'],
  held: ['ล็อกโต๊ะแล้ว','Table held','已锁桌','席を確保','테이블 확보','Table bloquée'], ordered: ['ส่งออเดอร์แล้ว','Order sent','已下单','注文送信済み','주문 전달됨','Commande envoyée'], arrived: ['เช็คอินที่ร้านแล้ว','Checked in','已到店','来店確認済み','매장 도착 확인','Arrivée confirmée'], expired: ['บัตรคิวหมดอายุ','Pass expired','预约已过期','期限切れ','패스 만료','Pass expiré'], cancelled: ['ยกเลิกการล็อกโต๊ะ','Table hold cancelled','锁桌已取消','席確保を取消','테이블 예약 취소됨','Réservation annulée'], completed: ['ใช้โต๊ะเสร็จแล้ว','Visit completed','已完成','利用終了','이용 완료','Visite terminée'],
  remaining: ['เดินทางมาถึงภายใน','Arrive within','请在此时间内到达','到着までの期限','도착 제한 시간','Arrivez sous'],
  cancel: ['ยกเลิกโต๊ะ (ไม่ยกเลิกอาหาร)','Cancel table (food order stays)','取消桌位（保留餐单）','席のみ取消（料理は取消されません）','테이블 취소 (음식 주문 유지)','Annuler la table (commande conservée)'],
  menu: ['เลือกอาหารล่วงหน้า','Preorder food','预点餐','料理を事前注文','음식 미리 주문','Commander à l’avance'],
  map: ['ดูบนแผนที่','Show on map','在地图上查看','地図で見る','지도 보기','Voir sur la carte'],
  directions: ['เปิดเส้นทางจริง','Open directions','查看实际路线','実際の経路を開く','실제 경로 열기','Ouvrir l’itinéraire'],
  pending: ['รอครัวตรวจข้อจำกัดอาหาร','Waiting for kitchen review','等待厨房确认饮食要求','厨房による制限の確認待ち','주방의 식이 제한 검토 대기','En attente de vérification en cuisine'],
  acknowledged: ['🛡️ ครัวรับทราบข้อจำกัดอาหารแล้ว','🛡️ Kitchen acknowledged your dietary needs','🛡️ 厨房已确认饮食要求','🛡️ 厨房が食事の制限を確認しました','🛡️ 주방이 식이 제한을 확인했습니다','🛡️ Besoins alimentaires confirmés par la cuisine'],
  declined: ['ร้านแจ้งว่าทำตามข้อจำกัดไม่ได้ · ติดต่อร้านก่อนรับอาหาร','Kitchen cannot meet your request · contact the shop before eating','厨房无法满足要求 · 用餐前请联系店家','対応不可の連絡・食べる前に店舗へ確認してください','요청 이행 불가 · 먹기 전에 매장에 문의하세요','Demande impossible à satisfaire · contactez le commerce avant de manger'],
  safetyNote: ['การรับทราบไม่ใช่การรับรองว่าปลอดสารก่อภูมิแพ้ ผู้แพ้รุนแรงต้องยืนยันส่วนผสมและการปนเปื้อนข้ามกับร้านก่อนรับประทาน','Acknowledgement is not an allergen-free guarantee. For severe allergies, confirm ingredients and cross-contact precautions with the restaurant before eating.','确认不代表无过敏原保证。严重过敏者用餐前应与店家确认成分及交叉接触防范。','確認はアレルゲン不使用の保証ではありません。重度のアレルギーは食べる前に原材料と交差接触対策を店舗に確認してください。','확인은 무알레르겐 보장이 아닙니다. 중증 알레르기가 있으면 먹기 전에 재료와 교차 접촉 방지 조치를 확인하세요.','Cette confirmation ne garantit pas l’absence d’allergènes. En cas d’allergie sévère, vérifiez les ingrédients et les précautions de contact croisé avant de manger.'],
  orderStatus: ['สถานะออเดอร์: {s}','Order status: {s}','订单状态：{s}','注文状況：{s}','주문 상태: {s}','État de la commande : {s}'],
  new: ['ใหม่','New','新订单','新規','신규','Nouvelle'], preparing: ['กำลังเตรียม','Preparing','准备中','調理中','준비 중','En préparation'], ready: ['พร้อมรับ','Ready','已备好','受取可能','준비 완료','Prête'], done: ['ส่งมอบแล้ว','Completed','已完成','完了','완료','Terminée'],
  cue: ['เลื่อนลงเพื่อใช้ระบบกู้ชีพทริป & จองคิวร้านดัง ↓','Scroll for trip rescue and table reservations ↓','向下查看行程调整与预约 ↓','下へ：旅の立て直しと席予約 ↓','아래로: 여행 구하기와 테이블 예약 ↓','Défilez pour adapter votre séjour et réserver ↓'],
  listed: ['ร้านและที่พักในระบบ (สาธิต)','Listed shops and hotels (demo)','已收录商家与酒店（演示）','掲載店舗・宿泊施設（デモ）','등록 매장·호텔 (시연)','Commerces et hôtels répertoriés (démo)']
};
export function tx(key, vars = {}, lang = document.documentElement.lang || 'th') {
  const row = TEXT[key];
  let value = row?.[LANGS.indexOf(lang)] || row?.[1] || key;
  for (const [k,v] of Object.entries(vars)) value = value.replaceAll(`{${k}}`,String(v));
  return value;
}
export function applyTripCopy(root = document) {
  root.querySelectorAll('[data-trip-text]').forEach((el) => { el.textContent = tx(el.dataset.tripText); });
}

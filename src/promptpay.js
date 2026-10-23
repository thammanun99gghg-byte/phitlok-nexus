'use strict';
/*
 * Thai QR Payment (PromptPay) payload generator — EMVCo Merchant-Presented QR.
 * Spec summary: tag 29 holds the PromptPay AID + target (phone / tax ID / e-wallet),
 * tag 54 the amount, tag 63 a CRC16-CCITT (poly 0x1021, init 0xFFFF) checksum.
 */
const QRCode = require('qrcode');

const PROMPTPAY_AID = 'A000000677010111';

function tlv(tag, value) {
  return tag + String(value.length).padStart(2, '0') + value;
}

function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatTarget(id) {
  const digits = String(id).replace(/\D/g, '');
  if (digits.length >= 15) return { tag: '03', value: digits.slice(0, 15) }; // e-wallet ID
  if (digits.length === 13) return { tag: '02', value: digits }; // national / tax ID
  // Mobile number: drop leading 0, prefix country code, pad to 13 digits.
  const mobile = ('0000000000000' + '66' + digits.replace(/^0/, '')).slice(-13);
  return { tag: '01', value: mobile };
}

function buildPayload(targetId, amountSatang) {
  const target = formatTarget(targetId);
  const merchantInfo = tlv('00', PROMPTPAY_AID) + tlv(target.tag, target.value);
  let payload =
    tlv('00', '01') +
    tlv('01', amountSatang ? '12' : '11') +
    tlv('29', merchantInfo) +
    tlv('53', '764') +
    (amountSatang ? tlv('54', (amountSatang / 100).toFixed(2)) : '') +
    tlv('58', 'TH');
  payload += '6304';
  return payload + crc16(payload);
}

async function buildQr(targetId, amountSatang) {
  const payload = buildPayload(targetId, amountSatang);
  const dataUrl = await QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 2, width: 280 });
  return { payload, dataUrl };
}

function maskTarget(id) {
  const d = String(id).replace(/\D/g, '');
  return d.length <= 4 ? d : 'x'.repeat(d.length - 4) + d.slice(-4);
}

module.exports = { buildPayload, buildQr, crc16, maskTarget };

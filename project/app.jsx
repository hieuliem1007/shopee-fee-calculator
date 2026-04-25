// Shopee Fee Calculator — E-Dream
// Single-screen fintech-style profit calculator

const { useState, useEffect, useMemo, useRef } = React;

// ────────────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────────────
const fmtVND = (n) => {
  const abs = Math.round(Math.abs(n));
  const s = abs.toLocaleString('vi-VN').replace(/,/g, '.');
  return (n < 0 ? '-' : '') + s + 'đ';
};
const fmtNum = (n) => Math.round(n).toLocaleString('vi-VN').replace(/,/g, '.');
const parseNum = (s) => {
  const n = parseInt(String(s).replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? 0 : n;
};
const fmtPct = (n, sign = false) => {
  const v = n.toFixed(2).replace('.', ',');
  return (sign && n > 0 ? '+' : '') + v + '%';
};

// ────────────────────────────────────────────────────────────────
// Icons (inline SVG, Lucide-style 1.75 stroke)
// ────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = 'currentColor', strokeWidth = 1.75 }) => {
  const paths = {
    chevronDown: <polyline points="6 9 12 15 18 9" />,
    chevronRight: <polyline points="9 6 15 12 9 18" />,
    bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></>,
    lightbulb: <><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.4 1 2.3h6c0-.9.3-1.7 1-2.3A7 7 0 0 0 12 2z" /></>,
    sparkle: <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></>,
    arrowUp: <><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></>,
    arrowDown: <><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></>,
    info: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>,
    refresh: <><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></>,
    store: <><path d="M3 9l1-5h16l1 5" /><path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" /><path d="M3 9a3 3 0 0 0 6 0a3 3 0 0 0 6 0a3 3 0 0 0 6 0" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, display: 'block' }}>
      {paths[name]}
    </svg>
  );
};

// ────────────────────────────────────────────────────────────────
// Fee model
// ────────────────────────────────────────────────────────────────
const DEFAULT_FIXED_FEES = [
  { id: 'fixed', name: 'Phí cố định', kind: 'pct', rate: 0.07, on: true, hint: '7% trên doanh thu' },
  { id: 'payment', name: 'Phí thanh toán', kind: 'pct', rate: 0.05, on: true, hint: '5% trên doanh thu' },
  { id: 'freeship', name: 'Freeship Xtra', kind: 'pct', rate: 0.06, on: true, hint: '6% trợ giá vận chuyển' },
  { id: 'content', name: 'Content Xtra', kind: 'pct', rate: 0.03, on: false, hint: '3% gói nội dung' },
  { id: 'voucher_x', name: 'Voucher Xtra', kind: 'pct', rate: 0.03, on: true, hint: '3% chương trình voucher' },
  { id: 'pi_ship', name: 'Pi Ship', kind: 'flat', rate: 2500, on: true, hint: 'Phí Pi Ship / đơn' },
  { id: 'infra', name: 'Hạ tầng', kind: 'flat', rate: 1500, on: true, hint: 'Phí hạ tầng / đơn' },
  { id: 'tax', name: 'Thuế', kind: 'pct', rate: 0.015, on: true, hint: '1.5% thuế TNCN + GTGT' },
];
const DEFAULT_VAR_FEES = [
  { id: 'ads', name: 'Phí quảng cáo', kind: 'pct', rate: 0.05, on: true, hint: '5% ngân sách Ads' },
  { id: 'voucher_shop', name: 'Voucher shop', kind: 'pct', rate: 0.03, on: true, hint: '3% voucher của shop' },
  { id: 'ops', name: 'Vận hành / đơn', kind: 'flat', rate: 4000, on: true, hint: 'Đóng gói + nhân sự' },
  { id: 'aff', name: 'Affiliate', kind: 'pct', rate: 0.05, on: true, hint: '5% hoa hồng CTV' },
  { id: 'other', name: 'Chi phí khác', kind: 'pct', rate: 0.03, on: true, hint: '3% dự phòng' },
];

const CATEGORIES = [
  { id: 'auto', name: 'Ô tô', adj: 0.07 },
  { id: 'fashion', name: 'Thời trang', adj: 0.04 },
  { id: 'electronics', name: 'Điện tử', adj: 0.03 },
  { id: 'beauty', name: 'Mỹ phẩm', adj: 0.04 },
  { id: 'home', name: 'Gia dụng', adj: 0.045 },
  { id: 'food', name: 'Thực phẩm', adj: 0.035 },
];

const computeFee = (fee, revenue) => {
  if (!fee.on) return 0;
  return fee.kind === 'pct' ? revenue * fee.rate : fee.rate;
};

// ────────────────────────────────────────────────────────────────
// Brand — E-Dream logo mark
// ────────────────────────────────────────────────────────────────
const LogoMark = ({ size = 30 }) => (
  <div style={{
    width: size, height: size, borderRadius: 8,
    background: 'linear-gradient(135deg, #F5B81C 0%, #E8A60E 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 1px 0 rgba(255,255,255,.4) inset, 0 2px 6px rgba(245,184,28,.35)',
    flexShrink: 0,
  }}>
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 20 20">
      <path d="M4 3 L16 3 L16 6 L7 6 L7 8.5 L14 8.5 L14 11.5 L7 11.5 L7 14 L16 14 L16 17 L4 17 Z"
        fill="#1A1A1A" />
    </svg>
  </div>
);

Object.assign(window, { fmtVND, fmtNum, parseNum, fmtPct, Icon, LogoMark,
  DEFAULT_FIXED_FEES, DEFAULT_VAR_FEES, CATEGORIES, computeFee });

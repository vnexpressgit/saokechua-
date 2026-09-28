'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  QrCode,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Smartphone,
  ExternalLink,
  Upload,
} from 'lucide-react';

/**
 * Danh sách ngân hàng Việt Nam hỗ trợ deeplink / universal link
 * VietQR format: bank_id + account_number + amount + content
 */
const BANK_DEEPLINKS = {
  // MBBank
  '970422': {
    name: 'MBBank',
    scheme: 'mbmobile://',
    universalLink: 'https://www.mbbank.com.vn/transfer',
    logo: 'MB',
    color: '#0033a0',
  },
  // Vietcombank
  '970436': {
    name: 'Vietcombank',
    scheme: 'vcbdigibank://',
    universalLink: 'https://vcbdigibank.vietcombank.com.vn',
    logo: 'VCB',
    color: '#006b3f',
  },
  // Techcombank
  '970407': {
    name: 'Techcombank',
    scheme: 'tcbmobile://',
    universalLink: 'https://techcombank.com',
    logo: 'TCB',
    color: '#cc0000',
  },
  // TPBank
  '970423': {
    name: 'TPBank',
    scheme: 'tpbiz://',
    universalLink: 'https://tpb.vn',
    logo: 'TPB',
    color: '#0052cc',
  },
  // VPBank
  '970432': {
    name: 'VPBank',
    scheme: 'vpbank://',
    universalLink: 'https://vpbank.com.vn',
    logo: 'VPB',
    color: '#00a651',
  },
  // BIDV
  '970418': {
    name: 'BIDV',
    scheme: 'bidv://',
    universalLink: 'https://bidv.com.vn',
    logo: 'BIDV',
    color: '#004b87',
  },
  // VietinBank
  '970415': {
    name: 'VietinBank',
    scheme: 'viettinbank://',
    universalLink: 'https://viettinbank.vn',
    logo: 'CTG',
    color: '#e60012',
  },
  // Agribank
  '970405': {
    name: 'Agribank',
    scheme: 'agribank://',
    universalLink: 'https://agribank.com.vn',
    logo: 'AGR',
    color: '#cc0000',
  },
  // ACB
  '970416': {
    name: 'ACB',
    scheme: 'acb://',
    universalLink: 'https://acb.com.vn',
    logo: 'ACB',
    color: '#003087',
  },
  // Sacombank
  '970403': {
    name: 'Sacombank',
    scheme: 'sacombank://',
    universalLink: 'https://sacombank.com.vn',
    logo: 'STB',
    color: '#004c97',
  },
};

/**
 * Parse chuỗi VietQR EMVCo (NAPAS QR)
 * Format: 000201...5204...5303704...54<len><amount>...62<len><content>...
 */
function parseVietQR(qrString) {
  const result = {
    bankId: null,
    accountNo: null,
    accountName: null,
    amount: null,
    content: '',
    bank: null,
  };

  try {
    // Amount - field 54
    const amountMatch = qrString.match(/5404(\d{2})(\d+)/);
    if (amountMatch) result.amount = parseInt(amountMatch[2], 10);

    // Alternative amount pattern
    if (!result.amount) {
      const alt = qrString.match(/54(\d{2})(\d[\d.]+)/);
      if (alt) {
        const len = parseInt(alt[1], 10);
        result.amount = parseFloat(alt[2].substring(0, len));
      }
    }

    // Content / Bill number - field 62 sub-field 05
    const contentMatch = qrString.match(/620(\d)(\d{2})(.+?)(?=\d{4}[\dA-Z]|$)/);
    if (contentMatch) {
      const len = parseInt(contentMatch[2], 10);
      result.content = contentMatch[3].substring(0, len) || '';
    }

    // Bank ID từ field 38 hoặc trích từ GUID ngân hàng NAPAS
    const bankIdMatch = qrString.match(/0010A000000727011([A-Z0-9]{6})/);
    if (bankIdMatch) result.bankId = bankIdMatch[1];

    // Tìm account number từ field 01 trong template ngân hàng
    const accMatch = qrString.match(/01(\d{2})(\d{10,14})/);
    if (accMatch) {
      const len = parseInt(accMatch[1], 10);
      result.accountNo = accMatch[2].substring(0, len);
    }

    // Lấy bank từ bankId
    if (result.bankId && BANK_DEEPLINKS[result.bankId]) {
      result.bank = BANK_DEEPLINKS[result.bankId];
    }

    // Fallback: tìm bank name trong QR string
    if (!result.bank) {
      for (const [id, info] of Object.entries(BANK_DEEPLINKS)) {
        if (
          qrString.toLowerCase().includes(info.logo.toLowerCase()) ||
          qrString.toLowerCase().includes(info.name.toLowerCase())
        ) {
          result.bankId = id;
          result.bank = info;
          break;
        }
      }
    }
  } catch (e) {
    console.warn('VietQR parse error:', e);
  }

  return result;
}

/**
 * Tạo deeplink URL để mở app ngân hàng
 * Ưu tiên Universal Link (hoạt động cả web); fallback scheme://
 */
function buildBankDeeplink(bank, accountNo, amount, content) {
  // Universal VietQR redirect - tương thích nhiều app nhất
  const amountStr = amount ? `&amount=${amount}` : '';
  const contentStr = content ? `&addInfo=${encodeURIComponent(content)}` : '';

  // VietQR universal payment link (vietqr.io)
  if (bank && accountNo) {
    const bankKey = Object.keys(BANK_DEEPLINKS).find(
      (k) => BANK_DEEPLINKS[k].name === bank.name
    );
    if (bankKey) {
      return `https://api.vietqr.io/image/${bankKey}-${accountNo}-compact2.jpg?${amountStr ? 'amount=' + amount : ''}${contentStr}`;
    }
  }

  // Generic: mở App Store / CH Play nếu không deeplink được
  return bank?.universalLink || 'https://vietqr.io';
}

/**
 * Component QR Scanner sử dụng html5-qrcode
 */
function QrReader({ onDetected, onError }) {
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  useEffect(() => {
    let scanner;
    const startScan = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        scanner = new Html5Qrcode('qr-reader-element');
        html5QrRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            onDetected(decodedText);
          },
          () => {} // ignore not-found frames
        );
      } catch (err) {
        console.error('QR scanner error:', err);
        onError(err.message || 'Không thể khởi động camera');
      }
    };

    startScan();

    return () => {
      if (html5QrRef.current) {
        html5QrRef.current
          .stop()
          .then(() => html5QrRef.current.clear())
          .catch(() => {});
      }
    };
  }, [onDetected, onError]);

  return (
    <div className="relative overflow-hidden rounded-[8px] border border-[#d6d6d6]">
      <div id="qr-reader-element" className="w-full" />
      {/* Overlay scanning animation */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#b13460] rounded-tl-[4px]" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#b13460] rounded-tr-[4px]" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#b13460] rounded-bl-[4px]" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#b13460] rounded-br-[4px]" />
      </div>
    </div>
  );
}

/**
 * QrScanModal
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   categories: Array<{id, name, color}>
 */
export default function QrScanModal({ isOpen, onClose, categories }) {
  // step: 'scan' | 'parsed' | 'confirm'
  const [step, setStep] = useState('scan');
  const [scanError, setScanError] = useState(null);
  const [qrRaw, setQrRaw] = useState('');
  const [qrData, setQrData] = useState(null);

  // Form sau khi quét
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [content, setContent] = useState('');

  const fileInputRef = useRef(null);

  const formatVND = (n) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

  const reset = useCallback(() => {
    setStep('scan');
    setScanError(null);
    setQrRaw('');
    setQrData(null);
    setAmount('');
    setCategoryId('');
    setContent('');
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDetected = useCallback(
    (raw) => {
      if (qrRaw) return; // debounce
      setQrRaw(raw);
      const parsed = parseVietQR(raw);
      setQrData(parsed);
      if (parsed.amount) setAmount(String(parsed.amount));
      if (parsed.content) setContent(parsed.content);
      setStep('parsed');
    },
    [qrRaw]
  );

  // Quét QR từ file ảnh
  const handleQrFromFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setScanError(null);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-file-dummy');
      const result = await scanner.scanFile(file, false);
      await scanner.clear();
      handleDetected(result);
    } catch (err) {
      setScanError('Không tìm thấy mã QR trong ảnh. Vui lòng thử ảnh khác.');
    }
  };

  // Mở app ngân hàng
  const handleOpenBank = () => {
    if (!amount || isNaN(Number(amount))) {
      setScanError('Vui lòng nhập số tiền trước khi chuyển.');
      return;
    }

    const bank = qrData?.bank;
    const accountNo = qrData?.accountNo;
    const amountNum = Number(amount);

    // Cách 1: Mở VietQR universal link (hoạt động trên web/mobile)
    let url = '';

    if (bank && accountNo) {
      // Deeplink trực tiếp vào app qua universal link
      const bankKey = Object.keys(BANK_DEEPLINKS).find(
        (k) => BANK_DEEPLINKS[k].name === bank.name
      );
      if (bankKey) {
        // Universal payment link VietQR
        url = `https://qr.sepay.vn/img?bank=${bankKey}&acc=${accountNo}&template=compact&amount=${amountNum}&des=${encodeURIComponent(content || '')}`;
      }
    }

    // Fallback: mở bank universal link
    if (!url && bank) {
      url = bank.universalLink;
    }

    // Fallback cuối: VietQR
    if (!url) url = 'https://vietqr.io';

    // Thử mở app bằng scheme trước, fallback web link sau
    const scheme = bank?.scheme;
    if (scheme && /iphone|ipad|android/i.test(navigator.userAgent || '')) {
      // Mobile: thử deep link
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src =
        scheme +
        `transfer?account=${accountNo}&amount=${amountNum}&content=${encodeURIComponent(content || '')}`;
      document.body.appendChild(iframe);
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.location.href = url;
      }, 1200);
    } else {
      window.open(url, '_blank');
    }

    setStep('confirm');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0" onClick={handleClose} />

      <div className="relative w-full max-w-md bg-[#ffffff] rounded-t-[12px] sm:rounded-[8px] border border-[#d6d6d6] z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#d6d6d6] bg-[#fafafa]">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-[#b13460]" />
            <span className="font-ui text-[15px] font-bold text-[#202020]">
              Quét mã QR chuyển khoản
            </span>
          </div>
          <button onClick={handleClose} className="p-1 text-[#7f7f7f] hover:text-[#000000]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar">
          {/* Hidden dummy element for html5-qrcode file scan */}
          <div id="qr-file-dummy" className="hidden" />

          {/* ── STEP: SCAN ── */}
          {step === 'scan' && (
            <>
              {scanError && (
                <div className="p-2.5 bg-[#fce8da] border-l-2 border-[#ee853b] rounded-[4px] flex gap-2 text-[12px]">
                  <AlertCircle className="w-4 h-4 text-[#ee853b] shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}

              <p className="font-sans text-[13px] text-[#5f5f5f]">
                Hướng camera vào mã QR chuyển khoản (VietQR / NAPAS) để quét tự động.
              </p>

              {/* Camera scanner */}
              <QrReader
                onDetected={handleDetected}
                onError={(msg) => setScanError(msg)}
              />

              {/* Quét từ ảnh */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-[6px] border border-[#d6d6d6] bg-[#fafafa] hover:bg-[#f3f3f3] text-[#5f5f5f] font-ui text-[13px]"
              >
                <Upload className="w-4 h-4" />
                Chọn ảnh QR từ thư viện
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleQrFromFile}
              />
            </>
          )}

          {/* ── STEP: PARSED ── */}
          {step === 'parsed' && qrData && (
            <>
              {/* Bank info */}
              {qrData.bank ? (
                <div
                  className="flex items-center gap-3 p-3 rounded-[8px] border border-[#d6d6d6]"
                  style={{ borderLeftColor: qrData.bank.color, borderLeftWidth: 3 }}
                >
                  <div
                    className="w-10 h-10 rounded-[6px] flex items-center justify-center font-ui text-[11px] font-bold text-white shrink-0"
                    style={{ backgroundColor: qrData.bank.color }}
                  >
                    {qrData.bank.logo}
                  </div>
                  <div className="flex-1">
                    <p className="font-ui text-[14px] font-bold text-[#202020]">
                      {qrData.bank.name}
                    </p>
                    {qrData.accountNo && (
                      <p className="font-mono text-[12px] text-[#5f5f5f]">
                        STK: {qrData.accountNo}
                      </p>
                    )}
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-[#24a148]" />
                </div>
              ) : (
                <div className="p-3 bg-[#fce8da] border-l-2 border-[#ee853b] rounded-[4px] text-[12px] text-[#202020]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertCircle className="w-3.5 h-3.5 text-[#ee853b]" />
                    <span className="font-medium">Không nhận diện được ngân hàng</span>
                  </div>
                  <p className="text-[#7f7f7f] text-[11px]">
                    QR có thể không phải VietQR. Bạn vẫn có thể nhập số tiền và mở link.
                  </p>
                </div>
              )}

              {scanError && (
                <div className="p-2 bg-[#f8d4d6] border-l-2 border-[#da1e28] rounded-[4px] text-[11px] text-[#da1e28] flex gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {scanError}
                </div>
              )}

              {/* Số tiền */}
              <div>
                <label className="font-ui text-[12px] font-medium text-[#5f5f5f] mb-1 block">
                  Số tiền cần chuyển (VNĐ) <span className="text-[#da1e28]">*</span>
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="w-full h-12 bg-[#fafafa] border border-[#9f9f9f] rounded-[4px] px-3 font-mono text-[18px] text-[#202020] focus:border-[#0590de] outline-none"
                />
                {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
                  <p className="font-mono text-[12px] text-[#b13460] mt-0.5 font-bold">
                    = {formatVND(Number(amount))}
                  </p>
                )}
              </div>

              {/* Nội dung CK */}
              <div>
                <label className="font-ui text-[12px] font-medium text-[#5f5f5f] mb-1 block">
                  Nội dung chuyển khoản
                </label>
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nội dung (tuỳ chọn)..."
                  className="w-full h-10 bg-[#fafafa] border border-[#9f9f9f] rounded-[4px] px-3 font-sans text-[13px] text-[#202020] focus:border-[#0590de] outline-none"
                />
              </div>

              {/* Danh mục */}
              <div>
                <label className="font-ui text-[12px] font-medium text-[#5f5f5f] mb-1 block">
                  Phân loại chi tiêu
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-10 bg-[#fafafa] border border-[#9f9f9f] rounded-[4px] px-3 font-sans text-[13px] text-[#202020] focus:border-[#0590de] outline-none"
                >
                  <option value="">Chưa phân loại</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hướng dẫn flow */}
              <div className="bg-[#fafafa] border border-[#d6d6d6] rounded-[6px] p-3 space-y-2">
                <p className="font-ui text-[11px] font-bold text-[#5f5f5f] uppercase tracking-wide">
                  Quy trình
                </p>
                {[
                  'Nhập số tiền và danh mục bên trên',
                  'Bấm "Mở app ngân hàng" để chuyển tiền',
                  'Xác nhận giao dịch trong app ngân hàng',
                  'Giao dịch tự động đồng bộ qua SePay webhook',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#b13460] text-white font-ui text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="font-sans text-[12px] text-[#5f5f5f]">{step}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="h-11 px-4 rounded-[8px] bg-[#f3f3f3] hover:bg-[#ececec] border border-[#d6d6d6] text-[#5f5f5f] font-ui text-[13px]"
                >
                  Quét lại
                </button>
                <button
                  onClick={handleOpenBank}
                  className="flex-1 h-11 rounded-[8px] font-ui text-[14px] font-bold text-white flex items-center justify-center gap-2 transition-colors"
                  style={{
                    backgroundColor: qrData.bank?.color || '#b13460',
                  }}
                >
                  <Smartphone className="w-4 h-4" />
                  Mở app {qrData.bank?.name || 'ngân hàng'}
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {/* ── STEP: CONFIRM ── */}
          {step === 'confirm' && (
            <div className="py-8 flex flex-col items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: qrData?.bank?.color || '#b13460' }}
              >
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <p className="font-ui text-[16px] font-bold text-[#202020] mb-1">
                  Đã mở app {qrData?.bank?.name || 'ngân hàng'}
                </p>
                <p className="font-sans text-[13px] text-[#5f5f5f]">
                  Hoàn tất giao dịch trong app, sau đó quay lại đây.
                </p>
                {amount && (
                  <p className="font-mono text-[14px] font-bold text-[#b13460] mt-2">
                    {formatVND(Number(amount))}
                  </p>
                )}
              </div>
              <div className="w-full bg-[#d5eddc] border-l-2 border-[#24a148] rounded-[4px] p-3 text-[12px] text-[#202020] flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#24a148] shrink-0" />
                <span>
                  Sau khi chuyển tiền xong, giao dịch sẽ tự động cập nhật qua SePay
                  trong vài giây.
                </span>
              </div>
              <div className="flex gap-2 w-full">
                <button
                  onClick={reset}
                  className="flex-1 h-10 rounded-[8px] bg-[#f3f3f3] border border-[#d6d6d6] text-[#5f5f5f] font-ui text-[13px]"
                >
                  Quét QR khác
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 h-10 rounded-[8px] bg-[#b13460] text-white font-ui text-[13px] font-bold flex items-center justify-center gap-1.5"
                >
                  Xong
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

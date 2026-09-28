'use client';

import { useState, useRef, useCallback } from 'react';
import {
  X,
  Camera,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ImagePlus,
  ScanLine,
  ArrowRight,
} from 'lucide-react';

/**
 * OcrUploadModal
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   categories: Array<{id, name, color}>
 *   onSave: (txData) => Promise<void>  // callback sau khi user xác nhận lưu
 */
export default function OcrUploadModal({ isOpen, onClose, categories, onSave }) {
  // Step: 'pick' | 'scanning' | 'review' | 'saving' | 'done'
  const [step, setStep] = useState('pick');
  const [preview, setPreview] = useState(null);          // data URL
  const [ocrData, setOcrData] = useState(null);
  const [error, setError] = useState(null);

  // Form xác nhận
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('OUT');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const formatVND = (n) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

  const reset = useCallback(() => {
    setStep('pick');
    setPreview(null);
    setOcrData(null);
    setError(null);
    setAmount('');
    setType('OUT');
    setContent('');
    setCategoryId('');
    setNote('');
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  // Đọc file -> base64 -> gọi OCR API
  const processImage = async (file) => {
    if (!file) return;
    setError(null);
    setStep('scanning');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      setPreview(dataUrl);

      // Lấy base64 thuần (bỏ prefix "data:image/...;base64,")
      const base64 = dataUrl.split(',')[1];
      const mimeType = file.type || 'image/jpeg';

      try {
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        });
        const json = await res.json();

        if (json.success && json.data) {
          const d = json.data;
          setOcrData(json);
          setAmount(d.amount ? String(d.amount) : '');
          setType(d.type || 'OUT');
          setContent(d.content || '');
          // Auto-match category
          if (d.bank) {
            const matched = categories.find((c) =>
              c.name.toLowerCase().includes('ngân hàng') ||
              c.name.toLowerCase().includes('bank')
            );
            if (matched) setCategoryId(String(matched.id));
          }
          setStep('review');
        } else {
          setError(json.message || 'OCR không nhận ra được thông tin giao dịch trong ảnh này.');
          setStep('pick');
        }
      } catch (err) {
        setError('Lỗi kết nối tới dịch vụ OCR. Vui lòng thử lại.');
        setStep('pick');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount))) {
      setError('Vui lòng nhập số tiền hợp lệ.');
      return;
    }
    setStep('saving');
    setError(null);

    const txData = {
      amount: Number(amount),
      type,
      content: content.trim(),
      category_id: categoryId || null,
      note: note.trim(),
      gateway: ocrData?.data?.bank || 'OCR Upload',
      transaction_date: ocrData?.data?.transaction_date || new Date().toISOString(),
      code: ocrData?.data?.transaction_code || null,
    };

    try {
      await onSave(txData);
      setStep('done');
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setError('Lỗi khi lưu giao dịch: ' + err.message);
      setStep('review');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={handleClose} />

      <div className="relative w-full max-w-md bg-[#ffffff] rounded-t-[12px] sm:rounded-[8px] border border-[#d6d6d6] z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#d6d6d6] bg-[#fafafa]">
          <div className="flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-[#b13460]" />
            <span className="font-ui text-[15px] font-bold text-[#202020]">
              Nhập giao dịch bằng ảnh
            </span>
          </div>
          <button onClick={handleClose} className="p-1 text-[#7f7f7f] hover:text-[#000000]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar">
          {/* ── STEP: PICK ── */}
          {(step === 'pick') && (
            <>
              {error && (
                <div className="p-3 bg-[#f8d4d6] border-l-2 border-[#da1e28] rounded-[4px] flex gap-2 text-[12px] text-[#202020]">
                  <AlertCircle className="w-4 h-4 text-[#da1e28] shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <p className="font-sans text-[13px] text-[#5f5f5f] leading-relaxed">
                Chụp hoặc tải lên ảnh xác nhận giao dịch / biên lai chuyển khoản.
                Hệ thống sẽ tự động đọc OCR và điền thông tin.
              </p>

              {/* Camera button */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 h-14 rounded-[8px] border-2 border-dashed border-[#b13460] bg-[#fce6eb] hover:bg-[#f9d0da] transition-colors"
              >
                <Camera className="w-5 h-5 text-[#b13460]" />
                <span className="font-ui text-[14px] font-bold text-[#b13460]">
                  Chụp ảnh biên lai
                </span>
              </button>

              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 h-14 rounded-[8px] border-2 border-dashed border-[#9f9f9f] bg-[#fafafa] hover:bg-[#f3f3f3] transition-colors"
              >
                <ImagePlus className="w-5 h-5 text-[#5f5f5f]" />
                <span className="font-ui text-[14px] font-medium text-[#5f5f5f]">
                  Tải ảnh từ thư viện
                </span>
              </button>

              {/* Lưu ý */}
              <p className="font-sans text-[11px] text-[#9f9f9f] text-center leading-relaxed">
                Hỗ trợ JPG, PNG, HEIC. Ảnh sẽ không được lưu trữ.
              </p>
            </>
          )}

          {/* ── STEP: SCANNING ── */}
          {step === 'scanning' && (
            <div className="py-10 flex flex-col items-center gap-4">
              {preview && (
                <div className="relative w-48 h-48 rounded-[8px] overflow-hidden border border-[#d6d6d6]">
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                  {/* Scan line animation */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-full h-0.5 bg-[#b13460] animate-bounce" />
                  </div>
                </div>
              )}
              <Loader2 className="w-8 h-8 text-[#b13460] animate-spin" />
              <p className="font-ui text-[14px] text-[#5f5f5f] text-center">
                Đang phân tích ảnh bằng AI...
              </p>
              <p className="font-sans text-[11px] text-[#9f9f9f] text-center">
                Thông thường mất 3-8 giây
              </p>
            </div>
          )}

          {/* ── STEP: REVIEW ── */}
          {step === 'review' && (
            <>
              {/* Preview thumbnail */}
              {preview && (
                <div className="flex gap-3 items-start">
                  <div className="w-16 h-16 rounded-[4px] overflow-hidden border border-[#d6d6d6] shrink-0">
                    <img src={preview} alt="bill" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#24a148]" />
                      <span className="font-ui text-[12px] text-[#24a148] font-medium">
                        OCR đọc thành công
                        {ocrData?.provider && (
                          <span className="text-[#9f9f9f] font-normal ml-1">
                            (via {ocrData.provider})
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="font-sans text-[11px] text-[#7f7f7f]">
                      Kiểm tra và chỉnh sửa thông tin trước khi lưu
                    </p>
                    {ocrData?.data?.bank && (
                      <span className="inline-block mt-1 font-ui text-[10px] text-[#365983] bg-[#eaf0f8] border border-[#466fa1] px-1.5 py-0.5 rounded-[2px]">
                        {ocrData.data.bank}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-2 bg-[#fce8da] border-l-2 border-[#ee853b] rounded-[4px] text-[11px] text-[#202020] flex gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-[#ee853b] shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* Loại giao dịch */}
              <div>
                <label className="font-ui text-[12px] font-medium text-[#5f5f5f] mb-1 block">
                  Loại giao dịch
                </label>
                <div className="flex gap-2">
                  {['IN', 'OUT'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`flex-1 h-9 rounded-[6px] font-ui text-[13px] font-bold border transition-colors ${
                        type === t
                          ? t === 'IN'
                            ? 'bg-[#d5eddc] text-[#24a148] border-[#24a148]'
                            : 'bg-[#f8d4d6] text-[#da1e28] border-[#da1e28]'
                          : 'bg-[#fafafa] text-[#7f7f7f] border-[#d6d6d6]'
                      }`}
                    >
                      {t === 'IN' ? '+ Tiền vào' : '− Tiền ra'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Số tiền */}
              <div>
                <label className="font-ui text-[12px] font-medium text-[#5f5f5f] mb-1 block">
                  Số tiền (VNĐ) <span className="text-[#da1e28]">*</span>
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full h-11 bg-[#fafafa] border border-[#9f9f9f] rounded-[4px] px-3 font-mono text-[16px] text-[#202020] focus:border-[#0590de] outline-none"
                />
                {amount && !isNaN(Number(amount)) && (
                  <p className="font-mono text-[11px] text-[#7f7f7f] mt-0.5">
                    = {formatVND(Number(amount))}
                  </p>
                )}
              </div>

              {/* Nội dung */}
              <div>
                <label className="font-ui text-[12px] font-medium text-[#5f5f5f] mb-1 block">
                  Nội dung giao dịch
                </label>
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nội dung chuyển khoản..."
                  className="w-full h-10 bg-[#fafafa] border border-[#9f9f9f] rounded-[4px] px-3 font-sans text-[13px] text-[#202020] focus:border-[#0590de] outline-none"
                />
              </div>

              {/* Danh mục */}
              <div>
                <label className="font-ui text-[12px] font-medium text-[#5f5f5f] mb-1 block">
                  Danh mục
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

              {/* Ghi chú */}
              <div>
                <label className="font-ui text-[12px] font-medium text-[#5f5f5f] mb-1 block">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú thêm (tuỳ chọn)..."
                  className="w-full h-10 bg-[#fafafa] border border-[#9f9f9f] rounded-[4px] px-3 font-sans text-[13px] text-[#202020] focus:border-[#0590de] outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={reset}
                  className="flex-1 h-10 rounded-[8px] bg-[#f3f3f3] hover:bg-[#ececec] border border-[#d6d6d6] text-[#5f5f5f] font-ui text-[13px] font-medium"
                >
                  Chụp lại
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 h-10 rounded-[8px] bg-[#b13460] hover:bg-[#a02e55] text-[#ffffff] font-ui text-[13px] font-bold flex items-center justify-center gap-1.5"
                >
                  Lưu giao dịch
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* ── STEP: SAVING ── */}
          {step === 'saving' && (
            <div className="py-10 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-[#b13460] animate-spin" />
              <p className="font-ui text-[14px] text-[#5f5f5f]">Đang lưu giao dịch...</p>
            </div>
          )}

          {/* ── STEP: DONE ── */}
          {step === 'done' && (
            <div className="py-10 flex flex-col items-center gap-3">
              <CheckCircle2 className="w-12 h-12 text-[#24a148]" />
              <p className="font-ui text-[15px] font-bold text-[#202020]">
                Đã lưu thành công!
              </p>
              <p className="font-sans text-[13px] text-[#7f7f7f]">
                {formatVND(Number(amount))} đã được thêm vào hệ thống
              </p>
            </div>
          )}
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}

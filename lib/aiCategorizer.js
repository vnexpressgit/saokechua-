/**
 * Bộ suy đoán từ ngữ & tự động phân loại giao dịch thông minh (AI Categorizer)
 * Tích hợp 2 cơ chế:
 * 1. LLM Engine (Gemini / AI) khi có API key để suy đoán ngữ nghĩa từ viết tắt / viết liền không dấu.
 * 2. Smart Compound Word & NLP Rule Engine xử lý siêu tốc, chính xác cao cho văn phong chuyển khoản Việt Nam.
 */

// Danh sách ghép từ không dấu tiếng Việt phổ biến trong chuyển khoản
const VIETNAMESE_COMPOUND_WORDS = [
  // ĂN UỐNG
  { raw: 'comga', label: 'Cơm gà', category: 'Ăn uống' },
  { raw: 'com ga', label: 'Cơm gà', category: 'Ăn uống' },
  { raw: 'comtam', label: 'Cơm tấm', category: 'Ăn uống' },
  { raw: 'com tam', label: 'Cơm tấm', category: 'Ăn uống' },
  { raw: 'comsuon', label: 'Cơm sườn', category: 'Ăn uống' },
  { raw: 'comnieu', label: 'Cơm niêu', category: 'Ăn uống' },
  { raw: 'comrang', label: 'Cơm rang', category: 'Ăn uống' },
  { raw: 'combinhdan', label: 'Cơm bình dân', category: 'Ăn uống' },
  { raw: 'khoaitrung', label: 'Khoai trứng', category: 'Ăn uống' },
  { raw: 'khoai trung', label: 'Khoai trứng', category: 'Ăn uống' },
  { raw: 'mycju', label: 'Mỳ CJU', category: 'Ăn uống' },
  { raw: 'my cay', label: 'Mỳ cay', category: 'Ăn uống' },
  { raw: 'mycay', label: 'Mỳ cay', category: 'Ăn uống' },
  { raw: 'myquang', label: 'Mỳ Quảng', category: 'Ăn uống' },
  { raw: 'phobo', label: 'Phở bò', category: 'Ăn uống' },
  { raw: 'phoga', label: 'Phở gà', category: 'Ăn uống' },
  { raw: 'buncha', label: 'Bún chả', category: 'Ăn uống' },
  { raw: 'bundau', label: 'Bún đậu mắm tôm', category: 'Ăn uống' },
  { raw: 'bunbo', label: 'Bún bò Huế', category: 'Ăn uống' },
  { raw: 'banhmi', label: 'Bánh mì', category: 'Ăn uống' },
  { raw: 'banhcuon', label: 'Bánh cuốn', category: 'Ăn uống' },
  { raw: 'banhcanh', label: 'Bánh canh', category: 'Ăn uống' },
  { raw: 'hutieu', label: 'Hủ tiếu', category: 'Ăn uống' },
  { raw: 'xoi', label: 'Xôi', category: 'Ăn uống' },
  { raw: 'lau', label: 'Lẩu', category: 'Ăn uống' },
  { raw: 'nuong', label: 'Đồ nướng', category: 'Ăn uống' },
  { raw: 'bbq', label: 'Thịt nướng BBQ', category: 'Ăn uống' },
  { raw: 'pizza', label: 'Pizza', category: 'Ăn uống' },
  { raw: 'sushi', label: 'Sushi', category: 'Ăn uống' },
  { raw: 'kfc', label: 'Gà rán KFC', category: 'Ăn uống' },
  { raw: 'lotteria', label: 'Lotteria', category: 'Ăn uống' },
  { raw: 'jollibee', label: 'Jollibee', category: 'Ăn uống' },
  { raw: 'shopeefood', label: 'ShopeeFood', category: 'Ăn uống' },
  { raw: 'grabfood', label: 'GrabFood', category: 'Ăn uống' },
  { raw: 'baemin', label: 'Baemin', category: 'Ăn uống' },

  // CÀ PHÊ & BÁNH / NƯỚC UỐNG
  { raw: 'trasua', label: 'Trà sữa', category: 'Cà phê & Bánh' },
  { raw: 'tra sua', label: 'Trà sữa', category: 'Cà phê & Bánh' },
  { raw: 'trasuaphuclong', label: 'Trà sữa Phúc Long', category: 'Cà phê & Bánh' },
  { raw: 'caphe', label: 'Cà phê', category: 'Cà phê & Bánh' },
  { raw: 'cafe', label: 'Cà phê', category: 'Cà phê & Bánh' },
  { raw: 'coffee', label: 'Cà phê', category: 'Cà phê & Bánh' },
  { raw: 'highlands', label: 'Highlands Coffee', category: 'Cà phê & Bánh' },
  { raw: 'phuclong', label: 'Phúc Long Coffee & Tea', category: 'Cà phê & Bánh' },
  { raw: 'phuc long', label: 'Phúc Long Coffee & Tea', category: 'Cà phê & Bánh' },
  { raw: 'starbucks', label: 'Starbucks', category: 'Cà phê & Bánh' },
  { raw: 'the coffee house', label: 'The Coffee House', category: 'Cà phê & Bánh' },
  { raw: 'matcha', label: 'Matcha', category: 'Cà phê & Bánh' },
  { raw: 'tocotoco', label: 'Trà sữa ToCoToCo', category: 'Cà phê & Bánh' },
  { raw: 'mixue', label: 'Kem & Trà Mixue', category: 'Cà phê & Bánh' },
  { raw: 'tradao', label: 'Trà đào cam sả', category: 'Cà phê & Bánh' },
  { raw: 'sinhto', label: 'Sinh tố & Nước ép', category: 'Cà phê & Bánh' },
  { raw: 'nuocmia', label: 'Nước mía', category: 'Cà phê & Bánh' },

  // DI CHUYỂN & XE CỘ
  { raw: 'xangxe', label: 'Xăng xe', category: 'Di chuyển' },
  { raw: 'doxang', label: 'Đổ xăng', category: 'Di chuyển' },
  { raw: 'xang', label: 'Xăng xe', category: 'Di chuyển' },
  { raw: 'petrolimex', label: 'Cây xăng Petrolimex', category: 'Di chuyển' },
  { raw: 'pvoil', label: 'Cây xăng PVOIL', category: 'Di chuyển' },
  { raw: 'grab', label: 'Grab Car/Bike', category: 'Di chuyển' },
  { raw: 'be group', label: 'Be Group', category: 'Di chuyển' },
  { raw: 'be bike', label: 'BeBike', category: 'Di chuyển' },
  { raw: 'xanh sm', label: 'Taxi Xanh SM', category: 'Di chuyển' },
  { raw: 'xanhsm', label: 'Taxi Xanh SM', category: 'Di chuyển' },
  { raw: 'gojek', label: 'Gojek', category: 'Di chuyển' },
  { raw: 'taxi', label: 'Taxi di chuyển', category: 'Di chuyển' },
  { raw: 'guixe', label: 'Vé gửi xe', category: 'Di chuyển' },
  { raw: 'gui xe', label: 'Gửi xe', category: 'Di chuyển' },
  { raw: 'epass', label: 'Thu phí không dừng ePass', category: 'Di chuyển' },
  { raw: 'vetc', label: 'Thu phí không dừng VETC', category: 'Di chuyển' },
  { raw: 'suaxe', label: 'Sửa chữa xe máy/ô tô', category: 'Di chuyển' },
  { raw: 'ruaxe', label: 'Rửa xe', category: 'Di chuyển' },

  // HÓA ĐƠN & TIỆN ÍCH
  { raw: 'tiendien', label: 'Tiền điện sinh hoạt', category: 'Hóa đơn & Tiện ích' },
  { raw: 'tien dien', label: 'Tiền điện', category: 'Hóa đơn & Tiện ích' },
  { raw: 'evn', label: 'Điện lực EVN', category: 'Hóa đơn & Tiện ích' },
  { raw: 'tiennuoc', label: 'Tiền nước sinh hoạt', category: 'Hóa đơn & Tiện ích' },
  { raw: 'tien nuoc', label: 'Tiền nước', category: 'Hóa đơn & Tiện ích' },
  { raw: 'internet', label: 'Cước mạng Internet', category: 'Hóa đơn & Tiện ích' },
  { raw: 'viettel', label: 'Viettel Telecom', category: 'Hóa đơn & Tiện ích' },
  { raw: 'fpt telecom', label: 'FPT Telecom', category: 'Hóa đơn & Tiện ích' },
  { raw: 'vnpt', label: 'VNPT Telecom', category: 'Hóa đơn & Tiện ích' },
  { raw: 'tiennha', label: 'Tiền thuê nhà / mặt bằng', category: 'Hóa đơn & Tiện ích' },
  { raw: 'tien nha', label: 'Tiền nhà', category: 'Hóa đơn & Tiện ích' },
  { raw: 'tienphong', label: 'Tiền phòng trọ', category: 'Hóa đơn & Tiện ích' },
  { raw: 'phichungcu', label: 'Phí dịch vụ chung cư', category: 'Hóa đơn & Tiện ích' },

  // MUA SẮM & DƯỢC PHẨM
  { raw: 'mentieuhoa', label: 'Men tiêu hoá (Dược phẩm)', category: 'Mua sắm' },
  { raw: 'men tieu hoa', label: 'Men tiêu hoá', category: 'Mua sắm' },
  { raw: 'thuoc', label: 'Thuốc / Dược phẩm', category: 'Mua sắm' },
  { raw: 'nhathuoc', label: 'Nhà thuốc', category: 'Mua sắm' },
  { raw: 'pharmacity', label: 'Nhà thuốc Pharmacity', category: 'Mua sắm' },
  { raw: 'longchau', label: 'Nhà thuốc Long Châu', category: 'Mua sắm' },
  { raw: 'ankhang', label: 'Nhà thuốc An Khang', category: 'Mua sắm' },
  { raw: 'shopee', label: 'Shopee Mua sắm', category: 'Mua sắm' },
  { raw: 'lazada', label: 'Lazada Mua sắm', category: 'Mua sắm' },
  { raw: 'tiki', label: 'Tiki Mua sắm', category: 'Mua sắm' },
  { raw: 'tiktokshop', label: 'TikTok Shop', category: 'Mua sắm' },
  { raw: 'winmart', label: 'Siêu thị WinMart', category: 'Mua sắm' },
  { raw: 'coopmart', label: 'Siêu thị Co.opmart', category: 'Mua sắm' },
  { raw: 'circle k', label: 'Circle K tiện lợi', category: 'Mua sắm' },
  { raw: 'circlek', label: 'Circle K', category: 'Mua sắm' },
  { raw: 'gs25', label: 'GS25 tiện lợi', category: 'Mua sắm' },
  { raw: 'seven', label: '7-Eleven tiện lợi', category: 'Mua sắm' },
  { raw: 'bachhoaxanh', label: 'Bách Hóa Xanh', category: 'Mua sắm' },
  { raw: 'quanao', label: 'Quần áo thời trang', category: 'Mua sắm' },
  { raw: 'giaydep', label: 'Giày dép phụ kiện', category: 'Mua sắm' },

  // GIẢI TRÍ
  { raw: 'cgv', label: 'Rạp chiếu phim CGV', category: 'Giải trí' },
  { raw: 'lottecinema', label: 'Rạp Lotte Cinema', category: 'Giải trí' },
  { raw: 'netflix', label: 'Đăng ký gói Netflix', category: 'Giải trí' },
  { raw: 'spotify', label: 'Đăng ký gói Spotify', category: 'Giải trí' },
  { raw: 'youtube', label: 'YouTube Premium', category: 'Giải trí' },
  { raw: 'steam', label: 'Game Steam', category: 'Giải trí' },
  { raw: 'napgame', label: 'Nạp thẻ game', category: 'Giải trí' },

  // LƯƠNG & THƯỞNG
  { raw: 'luong', label: 'Lương chuyển khoản', category: 'Lương & Thưởng' },
  { raw: 'salary', label: 'Lương hàng tháng', category: 'Lương & Thưởng' },
  { raw: 'thuong', label: 'Tiền thưởng hiệu quả', category: 'Lương & Thưởng' },
  { raw: 'tamung', label: 'Tạm ứng lương', category: 'Lương & Thưởng' },
  { raw: 'bonus', label: 'Thưởng công việc', category: 'Lương & Thưởng' },
];

/**
 * Loại bỏ tiền tố ngân hàng phổ biến (Bank Prefix Cleaner)
 * Ví dụ: "Nguyen Huu Nam chuyen tien QR comga" -> "comga"
 */
export function cleanBankingPrefix(content) {
  if (!content) return '';
  let str = content.trim();

  // Bỏ các định dạng prefix chuyển tiền thường thấy ở VietQR, Napas, TPBank, MB, VCB
  const patternsToRemove = [
    /^[A-Za-z0-9\s]{2,40}\s+(chuyen tien|chuyen khoan|thanh toan|ck)\s*(qr)?\s*/i,
    /^(chuyen tien|chuyen khoan|thanh toan|ck)\s*(qr)?\s*/i,
    /^qr\s+/i,
    /^(nap tien|rut tien|tra tien)\s*/i,
  ];

  for (const regex of patternsToRemove) {
    if (regex.test(str)) {
      str = str.replace(regex, '').trim();
      break;
    }
  }

  return str || content;
}

/**
 * Gọi Model LLM (Gemini) để suy đoán từ không dấu và phân loại danh mục
 * @param {string} rawCoreContent - Nội dung đã lọc prefix
 * @param {Array<string>} availableCategories - Danh sách tên danh mục hiện có
 * @returns {Promise<{ inferredText: string, categoryName: string }|null>}
 */
async function callGeminiCategorizer(rawCoreContent, availableCategories = []) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = `Bạn là trợ lý AI kế toán tài chính thông minh chuyên phân tích sao kê ngân hàng Việt Nam.
Nội dung chuyển khoản gốc (thường viết tắt, không dấu, viết liền nhau như 'comga', 'khoaitrung', 'mycju', 'trasua', 'xangxe', 'tiendien'):
"${rawCoreContent}"

Danh mục được phép chọn (chỉ được chọn 1 trong các danh mục sau):
[${availableCategories.join(', ')}]

Yêu cầu:
1. Suy đoán chính xác cụm từ tiếng Việt có dấu đầy đủ từ nội dung trên (ví dụ: 'comga' -> 'Cơm gà', 'khoaitrung' -> 'Khoai trứng', 'mycju' -> 'Mỳ CJU', 'mentieuhoa' -> 'Men tiêu hoá').
2. Phân loại vào 1 danh mục phù hợp nhất trong danh sách được phép chọn ở trên.
3. Trả về ĐÚNG định dạng JSON sau (không kèm markdown thừa):
{"inferredText": "tên món/dịch vụ tiếng Việt đầy đủ", "categoryName": "tên danh mục chính xác"}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 150,
          },
        }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) return null;

    const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJson);
    if (parsed.inferredText && parsed.categoryName) {
      return {
        inferredText: parsed.inferredText,
        categoryName: parsed.categoryName,
      };
    }
  } catch (err) {
    console.warn('Lỗi gọi LLM Gemini Categorizer, chuyển sang Rule Engine:', err.message);
  }

  return null;
}

/**
 * Phân tích và suy đoán từ ngữ qua Compound Word Matcher
 * @param {string} coreText - Từ khóa lõi
 * @returns {{ inferredText: string, categoryName: string }|null}
 */
export function inferWordAndCategoryFromRules(coreText) {
  if (!coreText) return null;
  const lower = coreText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  const tokens = lower.split(/\s+/).filter(Boolean);

  // 1. Kiểm tra đối sánh chính xác với từng từ trong bảng ghép từ
  for (const item of VIETNAMESE_COMPOUND_WORDS) {
    const rawPattern = item.raw.toLowerCase();
    // Khớp nếu chuỗi chứa pattern nguyên vẹn (ví dụ: 'comga', 'khoaitrung')
    if (lower === rawPattern || lower.includes(rawPattern)) {
      return {
        inferredText: item.label,
        categoryName: item.category,
      };
    }
    // Khớp theo token
    if (tokens.includes(rawPattern)) {
      return {
        inferredText: item.label,
        categoryName: item.category,
      };
    }
  }

  // 2. Kiểm tra nếu có chứa từ đặc trưng (loại trừ các từ tài chính như tra lai, tra no, tra tien)
  if (lower.startsWith('com ') || lower.includes(' com ') || lower.endsWith(' com')) {
    return { inferredText: 'Cơm / Món ăn', categoryName: 'Ăn uống' };
  }
  if (lower.startsWith('pho ') || lower.includes(' pho ') || lower.endsWith(' pho')) {
    return { inferredText: 'Phở', categoryName: 'Ăn uống' };
  }
  if (lower.startsWith('bun ') || lower.includes(' bun ') || lower.endsWith(' bun')) {
    return { inferredText: 'Bún', categoryName: 'Ăn uống' };
  }
  if (lower.includes('lau ') || lower.includes('bbq') || lower.includes('nuong')) {
    return { inferredText: 'Lẩu / Nướng', categoryName: 'Ăn uống' };
  }
  if (
    lower.includes('coffee') ||
    lower.includes('cafe') ||
    lower.includes('caphe') ||
    lower.includes('tra dao') ||
    lower.includes('tra sua') ||
    lower.includes('tra chanh') ||
    lower.includes('tra tac')
  ) {
    return { inferredText: 'Cà phê & Đồ uống', categoryName: 'Cà phê & Bánh' };
  }

  return null;
}

/**
 * Hàm phân loại thông minh tổng hợp (AI + Rule-based Hybrid Engine)
 * @param {string} fullContent - Nội dung giao dịch đầy đủ
 * @param {string} type - 'IN' | 'OUT'
 * @param {Array} categories - Danh sách categories từ Supabase
 * @returns {Promise<{ categoryId: string, inferredText: string, categoryName: string }>}
 */
export async function smartCategorizeTransaction(fullContent, type, categories = []) {
  if (!categories || categories.length === 0) {
    return { categoryId: null, inferredText: fullContent, categoryName: 'Khác' };
  }

  const catMap = {};
  categories.forEach((cat) => {
    catMap[cat.name] = cat.id;
  });

  const fallbackId = catMap['Khác'] || categories[0]?.id;

  // Nếu là tiền vào (IN)
  if (type === 'IN') {
    const lower = (fullContent || '').toLowerCase();
    if (
      lower.includes('luong') ||
      lower.includes('thuong') ||
      lower.includes('salary') ||
      lower.includes('cty') ||
      lower.includes('cong ty')
    ) {
      const catId = catMap['Lương & Thưởng'] || fallbackId;
      return { categoryId: catId, inferredText: 'Lương & Thưởng', categoryName: 'Lương & Thưởng' };
    }
    if (lower.includes('lai') || lower.includes('tra lai') || lower.includes('tiet kiem')) {
      return { categoryId: fallbackId, inferredText: 'Lãi tiền gửi tiết kiệm', categoryName: 'Khác' };
    }
  }

  // 1. Trích xuất phần lõi nội dung
  const coreContent = cleanBankingPrefix(fullContent);

  // 2. Thử gọi LLM nếu có API Key
  const categoryNames = categories.map((c) => c.name);
  const llmResult = await callGeminiCategorizer(coreContent, categoryNames);
  if (llmResult && llmResult.categoryName) {
    const matchedId = catMap[llmResult.categoryName] || fallbackId;
    return {
      categoryId: matchedId,
      inferredText: llmResult.inferredText,
      categoryName: llmResult.categoryName,
    };
  }

  // 3. Sử dụng Smart Rule Engine
  const ruleResult = inferWordAndCategoryFromRules(coreContent);
  if (ruleResult) {
    // Map về tên danh mục tương đương trong categories
    let mappedName = ruleResult.categoryName;
    if (!catMap[mappedName]) {
      // Tìm danh mục gần giống nhất
      const foundKey = Object.keys(catMap).find(
        (name) => name.includes(mappedName) || mappedName.includes(name)
      );
      if (foundKey) mappedName = foundKey;
    }

    const matchedId = catMap[mappedName] || fallbackId;
    return {
      categoryId: matchedId,
      inferredText: ruleResult.inferredText,
      categoryName: mappedName,
    };
  }

  // 4. Nếu không nhận diện được, gán vào 'Khác'
  return {
    categoryId: fallbackId,
    inferredText: coreContent,
    categoryName: 'Khác',
  };
}

/**
 * Format chuỗi thời gian đúng chuẩn SePay trả ra: YYYY-MM-DD HH:mm:ss
 * Giữ nguyên múi giờ gốc của SePay, không bị lệch do UTC
 * @param {string} dateStr
 * @returns {string} - YYYY-MM-DD HH:mm:ss
 */
export function formatSePayDateTime(dateStr) {
  if (!dateStr) return '';
  // SePay định dạng ban đầu: "2026-09-26 19:08:54" hoặc ISO "2026-09-26T19:08:54+07:00"
  let clean = String(dateStr).trim();
  clean = clean.replace('T', ' ').replace(/\+.*/, '').replace(/Z.*/, '');
  return clean;
}

/**
 * Chuẩn hóa thời gian khi lưu vào database Postgres (Supabase TIMESTAMPTZ)
 * Đảm bảo gắn đúng timezone Việt Nam (+07:00) để không bị lệch 7 tiếng
 * @param {string} sepayDateStr - "2026-09-26 19:08:54"
 * @returns {string} - "2026-09-26T19:08:54+07:00"
 */
export function normalizeSePayDateForDb(sepayDateStr) {
  if (!sepayDateStr) return new Date().toISOString();
  let str = String(sepayDateStr).trim();
  if (str.includes('+') || str.endsWith('Z')) return str;
  return str.replace(' ', 'T') + '+07:00';
}

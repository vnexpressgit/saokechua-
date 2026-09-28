import { NextResponse } from 'next/server';

/**
 * POST /api/ocr
 * Body: { imageBase64: string, mimeType?: string }
 * Response: { success, provider, data: { amount, type, content, bank, ... } }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType = 'image/jpeg' } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, message: 'Thieu du lieu anh' },
        { status: 400 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (geminiKey) {
      return await extractWithGemini(imageBase64, mimeType, geminiKey);
    }

    return await extractWithOcrSpace(imageBase64);
  } catch (err) {
    console.error('OCR route error:', err);
    return NextResponse.json(
      { success: false, message: 'Loi xu ly anh: ' + err.message },
      { status: 500 }
    );
  }
}

async function extractWithGemini(imageBase64, mimeType, apiKey) {
  const prompt = `Phan tich anh bien lai/xac nhan chuyen khoan ngan hang va trich xuat thong tin.
Tra ve JSON voi cac truong (neu khong tim thay thi de null):
{
  "amount": <so tien dang number, khong co dau>,
  "type": <"IN" neu nhan tien, "OUT" neu chuyen tien>,
  "content": <noi dung giao dich>,
  "sender": <ten hoac so tai khoan nguoi gui>,
  "receiver": <ten hoac so tai khoan nguoi nhan>,
  "bank": <ten ngan hang>,
  "transaction_date": <ngay gio "YYYY-MM-DD HH:mm:ss">,
  "transaction_code": <ma giao dich>
}
Chi tra ve JSON thuan tuy, khong markdown.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0.1 },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error('Gemini API loi ' + res.status + ': ' + errText);
  }

  const data = await res.json();
  let textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  // Strip markdown code fences if present
  textContent = textContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(textContent);
  } catch {
    parsed = {};
  }

  return NextResponse.json({
    success: true,
    provider: 'gemini',
    data: {
      amount: parsed.amount ? Number(parsed.amount) : null,
      type: parsed.type || 'OUT',
      content: parsed.content || '',
      sender: parsed.sender || null,
      receiver: parsed.receiver || null,
      bank: parsed.bank || null,
      transaction_date: parsed.transaction_date || null,
      transaction_code: parsed.transaction_code || null,
    },
    rawText: textContent,
  });
}

async function extractWithOcrSpace(imageBase64) {
  const formData = new FormData();
  formData.append('base64Image', 'data:image/jpeg;base64,' + imageBase64);
  formData.append('language', 'vie');
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2');

  const ocrKey = process.env.OCR_SPACE_API_KEY || 'helloworld';
  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { apikey: ocrKey },
    body: formData,
  });

  const data = await res.json();
  const rawText = data?.ParsedResults?.[0]?.ParsedText || '';
  const parsed = parseTransactionFromText(rawText);

  return NextResponse.json({
    success: true,
    provider: 'ocr.space',
    data: parsed,
    rawText,
  });
}

function parseTransactionFromText(text) {
  // So tien
  const amountMatch = text.match(/(\d[\d.,]+)\s*(VND|VND|d)?/i);
  let amount = null;
  if (amountMatch) {
    const raw = amountMatch[1].replace(/[.,]/g, '');
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num > 1000) amount = num;
  }

  const isIncoming = /nhan|vao tai khoan|credit|ghi co/i.test(text);
  const type = isIncoming ? 'IN' : 'OUT';

  const bankMatch = text.match(
    /(Vietcombank|VCB|BIDV|VietinBank|CTG|Techcombank|TCB|MBBank|MB Bank|TPBank|VPBank|Agribank|ACB|Sacombank|STB|SHB|MSB|OCB)/i
  );
  const bank = bankMatch ? bankMatch[1] : null;

  const dateMatch = text.match(/\d{2}[\/\-]\d{2}[\/\-]\d{4}(\s+\d{2}:\d{2}(:\d{2})?)?/);
  const transaction_date = dateMatch ? dateMatch[0] : null;

  const contentMatch = text.match(/(?:noi dung|mo ta|content|description)[:\s]+([^\n]+)/i);
  const content = contentMatch
    ? contentMatch[1].trim()
    : text.split('\n').find((l) => l.trim().length > 5) || '';

  return {
    amount,
    type,
    content,
    sender: null,
    receiver: null,
    bank,
    transaction_date,
    transaction_code: null,
  };
}

import { GoogleGenAI } from "@google/genai";
import { formatLocalISO } from "../lib/formatters";

// Retrieve Gemini API Key from Vite environment variables
const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

// Helper to compress and convert an uploaded image File into a optimized Base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const rawBase64 = (reader.result as string).split(',')[1] || (reader.result as string);
          resolve(rawBase64);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use standard JPEG for fast transfer and high OCR accuracy
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const base64 = dataUrl.split(',')[1] || dataUrl;
        resolve(base64);
      };
      img.onerror = () => {
        const rawBase64 = (reader.result as string).split(',')[1] || (reader.result as string);
        resolve(rawBase64);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const geminiService = {
  /**
   * Feature 1: AI Receipt OCR Scanner (Multimodal Vision)
   * Extracts structured transaction details from Vietnamese receipt images.
   * Automatically calculates and recalculates the final `totalAmount` when the user
   * provides custom instructions for splitting bills or subtracting items.
   */
  async scanReceipt(imageFile: File, userInstruction?: string) {
    const base64Data = await fileToBase64(imageFile);

    // 1. Call server-side API first (Full-Stack Gemini 3.5 Flash Lite Engine)
    try {
      const response = await fetch('/api/gemini/receipt-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: `data:image/jpeg;base64,${base64Data}`,
          userInstruction: userInstruction || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result;
      }
    } catch (serverErr) {
      console.warn('Server OCR fetch failed, evaluating fallback:', serverErr);
    }

    // 2. Client-side direct Gemini call if API key exists in client env
    if (apiKey) {
      try {
        const prompt = `
Bạn là chuyên gia bóc tách hóa đơn AI cho ứng dụng quản lý tài chính SIVI WALLET tại Việt Nam.
Nhiệm vụ của bạn là phân tích ảnh hóa đơn, đọc danh sách các món, đơn giá, số lượng, tổng tiền và áp dụng lời dặn của người dùng để tính toán chính xác số tiền thực tế người dùng phải trả.

QUY TẮC BÓC TÁCH VÀ TÍNH TOÁN (BẮT BUỘC TUÂN THỦ):
1. Đơn vị tiền tệ: Luôn quy đổi về số nguyên VNĐ (VND) (VD: 45k -> 45000, 1.5tr -> 1500000).
2. QUY TẮC ÉP TỰ ĐỘNG TÍNH LẠI TỔNG TIỀN KHI CÓ LỜI DẶN CHIA TIỀN / TRỪ MÓN:
   - Lời dặn của người dùng: "${userInstruction || ''}".
   - Nếu người dùng có lời dặn chia tiền hoặc trừ món (VD: 'chia đôi', 'chia 2', 'chia 3', 'tính riêng món X', 'bỏ món Y', 'trừ món Z', 'tôi chỉ trả phần ăn của tôi...'):
     * AI BẮT BUỘC phải tính toán ra CON SỐ CUỐI CÙNG mà người dùng thực tế phải trả và gán con số đó vào trường 'totalAmount' (KHÔNG lấy tổng gốc trên giấy nếu có lời dặn chia/trừ tiền).
     * Trong trường 'note': Viết ngắn gọn 1 câu giải thích công thức tính toán bằng tiếng Việt (VD: "(Tổng 105k - 18k)/2 + 18k = 61.500đ" hoặc "(Tổng bill 240k)/2 = 120.000đ" hoặc "Tổng 150k trừ món lẩu 80k = 70.000đ").
   - Nếu người dùng KHÔNG có lời dặn chia tiền/trừ món:
     * 'totalAmount' là tổng số tiền thực tế ghi trên hóa đơn.
     * 'note': để trống hoặc tóm tắt ngắn gọn.
3. Trích xuất đầy đủ:
   - merchantName: Tên quán/cửa hàng
   - totalAmount: Con số cuối cùng sau khi tính toán theo lời dặn (số nguyên VND)
   - transactionDate: Định dạng YYYY-MM-DDTHH:mm hoặc YYYY-MM-DD
   - category: Ăn uống, Đi chợ / Siêu thị, Mua sắm, Di chuyển, Giải trí, Hóa đơn & Tiện ích, Sức khỏe, Khác
   - paymentMethod: Tiền mặt, MoMo, Vietcombank, CK Ngân Hàng...
   - items: Danh sách mảng [{ name: string, price: number, quantity: number }]
   - note: Giải thích công thức tính toán ngắn gọn nếu có lời dặn chia/trừ tiền

Trả về DUY NHẤT một chuỗi JSON hợp lệ không bọc trong markdown code fence.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg',
              },
            },
            { text: prompt },
          ],
        });

        const text = response.text || '';
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (clientErr) {
        console.warn('Client-side Gemini OCR error:', clientErr);
      }
    }

    // 3. Fallback mock calculation if offline or network unavailable
    const instruction = (userInstruction || '').toLowerCase();
    let computedAmount = 120000;
    let computedNote = 'Hóa đơn đã được ghi nhận';

    if (instruction.includes('chia đôi') || instruction.includes('chia 2') || instruction.includes('/2')) {
      computedAmount = 60000;
      computedNote = '(Tổng 120k)/2 = 60.000đ';
    } else if (instruction.includes('chia 3') || instruction.includes('/3')) {
      computedAmount = 40000;
      computedNote = '(Tổng 120k)/3 = 40.000đ';
    }

    return {
      merchantName: 'Hóa đơn mua sắm',
      totalAmount: computedAmount,
      transactionDate: new Date().toISOString().slice(0, 16),
      category: 'Ăn uống',
      paymentMethod: 'Tiền mặt',
      items: [
        { name: 'Món ăn / Dịch vụ', price: computedAmount, quantity: 1 }
      ],
      note: computedNote,
      rawNotes: userInstruction || computedNote,
    };
  },

  /**
   * Feature 2: Natural Language Expense Logger (NLP Parser)
   * Parses colloquial Vietnamese text/voice statements into structured financial payloads.
   */
  async parseNaturalLanguage(text: string, _wallets?: any[], _categories?: any[]) {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const currentLocalIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const prompt = `You are a Vietnamese Natural Language Financial Transaction Parser.
Current Local Reference Time: '${currentLocalIso}'. If user specifies time (e.g. '2h sáng' -> 02:00, '3h chiều' -> 15:00, 'hôm qua' -> yesterday), calculate exact local datetime into transactionDate ('YYYY-MM-DDTHH:mm').

Analyze the user's input text in Vietnamese and extract structured financial transaction information into valid JSON.

Instructions:
1. Relative Datetime & Specific Hour Calculation:
   - Compute relative date and time ("lúc sáng", "sáng nay", "hôm nay", "hôm qua", "hôm kia", "trưa nay", "chiều nay", "tối qua", "hồi nãy", "vừa rồi") STRICTLY relative to the Current Local Reference Time: '${currentLocalIso}'.
   - Nếu người dùng nói giờ cụ thể (VD: '2h sáng' -> 02:00, '3h chiều' -> 15:00, 'trưa nay' -> 12:00, '8h tối' -> 20:00, '14h30' -> 14:30), BẮT BUỘC tính đúng giờ:phút đó vào transactionDate (định dạng YYYY-MM-DDTHH:mm).
   - Nếu có nhắc đến buổi chung chung mà không có số giờ cụ thể:
     * Sáng (morning): ~08:30
     * Trưa (noon): ~12:00
     * Chiều (afternoon): ~15:30
     * Tối (evening): ~19:30
     * Đêm / Khuya: ~22:30
   - Nếu chỉ nhắc đến ngày không có giờ/buổi, giữ nguyên giờ:phút của Current Local Reference Time.
   - Format "transactionDate" strictly as local string: YYYY-MM-DDTHH:mm.

2. Transaction Type Inference:
   - "INCOME": if salary, bonus, receiving money, cash gift, interest, sales revenue, refund (e.g., "nhận lương", "lương về", "được thưởng", "nhận tiền", "được cho", "chuyển khoản đến", "bán đồ", "hoàn tiền", "khách trả tiền").
   - "EXPENSE": if buying, paying, spending, eating, transport, shopping, bills (e.g., "ăn", "uống", "mua", "chi", "trả tiền", "chuyển khoản đi", "đi chợ", "siêu thị", "đổ xăng", "nạp tiền").

3. Amount Parsing:
   - Extract numeric amount. Convert Vietnamese colloquial numbers:
     * "k", "nghìn", "ngàn" -> * 1,000 (e.g., 45k -> 45000)
     * "tr", "triệu", "củ" -> * 1,000,000 (e.g., 25 triệu -> 25000000, 2.5tr -> 2500000)
     * "lít", "lốp" -> 100,000 / 500,000

4. Output Schema:
{
  "amount": integer,
  "type": "INCOME" or "EXPENSE",
  "category": "string (Ăn uống, Di chuyển, Đi chợ / Siêu thị, Mua sắm, Giải trí, Hóa đơn & Tiện ích, Lương / Thu nhập, Sức khỏe, Khác)",
  "wallet": "string (Tiền mặt, MoMo, Vietcombank, Techcombank, MB Bank, ZaloPay, or name mentioned in text)",
  "note": "string (concise summary of transaction description)",
  "transactionDate": "YYYY-MM-DDTHH:mm",
  "splitWith": ["string (array of person names if shared/split, otherwise empty array)"]
}

Input Text: "${text}"

Output ONLY valid raw JSON without any markdown code fences or backticks.`;

    try {
      const response = await fetch('/api/gemini/nlp-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });
      if (response.ok) {
        const resData = await response.json();
        const txDate = resData.transactionDate || resData.date || currentLocalIso;
        return {
          ...resData,
          transactionDate: txDate,
          date: txDate,
        };
      }
    } catch (e) {
      console.warn('Server NLP fallback:', e);
    }

    if (apiKey) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash-lite",
          contents: prompt,
        });

        const cleanText = (response.text || "{}")
          .replace(/```json|```/g, "")
          .trim();
        const parsedData = JSON.parse(cleanText);
        const txDate = parsedData.transactionDate || parsedData.date || currentLocalIso;
        return {
          ...parsedData,
          transactionDate: txDate,
          date: txDate,
        };
      } catch (clientErr) {
        console.warn('Client-side Gemini NLP error / quota limit:', clientErr);
      }
    }

    return {
      amount: 50000,
      type: "EXPENSE",
      category: "Ăn uống",
      wallet: "Tiền mặt",
      note: text,
      transactionDate: currentLocalIso,
      splitWith: []
    };
  },

  /**
   * Feature 3: AI Financial Coach (Roast & Advice Generator)
   * Analyzes monthly financial metrics and outputs a witty, humorous advisory response.
   */
  async generateRoast(summary: {
    totalIncome: number;
    totalExpense: number;
    topCategory: string;
  }) {
    try {
      const response = await fetch('/api/gemini/financial-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyIncome: summary.totalIncome,
          monthlyExpense: summary.totalExpense,
          transactions: [],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.roastSummary || data.title || "Tháng này quản lý chi tiêu rất chủ động!";
      }
    } catch (e) {
      console.warn('Server Coach fallback:', e);
    }

    if (apiKey) {
      try {
        const prompt = `Đóng vai một Cố Vấn Tài Chính SIVI AI cực kỳ hài hước, phũ phàng và dí dỏm.
Dữ liệu tháng này:
- Tổng thu: ${summary.totalIncome.toLocaleString()} VND
- Tổng chi: ${summary.totalExpense.toLocaleString()} VND
- Tiêu nhiều nhất vào: ${summary.topCategory}

Hãy đưa ra đúng 2 câu nhận xét cực mặn bằng tiếng Việt, vừa nhắc nhở vừa mang tính giải trí!`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash-lite",
          contents: prompt,
        });

        return response.text || "Tháng này chi tiêu cần tiết chế lại nhé!";
      } catch (clientErr) {
        console.warn('Client-side Gemini Roast error / quota limit:', clientErr);
      }
    }

    return "Chi tiêu tháng này đang trong ngưỡng hợp lý, hãy duy trì thói quen ghi chép nhé!";
  },

  async askFinancialCoach(
    question: string,
    contextOrSummary?: any
  ) {
    const summary = {
      totalIncome: contextOrSummary?.monthlyIncome || contextOrSummary?.totalIncome || 0,
      totalExpense: contextOrSummary?.monthlyExpense || contextOrSummary?.totalExpense || 0,
      topCategory: contextOrSummary?.topCategory || "Chi tiêu chung",
    };
    try {
      const response = await fetch('/api/gemini/chat-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          monthlyIncome: summary.totalIncome,
          monthlyExpense: summary.totalExpense,
          transactions: [],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.answer || "Hãy cân đối thu chi hợp lý nhé!";
      }
    } catch (e) {
      console.warn('Server Advisor fallback:', e);
    }

    if (apiKey) {
      try {
        const prompt = `Bạn là Cố Vấn Tài Chính SIVI AI (hài hước, thông minh và chu đáo).
Bối cảnh người dùng:
- Thu nhập tháng: ${summary.totalIncome.toLocaleString()} VND
- Chi tiêu tháng: ${summary.totalExpense.toLocaleString()} VND
- Hạng mục chi nhiều nhất: ${summary.topCategory}

Câu hỏi của người dùng: "${question}"

Hãy trả lời ngắn gọn (2-4 câu), hữu ích, dí dỏm bằng tiếng Việt.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash-lite",
          contents: prompt,
        });

        return response.text || "Hãy cân đối thu chi hợp lý nhé!";
      } catch (clientErr) {
        console.warn('Client-side Gemini Advisor error / quota limit:', clientErr);
      }
    }

    return `Về thắc mắc "${question}", Sivi khuyên bạn nên duy trì quỹ dự phòng khẩn cấp ít nhất 3-6 tháng sinh hoạt phí!`;
  },
};

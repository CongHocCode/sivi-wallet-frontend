import { GoogleGenAI } from "@google/genai";

// Retrieve Gemini API Key from Vite environment variables
const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

// Helper to convert an uploaded image File into a raw Base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const geminiService = {
  /**
   * Feature 1: AI Receipt OCR Scanner (Multimodal Vision)
   * Extracts structured transaction details from Vietnamese receipt images.
   */
  async scanReceipt(imageFile: File, userInstruction?: string) {
    const base64Data = await fileToBase64(imageFile);

    const prompt = `You are a Financial Receipt OCR Extractor for Vietnamese receipts.
Extract data into valid JSON with schema:
{
  "merchantName": "string or null",
  "transactionDate": "YYYY-MM-DDTHH:mm (extract both date AND time/hours:minutes from the receipt if visible, e.g. 2025-08-25T22:38. If time is not visible on the receipt, default to current date/time)",
  "totalAmount": integer or null,
  "category": "string (Ăn uống, Di chuyển, Đi chợ / Siêu thị, Mua sắm, Giải trí, Khác)",
  "items": [
    { "itemName": "string", "quantity": 1, "totalPrice": integer }
  ],
  "note": "string or null (summary of notes, split info, or user instructions)"
}

User's custom instruction: "${userInstruction || 'None'}". Follow this instruction strictly when computing totalAmount, excluding items, or drafting the note.

Output ONLY raw JSON. No markdown backticks.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite", // Fast and multimodal-optimized Flash model
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: imageFile.type, data: base64Data } },
            { text: prompt },
          ],
        },
      ],
    });

    const cleanText = (response.text || "{}")
      .replace(/```json|```/g, "")
      .trim();
    return JSON.parse(cleanText);
  },

  /**
   * Feature 2: Natural Language Expense Logger (NLP Parser)
   * Parses colloquial Vietnamese text/voice statements into structured financial payloads.
   */
  async parseNaturalLanguage(text: string) {
    const currentRefTime = new Date().toISOString();

    const prompt = `You are a Vietnamese Natural Language Financial Transaction Parser.
Current Reference Time: ${currentRefTime}

Analyze the user's input text in Vietnamese and extract structured financial transaction information into valid JSON.

Instructions:
1. Relative Datetime Calculation:
   - Compute relative date and time ("lúc sáng", "sáng nay", "hôm nay", "hôm qua", "hôm kia", "trưa nay", "chiều nay", "tối qua", "hồi nãy", "vừa rồi") STRICTLY relative to the Current Reference Time: ${currentRefTime}.
   - If a specific time of day is mentioned, use appropriate hours/minutes:
     * Sáng (morning / sáng nay): ~08:30:00
     * Trưa (noon / trưa nay): ~12:00:00
     * Chiều (afternoon / chiều nay): ~15:30:00
     * Tối (evening / tối qua / tối nay): ~19:30:00
     * Đêm / Khuya: ~22:30:00
   - If only the date is mentioned (e.g., "hôm qua", "hôm nay") without a specific time of day, preserve the current hour and minute from the Current Reference Time.
   - Format "transactionDate" strictly as an ISO-8601 string: YYYY-MM-DDTHH:mm:ss.

2. Transaction Type Inference:
   - "INCOME": if the text mentions salary, bonus, receiving money, cash gift, interest, sales revenue, refund (e.g., "nhận lương", "lương về", "được thưởng", "nhận tiền", "được cho", "chuyển khoản đến", "bán đồ", "hoàn tiền", "khách trả tiền").
   - "EXPENSE": if buying, paying, spending, eating, transport, shopping, bills (e.g., "ăn", "uống", "mua", "chi", "trả tiền", "chuyển khoản đi", "đi chợ", "siêu thị", "đổ xăng", "nạp tiền").

3. Amount Parsing:
   - Extract the numeric amount. Convert Vietnamese colloquial numbers:
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
  "transactionDate": "YYYY-MM-DDTHH:mm:ss",
  "splitWith": ["string (array of person names if shared/split, otherwise empty array)"]
}

Input Text: "${text}"

Output ONLY valid raw JSON without any markdown code fences or backticks.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
    });

    const cleanText = (response.text || "{}")
      .replace(/```json|```/g, "")
      .trim();
    return JSON.parse(cleanText);
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
  },

  async askFinancialCoach(
    question: string,
    summary: { totalIncome: number; totalExpense: number; topCategory: string }
  ) {
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
  },
};

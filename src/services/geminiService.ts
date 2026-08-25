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
  async scanReceipt(imageFile: File) {
    const base64Data = await fileToBase64(imageFile);

    const prompt = `You are a Financial Receipt OCR Extractor for Vietnamese receipts.
Extract data into valid JSON with schema:
{
  "merchantName": "string or null",
  "transactionDate": "YYYY-MM-DD or null",
  "totalAmount": integer or null,
  "category": "string (Ăn uống, Di chuyển, Đi chợ / Siêu thị, Mua sắm, Giải trí, Khác)",
  "items": [
    { "itemName": "string", "quantity": 1, "totalPrice": integer }
  ]
}
Output ONLY raw JSON. No markdown backticks.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash", // Fast and multimodal-optimized Flash model
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
    const prompt = `You are a Vietnamese Natural Language Transaction Parser.
Parse this text into valid JSON:
Text: "${text}"

Schema:
{
  "amount": integer,
  "category": "string (Ăn uống, Di chuyển, Đi chợ / Siêu thị, Mua sắm, Giải trí, Khác)",
  "wallet": "string (Tiền mặt, MoMo, Bank)",
  "note": "string",
  "splitWith": ["string"]
}
Output ONLY raw JSON. No markdown backticks.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
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
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    return response.text || "Tháng này chi tiêu cần tiết chế lại nhé!";
  },
};

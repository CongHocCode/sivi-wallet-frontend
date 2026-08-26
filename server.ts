/**
 * SIVI WALLET - Full-Stack Express Server & Gemini AI Engine
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Initialize Google GenAI Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// --- API ROUTES ---

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'SIVI WALLET Express Backend', timestamp: new Date().toISOString() });
});

// 1. Gemini Receipt OCR (Vision)
app.post('/api/gemini/receipt-ocr', async (req, res) => {
  try {
    const { image } = req.body; // base64 string
    if (!image) {
      return res.status(400).json({ error: 'Hình ảnh hóa đơn không được để trống' });
    }

    // Strip header if present
    const cleanBase64 = image.includes('base64,') ? image.split('base64,')[1] : image;
    const mimeType = image.includes('data:image/png')
      ? 'image/png'
      : image.includes('data:image/webp')
        ? 'image/webp'
        : 'image/jpeg';

    const systemPrompt = `
You are an expert Vietnamese receipt scanner for SIVI WALLET.
Analyze the receipt image carefully and extract structured JSON matching the requested schema.
- Currency is strictly VND (Vietnamese Dong). Convert words like 'k' or 'ngàn' or 'triệu' to exact integer values (e.g., 45k -> 45000).
- Extract merchant name, total amount, date in ISO format, main category, payment method (Tiền mặt, MoMo, CK Ngân Hàng, etc.), and itemized list of products purchased.
- Output JSON strictly matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType,
            },
          },
          { text: 'Trích xuất thông tin hóa đơn này sang dạng JSON cấu trúc theo schema.' },
        ],
      },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchantName: { type: Type.STRING, description: 'Tên cửa hàng/nhà hàng' },
            totalAmount: { type: Type.NUMBER, description: 'Tổng tiền bằng VND (integer)' },
            transactionDate: { type: Type.STRING, description: 'Ngày hóa đơn dạng YYYY-MM-DD' },
            category: { type: Type.STRING, description: 'Danh mục chi tiêu chính (Ăn uống, Mua sắm, Hóa đơn...)' },
            paymentMethod: { type: Type.STRING, description: 'Phương thức thanh toán' },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: 'Tên món/sản phẩm' },
                  price: { type: Type.NUMBER, description: 'Đơn giá hoặc thành tiền bằng VND' },
                  quantity: { type: Type.NUMBER, description: 'Số lượng' },
                },
                required: ['name', 'price'],
              },
            },
            rawNotes: { type: Type.STRING, description: 'Ghi chú thêm nếu có' },
          },
          required: ['merchantName', 'totalAmount', 'category', 'items'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);
    res.json(parsed);
  } catch (error: any) {
    console.error('Gemini Receipt OCR Error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi quét hóa đơn bằng AI' });
  }
});

// 2. Gemini Natural Language Transaction Logger (Vietnamese NLP)
app.post('/api/gemini/nlp-transaction', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Nội dung nhập liệu không được để trống' });
    }

    const systemInstruction = `
Bạn là trợ lý tài chính AI thông minh cho ứng dụng SIVI WALLET tại Việt Nam.
Nhiệm vụ của bạn là phân tích câu nói/văn bản tiếng Việt của người dùng và trích xuất thành JSON giao dịch tài chính chuẩn.

Quy tắc chuyển đổi số tiền tiếng Việt:
- "45k", "45 ngàn", "45 nghìn" -> 45000
- "1.5tr", "1 tr rưỡi", "1 triệu 5" -> 1500000
- "200" (nếu nói trong ngữ cảnh ăn uống/xe cộ) -> 200000 (hoặc 200k nếu logic phù hợp, 200k là mặc định phổ biến tại VN)

Xác định TransactionType:
- EXPENSE: khi chi tiêu, ăn uống, mua sắm, trả tiền
- INCOME: khi nhận lương, thưởng, thu tiền, được cho
- TRANSFER: khi chuyển tiền từ ví này sang ví khác
- SETTLEMENT: khi trả nợ hoặc nhận tiền trả nợ nhóm

Xác định Category:
- Ăn uống, Đi lại & Xe cộ, Mua sắm, Hóa đơn & Tiện ích, Giải trí & Du lịch, Sức khỏe & Y tế, Lương & Thu nhập, Thưởng & Đầu tư, Chuyển khoản, Thanh toán nợ nhóm.

Xác định Ví (walletName):
- Tiền mặt, Vietcombank, Ví MoMo, Techcombank, ZaloPay (Mặc định: Ví MoMo hoặc Tiền mặt nếu không đề cập).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              description: 'Chi tiêu (EXPENSE), Thu nhập (INCOME), Chuyển khoản (TRANSFER), Trả nợ (SETTLEMENT)',
            },
            amount: { type: Type.NUMBER, description: 'Số tiền bằng VND (integer)' },
            note: { type: Type.STRING, description: 'Ghi chú nội dung giao dịch' },
            category: { type: Type.STRING, description: 'Danh mục phù hợp nhất' },
            walletName: { type: Type.STRING, description: 'Ví sử dụng (Tiền mặt, Vietcombank, Ví MoMo...)' },
            date: { type: Type.STRING, description: 'Thời gian giao dịch ISO YYYY-MM-DD' },
            targetPerson: { type: Type.STRING, description: 'Tên người liên quan nếu có (ví dụ Nam, Hùng)' },
            isGroupBill: { type: Type.BOOLEAN, description: 'Có phải kèo chia tiền nhóm không' },
          },
          required: ['type', 'amount', 'note', 'category', 'walletName'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);
    res.json(parsed);
  } catch (error: any) {
    console.error('Gemini NLP Transaction Error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi phân tích câu nói bằng AI' });
  }
});

// 3. Gemini AI Financial Coach ("Financial Roast")
app.post('/api/gemini/financial-coach', async (req, res) => {
  try {
    const { monthlyIncome, monthlyExpense, transactions } = req.body;

    const summaryData = {
      monthlyIncome: monthlyIncome || 0,
      monthlyExpense: monthlyExpense || 0,
      netSavings: (monthlyIncome || 0) - (monthlyExpense || 0),
      transactionCount: transactions?.length || 0,
      topTransactions: (transactions || []).slice(0, 8).map((t: any) => ({
        note: t.note,
        amount: t.amount,
        category: t.categoryName,
        type: t.type,
      })),
    };

    const systemInstruction = `
Bạn là "Cố Vấn Sivi" - AI tư vấn tài chính hài hước, mặn mà, hóm hỉnh và cực kỳ am hiểu văn hóa chi tiêu giới trẻ Việt Nam (Gen Z, Millennial, dân văn phòng).
Hãy phân tích dữ liệu thu chi tháng này của người dùng và cho bài đánh giá "Financial Roast" hóm hỉnh nhưng cực kỳ bổ ích.

Yêu cầu output JSON:
- title: Tiêu đề giật gân, hài hước (Ví dụ: "Cảnh báo: Ví MoMo đang khóc thét!", "Cao thủ tiết kiệm hay thần tài bao chầu?")
- roastSummary: Đoạn văn hài hước 3-4 câu nhận xét trực diện thói quen tiêu xài. Dùng từ ngữ tự nhiên, dí dỏm tiếng Việt.
- score: Điểm sức khỏe tài chính từ 0 đến 100.
- mood: "ROAST" (nếu chi lố tay), "PRAISE" (nếu quản lý tốt), "WARNING" (nếu ngấp nghé vỡ nợ).
- actionableTips: Danh sách 3 lời khuyên tài chính thực tế, dễ áp dụng.
- categoryAlerts: Danh sách các danh mục tốn tiền nhất kèm câu phán hài hước.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: JSON.stringify(summaryData),
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            roastSummary: { type: Type.STRING },
            score: { type: Type.NUMBER },
            mood: { type: Type.STRING, description: 'ROAST, PRAISE, hoặc WARNING' },
            actionableTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            categoryAlerts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  text: { type: Type.STRING },
                },
                required: ['category', 'text'],
              },
            },
          },
          required: ['title', 'roastSummary', 'score', 'mood', 'actionableTips', 'categoryAlerts'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);
    res.json(parsed);
  } catch (error: any) {
    console.error('Gemini Financial Coach Error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi tạo nhận xét tài chính' });
  }
});

// 4. Gemini AI Chat Advisor (Interactive Q&A)
app.post('/api/gemini/chat-advisor', async (req, res) => {
  try {
    const { question, monthlyIncome, monthlyExpense, transactions } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Câu hỏi không được để trống' });
    }

    const summaryContext = {
      monthlyIncome: monthlyIncome || 0,
      monthlyExpense: monthlyExpense || 0,
      recentCount: transactions?.length || 0,
    };

    const systemInstruction = `
Bạn là "Cố Vấn Sivi AI" - trợ lý tài chính thông minh, hóm hỉnh và chân thành của SIVI WALLET.
Bối cảnh tài chính của người dùng: Thu nhập tháng ~${summaryContext.monthlyIncome.toLocaleString('vi-VN')}đ, Chi tiêu tháng ~${summaryContext.monthlyExpense.toLocaleString('vi-VN')}đ.
Trả lời câu hỏi của người dùng bằng tiếng Việt tự nhiên, thân thiện, súc tích (khoảng 2-4 câu hoặc gạch đầu dòng ngắn gọn), ngắn gọn dễ hiểu, có xút hóm hỉnh phù hợp giới trẻ nhưng đem lại giá trị tài chính thực tế.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: `Câu hỏi người dùng: "${question}"`,
      config: {
        systemInstruction,
      },
    });

    const answer = response.text || 'Sivi chưa nghĩ ra câu trả lời cho câu này, bạn hỏi lại nhé!';
    res.json({ answer });
  } catch (error: any) {
    console.error('Gemini Chat Advisor Error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi kết nối với Cố vấn Sivi' });
  }
});

// --- VITE MIDDLEWARE SETUP ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SIVI WALLET Backend Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

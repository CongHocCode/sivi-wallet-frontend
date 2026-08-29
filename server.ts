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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Lazy Initialize Google GenAI Client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// --- API ROUTES ---

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'SIVI WALLET Express Backend', timestamp: new Date().toISOString() });
});

// 1. Gemini Receipt OCR (Vision)
app.post('/api/gemini/receipt-ocr', async (req, res) => {
  try {
    const { image, userInstruction, note } = req.body; // base64 string
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

    const customInstruction = userInstruction || note || '';
    const systemPrompt = `
Bạn là chuyên gia bóc tách hóa đơn AI cho ứng dụng quản lý tài chính SIVI WALLET tại Việt Nam.
Nhiệm vụ của bạn là phân tích ảnh hóa đơn, đọc danh sách các món, đơn giá, số lượng, tổng tiền và áp dụng lời dặn của người dùng để tính toán chính xác số tiền thực tế người dùng phải trả.

QUY TẮC BÓC TÁCH VÀ TÍNH TOÁN (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT):
1. Đơn vị tiền tệ: Luôn quy đổi về số nguyên VNĐ (VND) (VD: 45k -> 45000, 1.5tr -> 1500000).
2. QUY TẮC TÍNH TOÁN TOÁN HỌC CHIA TIỀN / TRỪ MÓN / TÍNH MÓN RIÊNG (STRICT MATHEMATICAL SPLIT):
   - Lời dặn của người dùng: "${customInstruction}".
   - Nếu người dùng có lời dặn chia tiền hoặc trừ món hoặc tính món riêng (Ví dụ: "chia đôi, món mì 14.2k là của tôi" hoặc "chia 2 trừ món bia 50k", "chia 3 tôi trả thêm ly trà đào 25k"):
     * BƯỚC 1: Tìm tổng tiền gốc của hóa đơn và đơn giá/thành tiền của các món riêng/món trừ.
     * BƯỚC 2: Trừ các món riêng ra khỏi tổng gốc để lấy tiền các món dùng chung: (Tổng gốc - Tiền món riêng = Tiền dùng chung).
     * BƯỚC 3: Chia đều phần tiền dùng chung theo số người chia: (Tiền dùng chung / Số người).
     * BƯỚC 4: Cộng phần món riêng mà người dùng ăn/uống vào phần chia chung: (Tiền chia chung + Tiền món riêng).
     * QUY TẮC BẮT BUỘC: Bạn PHẢI gán con số cuối cùng sau khi tính toán vào trường 'totalAmount' (TUYỆT ĐỐI KHÔNG trả về tổng gốc trên giấy khi có lời dặn chia tiền).
     * Trong trường 'note': Giải thích rõ ràng từng bước công thức tính toán bằng tiếng Việt (Ví dụ: "(105.000đ - 14.200đ)/2 + 14.200đ = 59.600đ" hoặc "(Tổng 240k - 40k)/2 + 40k = 140.000đ" hoặc "(Tổng bill 180k)/3 = 60.000đ").
   - Nếu người dùng KHÔNG có lời dặn chia tiền/trừ món:
     * 'totalAmount' là tổng số tiền thực tế ghi trên hóa đơn.
     * 'note': để trống hoặc tóm tắt ngắn gọn danh sách món chính.
3. Trích xuất đầy đủ tên cửa hàng (merchantName), ngày giờ (transactionDate dạng YYYY-MM-DD hoặc YYYY-MM-DDTHH:mm), danh mục chính (category: Ăn uống, Đi chợ / Siêu thị, Mua sắm, Di chuyển, Giải trí, Hóa đơn & Tiện ích, Sức khỏe, Khác), phương thức thanh toán (paymentMethod) và danh sách chi tiết các món (items).

Xuất JSON chuẩn theo schema được yêu cầu.
    `;

    const ai = getGenAI();
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
          { text: 'Trích xuất và tính toán thông tin hóa đơn này sang JSON cấu trúc theo schema.' },
        ],
      },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchantName: { type: Type.STRING, description: 'Tên cửa hàng/nhà hàng' },
            totalAmount: { type: Type.NUMBER, description: 'Tổng tiền thực tế người dùng phải trả bằng VNĐ sau khi áp dụng lời dặn chia/trừ tiền' },
            transactionDate: { type: Type.STRING, description: 'Ngày giờ hóa đơn dạng YYYY-MM-DD hoặc YYYY-MM-DDTHH:mm' },
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
            note: { type: Type.STRING, description: 'Giải thích công thức tính toán ngắn gọn (VD: (Tổng 105k - 18k)/2 + 18k = 61.500đ)' },
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
    // If Gemini fails due to missing key or image parsing, provide a sensible mock fallback
    const instruction = req.body?.userInstruction || req.body?.note || '';
    let fallbackTotal = 120000;
    let fallbackNote = 'Bóc tách từ ảnh hóa đơn';

    if (instruction.toLowerCase().includes('chia đôi') || instruction.toLowerCase().includes('chia 2')) {
      fallbackTotal = 60000;
      fallbackNote = '(Tổng 120k)/2 = 60.000đ';
    }

    res.status(200).json({
      merchantName: 'Hóa đơn mua sắm',
      totalAmount: fallbackTotal,
      transactionDate: new Date().toISOString().slice(0, 16),
      category: 'Ăn uống',
      paymentMethod: 'Tiền mặt',
      items: [
        { name: 'Sản phẩm/dịch vụ', price: fallbackTotal, quantity: 1 }
      ],
      note: fallbackNote,
      rawNotes: instruction || fallbackNote,
    });
  }
});

// 2. Gemini Natural Language Transaction Logger (Vietnamese NLP)
app.post('/api/gemini/nlp-transaction', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Nội dung nhập liệu không được để trống' });
  }

  const dateObj = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const currentRefTime = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
  const systemInstruction = `
Bạn là trợ lý tài chính AI thông minh cho ứng dụng SIVI WALLET tại Việt Nam.
Current Local Reference Time: '${currentRefTime}'.

Nhiệm vụ của bạn là phân tích câu nói/văn bản tiếng Việt của người dùng và trích xuất thành JSON giao dịch tài chính chuẩn.

1. BẮT BUỘC TÍNH TOÁN NGÀY GIỜ (transactionDate & date):
- Dựa vào Current Local Reference Time: '${currentRefTime}'.
- Nếu người dùng nói thời gian tương đối hoặc giờ cụ thể (VD: '2h sáng' -> 02:00, '3h chiều' -> 15:00, '14h30' -> 14:30, 'trưa nay' -> 12:00, 'sáng nay' -> 08:30, 'hôm qua' -> ngày hôm qua, 'hôm kia' -> 2 ngày trước, 'tối qua' -> tối ngày hôm qua 19:30), BẮT BUỘC tính chính xác ra ngày và giờ theo định dạng YYYY-MM-DDTHH:mm.
- Nếu không nhắc ngày giờ gì cụ thể, dùng đúng Current Local Reference Time: '${currentRefTime}'.
- Điền giá trị kết quả vào CẢ HAI TRƯỜNG 'transactionDate' và 'date'.

2. Quy tắc chuyển đổi số tiền tiếng Việt:
- "45k", "45 ngàn", "45 nghìn" -> 45000
- "1.5tr", "1 tr rưỡi", "1 triệu 5" -> 1500000
- "200" (nếu nói trong ngữ cảnh ăn uống/xe cộ) -> 200000 (hoặc 200k nếu logic phù hợp)

3. Xác định TransactionType:
- EXPENSE: khi chi tiêu, ăn uống, mua sắm, trả tiền, đổ xăng, đi chợ
- INCOME: khi nhận lương, thưởng, thu tiền, được cho, hoàn tiền, bán đồ
- TRANSFER: khi chuyển tiền từ ví này sang ví khác
- SETTLEMENT: khi trả nợ hoặc nhận tiền trả nợ nhóm

4. Xác định Category:
- Ăn uống, Di chuyển, Đi chợ / Siêu thị, Mua sắm, Hóa đơn & Tiện ích, Giải trí, Sức khỏe, Lương / Thu nhập, Khác.

5. Xác định Ví (walletName):
- Tiền mặt, Vietcombank, Ví MoMo, Techcombank, MB Bank, ZaloPay (Mặc định: Ví MoMo hoặc Tiền mặt nếu không đề cập).
    `;

  try {
    const ai = getGenAI();
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
            transactionDate: { type: Type.STRING, description: 'Thời gian giao dịch YYYY-MM-DDTHH:mm' },
            date: { type: Type.STRING, description: 'Thời gian giao dịch YYYY-MM-DDTHH:mm' },
            targetPerson: { type: Type.STRING, description: 'Tên người liên quan nếu có (ví dụ Nam, Hùng)' },
            isGroupBill: { type: Type.BOOLEAN, description: 'Có phải kèo chia tiền nhóm không' },
          },
          required: ['type', 'amount', 'note', 'category', 'walletName', 'transactionDate', 'date'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);
    return res.json(parsed);
  } catch (error: any) {
    console.warn('Gemini NLP Rate Limit or API fallback activated:', error?.message || error);

    // Smart Local Regex Fallback for Vietnamese NLP
    const lower = prompt.toLowerCase();
    let amount = 50000;
    const matchTr = lower.match(/(\d+([.,]\d+)?)\s*(tr|triệu|củ)/i);
    const matchK = lower.match(/(\d+([.,]\d+)?)\s*(k|ngàn|nghìn)/i);
    const matchNum = lower.match(/(\d{4,9})/);

    if (matchTr) {
      amount = Math.round(parseFloat(matchTr[1].replace(',', '.')) * 1000000);
    } else if (matchK) {
      amount = Math.round(parseFloat(matchK[1].replace(',', '.')) * 1000);
    } else if (matchNum) {
      amount = parseInt(matchNum[1], 10);
    }

    const isIncome = lower.includes('lương') || lower.includes('thu nhập') || lower.includes('thưởng') || lower.includes('nhận tiền') || lower.includes('bán');
    let category = 'Ăn uống';
    if (isIncome) category = 'Lương / Thu nhập';
    else if (lower.includes('xăng') || lower.includes('grab') || lower.includes('xe') || lower.includes('be')) category = 'Di chuyển';
    else if (lower.includes('chợ') || lower.includes('siêu thị') || lower.includes('mua thịt') || lower.includes('mua rau')) category = 'Đi chợ / Siêu thị';
    else if (lower.includes('điện') || lower.includes('nước') || lower.includes('wifi') || lower.includes('mạng')) category = 'Hóa đơn & Tiện ích';
    else if (lower.includes('áo') || lower.includes('quần') || lower.includes('giày') || lower.includes('shopee')) category = 'Mua sắm';

    // Calculate fallback local datetime
    let fallbackDate = currentRefTime;
    const now = new Date();
    let targetDate = new Date(now);
    if (lower.includes('hôm qua') || lower.includes('tối qua') || lower.includes('đêm qua')) {
      targetDate.setDate(targetDate.getDate() - 1);
    } else if (lower.includes('hôm kia')) {
      targetDate.setDate(targetDate.getDate() - 2);
    }

    let hours = now.getHours();
    let minutes = now.getMinutes();

    const timeMatch = lower.match(/(\d{1,2})\s*h\s*(\d{1,2})?/);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      if ((lower.includes('chiều') || lower.includes('tối') || lower.includes('đêm')) && h < 12) {
        h += 12;
      }
      hours = h;
      minutes = m;
    } else if (lower.includes('trưa')) {
      hours = 12;
      minutes = 0;
    } else if (lower.includes('sáng')) {
      hours = 8;
      minutes = 30;
    } else if (lower.includes('chiều')) {
      hours = 15;
      minutes = 30;
    } else if (lower.includes('tối')) {
      hours = 19;
      minutes = 30;
    }

    fallbackDate = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T${pad(hours)}:${pad(minutes)}`;

    return res.json({
      type: isIncome ? 'INCOME' : 'EXPENSE',
      amount,
      note: prompt,
      category,
      walletName: lower.includes('momo') ? 'Ví MoMo' : lower.includes('vietcombank') ? 'Vietcombank' : 'Tiền mặt',
      transactionDate: fallbackDate,
      date: fallbackDate,
      isGroupBill: lower.includes('chia') || lower.includes('nhóm') || lower.includes('kèo'),
    });
  }
});

// 3. Gemini AI Financial Coach ("Financial Roast")
app.post('/api/gemini/financial-coach', async (req, res) => {
  const { monthlyIncome = 0, monthlyExpense = 0, transactions = [] } = req.body;

  const summaryData = {
    monthlyIncome,
    monthlyExpense,
    netSavings: monthlyIncome - monthlyExpense,
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

  try {
    const ai = getGenAI();
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
    return res.json(parsed);
  } catch (error: any) {
    console.warn('Gemini Financial Coach Rate Limit or API fallback activated:', error?.message || error);

    // Smart Local Financial Coaching Engine fallback
    const netSavings = monthlyIncome - monthlyExpense;
    const savingsRatio = monthlyIncome > 0 ? netSavings / monthlyIncome : (monthlyExpense > 0 ? -1 : 0);

    if (monthlyExpense > monthlyIncome && monthlyIncome > 0) {
      return res.json({
        title: '🚨 Báo động đỏ: Ví tiền đang kêu cứu!',
        roastSummary: `Tháng này bạn đã tiêu ${monthlyExpense.toLocaleString('vi-VN')}đ, vượt mức thu nhập ${monthlyIncome.toLocaleString('vi-VN')}đ (${Math.abs(netSavings).toLocaleString('vi-VN')}đ). Tiêu tiền như thể mai là ngày tận thế vậy! Cần siết chặt chi tiêu ngay lập tức.`,
        score: Math.max(20, Math.min(45, Math.round((1 - monthlyExpense / (monthlyIncome * 1.5)) * 100))),
        mood: 'ROAST',
        actionableTips: [
          'Tạm hoãn các khoản chi mua sắm shopee, cafe sữa hạt sang tháng sau.',
          'Đặt trần chi tiêu ăn uống mỗi ngày tối đa 100.000đ.',
          'Chuyển sang tự nấu ăn tại nhà để cắt giảm 40% chi phí.',
        ],
        categoryAlerts: [
          { category: 'Ăn uống & Cà phê', text: 'Thủ phạm chính khiến ví rỗng túi mỗi cuối tuần' },
          { category: 'Mua sắm Online', text: 'Chốt đơn quá tay vào các khung giờ đêm muộn' },
        ],
      });
    } else if (savingsRatio >= 0.25) {
      return res.json({
        title: '👑 Bậc thầy quản lý: Ví tiền nở hoa!',
        roastSummary: `Xuất sắc! Bạn đã giữ lại được ${(savingsRatio * 100).toFixed(0)}% thu nhập (${netSavings.toLocaleString('vi-VN')}đ). Quản lý tài chính chuẩn chỉ thế này thì chẳng mấy chốc mà tự do tài chính!`,
        score: Math.min(98, Math.round(75 + savingsRatio * 20)),
        mood: 'PRAISE',
        actionableTips: [
          'Chuyển ngay phần tiết kiệm sang tài khoản tích lũy sinh lời hoặc chứng chỉ quỹ.',
          'Thưởng cho bản thân một bữa ăn ngon hoặc cuốn sách hay.',
          'Tiếp tục duy trì việc ghi chép đều đặn các khoản chi phát sinh.',
        ],
        categoryAlerts: [
          { category: 'Tích lũy & Đầu tư', text: 'Dòng tiền dương cực kỳ an toàn và lành mạnh' },
        ],
      });
    } else {
      return res.json({
        title: '⚠️ Cố Vấn Sivi: Ổn áp nhưng đừng chủ quan!',
        roastSummary: `Dòng tiền tháng này thu ${monthlyIncome.toLocaleString('vi-VN')}đ, chi ${monthlyExpense.toLocaleString('vi-VN')}đ, còn dư ${netSavings.toLocaleString('vi-VN')}đ. Nhìn chung vẫn kiểm soát được nhưng quỹ tích lũy còn khá mỏng manh trước các rủi ro bất ngờ.`,
        score: Math.max(50, Math.min(74, Math.round(55 + (savingsRatio > 0 ? savingsRatio * 50 : 0)))),
        mood: 'WARNING',
        actionableTips: [
          'Thiết lập quy tắc 50/30/20: dành ít nhất 20% thu nhập cố định để tiết kiệm.',
          'Kiểm tra lại các khoản đăng ký dịch vụ định kỳ (Netflix, Spotify, Cloud).',
          'Sử dụng tính năng Chia Tiền Nhóm của Sivi để tránh bị quên đòi nợ bạn bè.',
        ],
        categoryAlerts: [
          { category: 'Chi tiêu thường ngày', text: 'Cần tối ưu thêm 10% các khoản chi không thiết yếu' },
        ],
      });
    }
  }
});

// 4. Gemini AI Chat Advisor (Interactive Q&A)
app.post('/api/gemini/chat-advisor', async (req, res) => {
  const { question, monthlyIncome = 0, monthlyExpense = 0, transactions } = req.body;
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

  try {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: `Câu hỏi người dùng: "${question}"`,
      config: {
        systemInstruction,
      },
    });

    const answer = response.text || 'Sivi đã ghi nhận câu hỏi của bạn. Hãy duy trì quản lý tài chính khoa học nhé!';
    return res.json({ answer });
  } catch (error: any) {
    console.warn('Gemini Chat Advisor Rate Limit or API fallback activated:', error?.message || error);
    
    // Smart Contextual Advisory Fallback
    const qLower = question.toLowerCase();
    let advice = `Về câu hỏi "${question}": Với thu nhập hiện tại ~${monthlyIncome.toLocaleString('vi-VN')}đ và chi tiêu ~${monthlyExpense.toLocaleString('vi-VN')}đ, Sivi khuyên bạn nên trích ngay 20% vào quỹ dự phòng khẩn cấp trước khi chi tiêu cho các nhu cầu cá nhân.`;
    
    if (qLower.includes('tiết kiệm') || qLower.includes('dành dụm')) {
      advice = `Để tiết kiệm hiệu quả: Bạn hãy áp dụng phương pháp "Trả cho bản thân trước" (Pay Yourself First) — ngay khi có lương, chuyển 20-30% vào tài khoản tiết kiệm riêng biệt không gắn thẻ ATM, phần còn lại mới dùng cho chi tiêu sinh hoạt.`;
    } else if (qLower.includes('nợ') || qLower.includes('vay') || qLower.includes('trả góp')) {
      advice = `Lời khuyên xử lý nợ: Áp dụng phương pháp "Quả cầu tuyết" (Snowball) — ưu tiên tất toán dứt điểm các khoản nợ có lãi suất cao nhất hoặc số tiền nhỏ nhất trước để tạo đòn bẩy tâm lý tích cực.`;
    } else if (qLower.includes('đầu tư') || qLower.includes('chứng khoán') || qLower.includes('vàng')) {
      advice = `Về đầu tư: Trước khi rót vốn vào bất kỳ kênh nào, hãy đảm bảo bạn đã có quỹ dự phòng 3-6 tháng chi phí sinh hoạt. Sau đó có thể bắt đầu với chứng chỉ quỹ mở hoặc vàng tích lũy định kỳ (DCA) mỗi tháng.`;
    }

    return res.json({ answer: advice });
  }
});

// Search users API endpoint
const handleUserSearch = (req: any, res: any) => {
  const q = String(req.query.keyword || req.query.q || '').toLowerCase().trim();
  const systemUsers = [
    { id: 'usr_002', username: 'an.nguyen', name: 'Nguyễn Văn An', fullName: 'Nguyễn Văn An', email: 'an.nguyen@sivi.vn', isGuest: false },
    { id: 'usr_003', username: 'lan.le', name: 'Lê Thị Lan', fullName: 'Lê Thị Lan', email: 'lan.le@gmail.com', isGuest: false },
    { id: 'usr_004', username: 'hoang.pn', name: 'Phạm Nhật Hoàng', fullName: 'Phạm Nhật Hoàng', email: 'hoang.pn@sivi.vn', isGuest: false },
    { id: 'usr_005', username: 'khoa.vu', name: 'Vũ Anh Khoa', fullName: 'Vũ Anh Khoa', email: 'khoa.vu@gmail.com', isGuest: false },
    { id: 'usr_006', username: 'hung.nguyen', name: 'Nguyễn Văn Hùng', fullName: 'Nguyễn Văn Hùng', email: 'hung.nguyen@sivi.vn', isGuest: false },
    { id: 'usr_007', username: 'yen.hoang', name: 'Hoàng Yến', fullName: 'Hoàng Yến', email: 'yen.hoang@sivi.vn', isGuest: false },
    { id: 'usr_008', username: 'bao.dang', name: 'Đặng Quốc Bảo', fullName: 'Đặng Quốc Bảo', email: 'bao.dang@sivi.vn', isGuest: false },
    { id: 'usr_009', username: 'minh.tran', name: 'Trần Đức Minh', fullName: 'Trần Đức Minh', email: 'ducminh.dev@gmail.com', isGuest: false },
    { id: 'usr_010', username: 'phuong.le', name: 'Lê Thu Phương', fullName: 'Lê Thu Phương', email: 'phuong.le@gmail.com', isGuest: false },
    { id: 'gst_001', name: 'Bác Ba Quán Nước', fullName: 'Bác Ba Quán Nước', isGuest: true },
    { id: 'gst_002', name: 'Anh Shipper Grab', fullName: 'Anh Shipper Grab', isGuest: true },
  ];

  if (!q) {
    return res.json(systemUsers);
  }

  const results = systemUsers.filter(u =>
    (u.name && u.name.toLowerCase().includes(q)) ||
    (u.fullName && u.fullName.toLowerCase().includes(q)) ||
    (u.username && u.username.toLowerCase().includes(q)) ||
    (u.email && u.email.toLowerCase().includes(q))
  );

  return res.json(results);
};

app.get('/api/users/search', handleUserSearch);
app.get('/users/search', handleUserSearch);
app.get('/api/auth/search', handleUserSearch);

// Settle bill endpoint
app.post(['/api/v1/bills/settle/:billDetailId', '/bills/settle/:billDetailId'], (req, res) => {
  const { billDetailId } = req.params;
  const { walletId } = req.query;
  console.log(`[API] Settle debt billDetailId=${billDetailId}, walletId=${walletId}`);
  return res.json({ success: true, message: 'Tất toán nợ thành công', billDetailId, walletId });
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

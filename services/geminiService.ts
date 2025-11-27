import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// Initialize safely, even if key is missing initially (handled in UI)
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const generateSeatAnnouncement = async (studentName: string, seatNumber: number): Promise<string> => {
  if (!ai) return `축하해요 ${studentName} 학생! ${seatNumber}번 자리에 앉게 되었어요!`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a witty, energetic, and fun Korean variety show MC (like Yoo Jae-suk).
      A student named "${studentName}" just completed a physical mission to earn a new seat.
      They have been assigned to Seat Number ${seatNumber}.
      Write a ONE sentence comment in Korean that is natural, funny, and encouraging.
      Avoid robotic phrasing like "You have been assigned...".
      Instead, use phrases like "오! ${seatNumber}번이라니!", "명당인가요?", "운명입니다!"
      Use emojis.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });
    return response.text || `와우! ${studentName} 학생, ${seatNumber}번 당첨! 정말 멋진 자리네요!`;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `대박! ${studentName} 학생이 ${seatNumber}번 자리를 차지했습니다!`;
  }
};
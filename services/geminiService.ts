
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

export const controlTools: FunctionDeclaration[] = [
  {
    name: 'toggle_flashlight',
    parameters: {
      type: Type.OBJECT,
      description: 'ফোনের ফ্ল্যাশলাইট বা টর্চ জ্বালানো বা নেভানো।',
      properties: {
        state: {
          type: Type.STRING,
          description: "টর্চ কি 'on' নাকি 'off' করতে হবে।",
          enum: ['on', 'off']
        }
      },
      required: ['state']
    }
  },
  {
    name: 'vibrate_device',
    parameters: {
      type: Type.OBJECT,
      description: 'ফোনটিকে ভাইব্রেট করানো।',
      properties: {
        duration: {
          type: Type.NUMBER,
          description: 'কত মিলি-সেকেন্ড ভাইব্রেট করবে (ডিফল্ট ৫০০)।'
        }
      }
    }
  },
  {
    name: 'check_battery',
    parameters: {
      type: Type.OBJECT,
      description: 'ফোনের বর্তমান ব্যাটারি পার্সেন্টেজ চেক করা।',
      properties: {}
    }
  },
  {
    name: 'open_app',
    parameters: {
      type: Type.OBJECT,
      description: 'অন্যান্য অ্যাপ যেমন WhatsApp, Facebook, YouTube, বা Settings খোলা।',
      properties: {
        app_name: {
          type: Type.STRING,
          description: 'অ্যাপের নাম (whatsapp, facebook, youtube, calculator, settings, dialer, camera)।'
        }
      },
      required: ['app_name']
    }
  },
  {
    name: 'get_location',
    parameters: {
      type: Type.OBJECT,
      description: 'ব্যবহারকারীর বর্তমান অবস্থান বা লোকেশন জানা।',
      properties: {}
    }
  }
];

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async askAssistant(prompt: string): Promise<any> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          systemInstruction: `তুমি একজন 'স্মার্ট অ্যাসিস্ট্যান্ট' (Smart Assistant)। তোমার কাজ হলো ব্যবহারকারীকে তার ফোনের বিভিন্ন ফিচার কন্ট্রোল করতে সাহায্য করা এবং প্রশ্নের উত্তর দেওয়া।
          - তোমার নাম 'অ্যাসিস্ট্যান্ট'।
          - যদি ব্যবহারকারী টর্চ জ্বালানো, ভাইব্রেট করা, ব্যাটারি চেক করা বা কোনো অ্যাপ খোলার কথা বলে, তবে সংশ্লিষ্ট ফাংশন কল করো।
          - তুমি সবসময় বাংলা ভাষায় উত্তর দেবে।
          - ব্যবহারকারীর সাথে সম্মানসূচকভাবে কথা বলবে।
          - যদি কোনো তথ্য ইন্টারনেটে খুঁজতে হয় তবে Google Search ব্যবহার করো।`,
          tools: [{ functionDeclarations: controlTools }, { googleSearch: {} }],
          temperature: 0.7,
        },
      });

      return response;
    } catch (error) {
      console.error("Assistant AI Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();

import { GoogleGenAI, Type } from "@google/genai";
import { Entry } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface ClassifiedInput {
  type: 'note' | 'task' | 'request';
  content: string;
  title?: string;
  status?: 'pending' | 'working' | 'done';
  tags?: string[];
}

export interface ChatResponse {
  reply: string;
  action?: {
    type: 'note' | 'task' | 'none';
    title?: string;
    content?: string;
  }
}

export const defaultVoiceInstructions = `Voice Profile: Female, 18-25, Mezzo-soprano.
Tone: Sultry, playfully teasing, breathy, confidently alluring. Smooth, warm, intimate.
Pacing: Unhurried (115 wpm), drawn-out vowels, frequent teasing pauses.
Style Rules:
- Use ellipses (...) generously for drawn-out pacing.
- Include actions like [soft laugh], [whispered], or [teasing lilt].
- Avoid exclamation marks; use periods or ellipses for a slow-burn effect.
- Use lowercase styling on non-proper nouns for a laid-back, intimate feel.`;

export async function chatWithGemini(
  history: { role: 'user' | 'model' | 'system', content: string }[], 
  newMessage: string,
  contextEntries: Entry[] = [],
  customVoiceInstructions?: string
): Promise<ChatResponse> {
  try {
    const notes = contextEntries.filter(e => e.type === 'note' || e.type === 'transcript').map(e => `- ${e.title || 'Untitled'}: ${e.content}`).join('\n');
    const tasks = contextEntries.filter(e => e.type === 'task').map(e => `- [${e.status}] ${e.title || 'Untitled'}: ${e.content}`).join('\n');

    const activeVoiceInstructions = customVoiceInstructions || defaultVoiceInstructions;

    const systemInstruction = `You are a Second Brain assistant. The user is chatting with you. You can answer questions, discuss ideas, or help manage their life. IMPORTANT: DO NOT create a task or a note unless the user explicitly requests it. If there is no clear request to store information, set the action type to 'none'. Do not create empty or 'untitled' notes/tasks. At the end of your reply, you may ask the user if they want to create a note or task based on the conversation, but only if it makes sense. If the user says no, do not create anything.
    
You must adopt the following persona and voice profile for your responses:
${activeVoiceInstructions}

Here is the user's current stored knowledge (Notes, Transcripts, and Tasks) that you should use to answer questions and provide context:

--- USER NOTES & TRANSCRIPTS ---
${notes}

--- USER TASKS ---
${tasks}
`;

    const contents = history.filter(m => m.role !== 'system').map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));
    
    contents.push({
      role: 'user',
      parts: [{ text: newMessage }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING, description: "Your conversational reply to the user." },
            action: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["note", "task", "none"] },
                title: { type: Type.STRING },
                content: { type: Type.STRING }
              }
            }
          },
          required: ["reply"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      reply: result.reply || "I'm sorry, I couldn't process that.",
      action: result.action
    };
  } catch (e) {
    console.error("Failed to chat with Gemini", e);
    return { reply: "I'm sorry, I encountered an error while processing your request." };
  }
}

export async function generateAudio(text: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (e) {
    console.error("Failed to generate audio", e);
    return null;
  }
}

export async function transcribeAudio(base64Audio: string, mimeType: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Audio,
                mimeType: mimeType
              }
            },
            {
              text: "Transcribe the following audio accurately. The speaker is primarily speaking in English, but may also use Portuguese. Output ONLY the transcription text, without any extra commentary or formatting."
            }
          ]
        }
      ]
    });
    return response.text || '';
  } catch (e) {
    console.error("Failed to transcribe audio", e);
    return '';
  }
}

export async function generateTranscriptSummary(text: string): Promise<{title: string, summary: string}> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize the following raw user input (transcript). Provide a short title and a concise summary in Markdown format.
      
      Input: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A short, descriptive title (max 50 chars)." },
            summary: { type: Type.STRING, description: "A concise summary of the input in Markdown format." }
          },
          required: ["title", "summary"]
        }
      }
    });

    return JSON.parse(response.text || '{"title": "Transcript", "summary": "No summary available."}');
  } catch (e) {
    console.error("Failed to generate transcript summary", e);
    return { title: "Transcript", summary: "Failed to generate summary." };
  }
}

export async function classifyInput(input: string): Promise<ClassifiedInput> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Classify the following input for a "Second Brain" assistant. 
    It can be a 'note' (a thought, idea, or information), a 'task' (something to do), or a 'request' (a question or something to be consulted).
    Extract a title if appropriate, and suggest relevant tags.
    If it's a task, default status is 'pending'.
    
    Input: "${input}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["note", "task", "request"] },
          content: { type: Type.STRING },
          title: { type: Type.STRING },
          status: { type: Type.STRING, enum: ["pending", "working", "done"] },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["type", "content"]
      }
    }
  });

  try {
    return JSON.parse(response.text.trim());
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return { type: 'note', content: input };
  }
}

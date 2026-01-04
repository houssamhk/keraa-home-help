import { useState, useCallback, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export function useVoiceChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldContinueListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voicesLoadedRef = useRef(false);
  const arabicVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Load voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
      
      const loadVoices = () => {
        const voices = synthRef.current?.getVoices() || [];
        // Prioritize high-quality Arabic voices
        const priorityVoices = [
          'Majed', 'Maged', 'Tarik', 'Laila', 'Mariam', // Apple Arabic voices
          'ar-SA', 'ar-EG', 'ar-DZ', 'ar-MA' // Google/Microsoft Arabic
        ];
        
        for (const priority of priorityVoices) {
          const found = voices.find(v => 
            v.name.includes(priority) || 
            v.lang.includes(priority) ||
            v.voiceURI.includes(priority)
          );
          if (found) {
            arabicVoiceRef.current = found;
            console.log("Selected Arabic voice:", found.name, found.lang);
            break;
          }
        }
        
        // Fallback to any Arabic voice
        if (!arabicVoiceRef.current) {
          arabicVoiceRef.current = voices.find(v => v.lang.startsWith('ar')) || null;
        }
        
        voicesLoadedRef.current = true;
      };
      
      loadVoices();
      synthRef.current.onvoiceschanged = loadVoices;
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "ar-DZ"; // Algerian dialect
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (isSpeakingRef.current) return;

      let finalTranscript = "";
      let interimTranscript = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (interimTranscript) {
        setTranscript(interimTranscript);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        silenceTimeoutRef.current = setTimeout(() => {
          handleUserSpeech(finalTranscript);
        }, 800);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error("Speech recognition error:", event.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (shouldContinueListeningRef.current && !isSpeakingRef.current) {
        setTimeout(() => {
          if (shouldContinueListeningRef.current && !isSpeakingRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              // Ignore restart errors
            }
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  // Handle user speech
  const handleUserSpeech = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || isSpeakingRef.current) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);
    setTranscript("");

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);

    let assistantResponse = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [...messages, userMsg],
          systemPrompt: `أنت مساعد ذكي اسمك "سكني" متخصص في العقارات والخدمات المنزلية في الجزائر. 
تتحدث العربية الفصحى واللهجة الجزائرية بطلاقة.
كن ودوداً ومختصراً جداً. استخدم جمل قصيرة. لا تكتب أكثر من 2-3 جمل.
ساعد المستخدمين في البحث عن العقارات والحرفيين.
تصرف كأنك تتحدث وليس تكتب - اجعل ردودك طبيعية للنطق.`
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || "فشل الاتصال");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsertAssistant = (text: string) => {
        assistantResponse = text;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: text } : m));
          }
          return [...prev, { role: "assistant", content: text }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantResponse += content;
              upsertAssistant(assistantResponse);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setIsLoading(false);

      if (assistantResponse) {
        await speakText(assistantResponse);
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "حدث خطأ");
      setIsLoading(false);
      resumeListening();
    }
  }, [messages, isLoading]);

  // Enhanced TTS with browser Speech Synthesis
  const speakText = useCallback(async (text: string) => {
    if (!synthRef.current) {
      resumeListening();
      return;
    }

    setIsSpeaking(true);
    isSpeakingRef.current = true;
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    
    // Cancel any ongoing speech
    synthRef.current.cancel();

    // Clean text for speech
    const cleanText = text
      .replace(/[*#_`]/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Use the best Arabic voice found
    if (arabicVoiceRef.current) {
      utterance.voice = arabicVoiceRef.current;
    }
    
    utterance.lang = "ar-SA";
    utterance.rate = 1.0;    // Normal speed - professional pace
    utterance.pitch = 1.05;  // Slightly higher for clarity
    utterance.volume = 1.0;
    
    utterance.onend = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      resumeListening();
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      resumeListening();
    };
    
    synthRef.current.speak(utterance);
  }, []);

  // Resume listening after speaking
  const resumeListening = useCallback(() => {
    if (shouldContinueListeningRef.current && recognitionRef.current && !isSpeakingRef.current) {
      setTimeout(() => {
        if (shouldContinueListeningRef.current && !isSpeakingRef.current) {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            // Ignore
          }
        }
      }, 300);
    }
  }, []);

  // Toggle conversation
  const toggleConversation = useCallback(() => {
    if (isConversationActive) {
      shouldContinueListeningRef.current = false;
      setIsConversationActive(false);
      
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      setIsListening(false);
      setTranscript("");
      
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    } else {
      shouldContinueListeningRef.current = true;
      setIsConversationActive(true);
      setError(null);
      isSpeakingRef.current = false;
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("Failed to start recognition:", e);
        }
      }
    }
  }, [isConversationActive]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setTranscript("");
  }, []);

  return {
    messages,
    isLoading,
    error,
    isConversationActive,
    isListening,
    isSpeaking,
    transcript,
    isSupported,
    toggleConversation,
    clearMessages,
  };
}

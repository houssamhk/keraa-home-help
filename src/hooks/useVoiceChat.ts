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
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`;

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldContinueListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    // Support Algerian dialect and Arabic
    recognition.lang = "ar-DZ";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Don't process if AI is speaking (prevents echo)
      if (isSpeakingRef.current) {
        return;
      }

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
        lastSpeechTimeRef.current = Date.now();
        
        // Clear previous timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
        // Wait for a moment of silence before processing
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        silenceTimeoutRef.current = setTimeout(() => {
          handleUserSpeech(finalTranscript);
        }, 800);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(`خطأ في التعرف على الصوت: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Restart listening if conversation is still active and not speaking
      if (shouldContinueListeningRef.current && !isSpeakingRef.current) {
        setTimeout(() => {
          if (shouldContinueListeningRef.current && !isSpeakingRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.log("Recognition restart error:", e);
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

  // Handle user speech and send to AI
  const handleUserSpeech = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || isSpeakingRef.current) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);
    setTranscript("");

    // Stop listening while processing and speaking
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
          كن ودوداً ومختصراً في ردودك. استخدم جمل قصيرة وواضحة.
          ساعد المستخدمين في البحث عن العقارات، الحرفيين، وإدارة العقود.
          إذا سألك أحد عن شيء خارج نطاق العقارات، أجب بلطف ووجهه للموضوع الصحيح.`
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

      // Speak the response using professional TTS
      if (assistantResponse) {
        await speakText(assistantResponse);
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "حدث خطأ");
      setIsLoading(false);
      // Resume listening on error
      if (shouldContinueListeningRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (err) {
          console.log("Recognition restart error:", err);
        }
      }
    }
  }, [messages, isLoading]);

  // Professional Text-to-speech function using edge function
  const speakText = useCallback(async (text: string) => {
    setIsSpeaking(true);
    isSpeakingRef.current = true;
    
    // Stop listening while speaking to prevent echo
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    
    try {
      const response = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          text,
          voice: "shimmer" // Professional female voice, good for Arabic
        }),
      });

      const data = await response.json();
      
      if (data.audioContent) {
        // Play audio using data URI
        const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        
        if (audioRef.current) {
          audioRef.current.pause();
        }
        
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          
          // Resume listening after speaking is done
          if (shouldContinueListeningRef.current && recognitionRef.current) {
            setTimeout(() => {
              if (shouldContinueListeningRef.current && !isSpeakingRef.current) {
                try {
                  recognitionRef.current?.start();
                } catch (e) {
                  console.log("Recognition restart error:", e);
                }
              }
            }, 500);
          }
        };
        
        audio.onerror = () => {
          console.error("Audio playback error");
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          fallbackToSpeechSynthesis(text);
        };
        
        await audio.play();
      } else if (data.fallback || data.error) {
        // Fallback to browser TTS
        fallbackToSpeechSynthesis(text);
      }
    } catch (error) {
      console.error("TTS error:", error);
      fallbackToSpeechSynthesis(text);
    }
  }, []);

  // Fallback to browser speech synthesis
  const fallbackToSpeechSynthesis = useCallback((text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      return;
    }

    synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ar-SA";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    const voices = synth.getVoices();
    const arabicVoice = voices.find(v => v.lang.startsWith("ar"));
    if (arabicVoice) {
      utterance.voice = arabicVoice;
    }
    
    utterance.onend = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      
      if (shouldContinueListeningRef.current && recognitionRef.current) {
        setTimeout(() => {
          if (shouldContinueListeningRef.current && !isSpeakingRef.current) {
            try {
              recognitionRef.current?.start();
            } catch (e) {
              console.log("Recognition restart error:", e);
            }
          }
        }, 500);
      }
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    };
    
    synth.speak(utterance);
  }, []);

  // Toggle conversation - single button press to start/stop
  const toggleConversation = useCallback(() => {
    if (isConversationActive) {
      // Stop conversation
      shouldContinueListeningRef.current = false;
      setIsConversationActive(false);
      
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      // Stop any ongoing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      // Stop browser TTS
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      setIsListening(false);
      setTranscript("");
      
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    } else {
      // Start conversation
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

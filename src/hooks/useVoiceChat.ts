import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

const CHAT_URL = `https://xcawesnsfnqoqdartmdc.supabase.co/functions/v1/chat`;

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

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "ar-DZ";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
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

      if (finalTranscript) {
        setTranscript(finalTranscript);
        // Process the final transcript
        handleUserSpeech(finalTranscript);
      } else if (interimTranscript) {
        setTranscript(interimTranscript);
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
      if (shouldContinueListeningRef.current && !isSpeaking) {
        setTimeout(() => {
          if (shouldContinueListeningRef.current && recognitionRef.current) {
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
    };
  }, []);

  // Handle user speech and send to AI
  const handleUserSpeech = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);
    setTranscript("");

    // Stop listening while processing
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }

    let assistantResponse = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjYXdlc25zZm5xb3FkYXJ0bWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMjM4MTAsImV4cCI6MjA4MTc5OTgxMH0.TThSLykm4Wm2rHigSzOpHvCKEB_8ku_6ACrPZbWsitM`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
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

      // Speak the response
      if (assistantResponse) {
        await speakText(assistantResponse);
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, isListening]);

  // Text-to-speech function
  const speakText = useCallback(async (text: string) => {
    setIsSpeaking(true);
    
    try {
      // Use browser's built-in speech synthesis for Arabic
      const synth = window.speechSynthesis;
      
      if (synth) {
        // Cancel any ongoing speech
        synth.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "ar-SA"; // Arabic
        utterance.rate = 0.9;
        utterance.pitch = 1;
        
        // Find an Arabic voice if available
        const voices = synth.getVoices();
        const arabicVoice = voices.find(v => v.lang.startsWith("ar"));
        if (arabicVoice) {
          utterance.voice = arabicVoice;
        }
        
        utterance.onend = () => {
          setIsSpeaking(false);
          // Resume listening after speaking
          if (shouldContinueListeningRef.current && recognitionRef.current) {
            setTimeout(() => {
              try {
                recognitionRef.current?.start();
              } catch (e) {
                console.log("Recognition restart error:", e);
              }
            }, 300);
          }
        };
        
        utterance.onerror = () => {
          setIsSpeaking(false);
          // Resume listening even on error
          if (shouldContinueListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current?.start();
            } catch (e) {
              console.log("Recognition restart error:", e);
            }
          }
        };
        
        synth.speak(utterance);
      } else {
        setIsSpeaking(false);
        // Resume listening if no TTS available
        if (shouldContinueListeningRef.current && recognitionRef.current) {
          recognitionRef.current.start();
        }
      }
    } catch (error) {
      console.error("TTS error:", error);
      setIsSpeaking(false);
      // Resume listening on error
      if (shouldContinueListeningRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.log("Recognition restart error:", e);
        }
      }
    }
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
      
      // Stop any ongoing speech
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      setIsSpeaking(false);
      setTranscript("");
    } else {
      // Start conversation
      shouldContinueListeningRef.current = true;
      setIsConversationActive(true);
      setError(null);
      
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

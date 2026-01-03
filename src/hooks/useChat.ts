import { useState, useCallback, useRef } from "react";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const assistantResponseRef = useRef("");

  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim() || isLoading) return;
    
    const userMsg: Message = { role: "user", content: input };
    const currentMessages = [...messages, userMsg];
    
    setMessages(currentMessages);
    setIsLoading(true);
    setError(null);
    assistantResponseRef.current = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: currentMessages }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "فشل الاتصال");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantAdded = false;

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
              assistantResponseRef.current += content;
              
              if (!assistantAdded) {
                setMessages(prev => [...prev, { role: "assistant", content: assistantResponseRef.current }]);
                assistantAdded = true;
              } else {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  if (lastIndex >= 0 && newMessages[lastIndex].role === "assistant") {
                    newMessages[lastIndex] = { ...newMessages[lastIndex], content: assistantResponseRef.current };
                  }
                  return newMessages;
                });
              }
            }
          } catch {
            // JSON parse error - continue
          }
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    assistantResponseRef.current = "";
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}

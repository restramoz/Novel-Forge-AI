import { useState } from "react";

export function useChapterStream(novelId: number) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (params: any, onChunk: (text: string) => void) => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/novels/${novelId}/generate-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!res.ok) {
        throw new Error(`Failed to generate: ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error("No readable stream available");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        // Handle SSE format "data: {...}\n\n" or raw text
        const lines = chunk.split('\n');
        let processedChunk = "";
        
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const dataStr = line.slice(5).trim();
            if (dataStr && dataStr !== '[DONE]') {
              try {
                const json = JSON.parse(dataStr);
                processedChunk += (json.response || json.content || json.text || "");
              } catch {
                processedChunk += dataStr.replace(/\\n/g, '\n');
              }
            }
          } else if (line.trim() && !line.startsWith('id:') && !line.startsWith('event:')) {
            // Fallback for raw streaming text
            processedChunk += line + '\n';
          }
        }
        
        if (processedChunk) {
          onChunk(processedChunk);
        }
      }
    } catch (err) {
      console.error("Stream error:", err);
      setError(err instanceof Error ? err.message : "Unknown stream error");
    } finally {
      setIsGenerating(false);
    }
  };

  return { generate, isGenerating, error };
}

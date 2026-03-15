import { useState } from "react";

export function useChapterStream(novelId: number) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (
    params: Record<string, unknown>,
    onChunk: (text: string) => void
  ): Promise<{ success: boolean; error?: string }> => {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/novels/${novelId}/generate-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const msg = `Gagal terhubung ke server: ${res.status} ${res.statusText}`;
        setError(msg);
        return { success: false, error: msg };
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        const msg = "Tidak ada stream yang tersedia";
        setError(msg);
        return { success: false, error: msg };
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const dataStr = line.slice(5).trim();
          if (!dataStr || dataStr === "[DONE]") continue;

          try {
            const json = JSON.parse(dataStr);
            if (json.error) {
              const msg = String(json.error);
              setError(msg);
              return { success: false, error: msg };
            }
            // token field from our backend SSE
            const token = json.token ?? json.response ?? json.content ?? json.text ?? "";
            if (token) onChunk(token);
          } catch {
            // skip non-JSON lines
          }
        }
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kesalahan tidak diketahui";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsGenerating(false);
    }
  };

  return { generate, isGenerating, error };
}

/**
 * src/services/aiService.ts
 * Protocol A — 프론트엔드 클라이언트 (서버 API 호출 래퍼)
 * 실제 Gemini 호출은 server/services/aiService.ts 에서 수행됩니다.
 * API 키는 서버 전용 환경변수이며 클라이언트에 노출되지 않습니다.
 */
import type { AEPLSchema } from '../types';

/** 이미지 File → base64 문자열 변환 */
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // "data:image/jpeg;base64,XXXX" → "XXXX"
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/**
 * Protocol A 진입점
 * onProgress 콜백은 SSE 구독이 담당하므로 여기서는 fetch 결과만 처리합니다.
 */
export const analyzeElevation = async (
  imageFile: File,
  userPrompt: string,
): Promise<AEPLSchema> => {
  const imageBase64 = await fileToBase64(imageFile);

  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      mimeType: imageFile.type || 'image/jpeg',
      prompt: userPrompt,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Protocol A server error: ${res.status}`);
  }

  const data = await res.json() as { success: boolean; aepl: AEPLSchema; error?: string };
  if (!data.success) throw new Error(data.error ?? 'Protocol A returned failure');
  return data.aepl;
};

// 하위 호환성 — BIMAnalysisResult 를 AEPLSchema 로 통합
export type { AEPLSchema as BIMAnalysisResult };

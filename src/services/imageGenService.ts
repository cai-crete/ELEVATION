/**
 * src/services/imageGenService.ts
 * Protocol B — 프론트엔드 클라이언트 (서버 API 호출 래퍼)
 * 실제 Gemini 이미지 생성은 server/services/imageGenService.ts 에서 수행됩니다.
 */
import type { AEPLSchema, GeneratedImages } from '../types';

/**
 * Protocol B 진입점
 * AEPL Schema와 원본 이미지 base64를 서버에 전송하고
 * 5-view GeneratedImages를 수신합니다.
 */
export const generateElevationImages = async (
  aepl: AEPLSchema,
  originalImageDataUrl: string,
): Promise<GeneratedImages> => {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aepl,
      originalImageBase64: originalImageDataUrl,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Protocol B server error: ${res.status}`);
  }

  const data = await res.json() as { success: boolean; images: GeneratedImages; error?: string };
  if (!data.success) throw new Error(data.error ?? 'Protocol B returned failure');
  return data.images;
};

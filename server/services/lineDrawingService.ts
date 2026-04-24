/**
 * server/services/lineDrawingService.ts
 * Protocol LD — Line Drawing Conversion Engine
 *
 * 5장의 입면 이미지를 받아 건축 라인드로잉(CAD 스타일)으로 변환합니다.
 * Gemini multimodal API를 이용한 이미지→이미지 변환입니다.
 *
 * 요구 조건:
 *   - 모델은 이미지 입력 + 이미지 출력 모두 지원해야 함
 *   - generationConfig에 responseModalities: ['IMAGE'] 필수
 *   - 5개 뷰를 Promise.all로 병렬 변환
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { log, logError } from '../logger.js';
import type { GeneratedImages } from '../../src/types.js';

const API_KEY      = process.env.GEMINI_API_KEY!;
const DRAW_MODEL   = process.env.LINE_DRAW_MODEL   ?? 'gemini-2.0-flash-exp';
const DRAW_FALLBACK= process.env.LINE_DRAW_FALLBACK ?? 'gemini-2.0-flash';

if (!API_KEY) throw new Error('GEMINI_API_KEY is not set in environment.');

const genAI = new GoogleGenerativeAI(API_KEY);

type ViewKey = 'front' | 'rear' | 'right' | 'left' | 'top';

/**
 * 라인드로잉 변환 지시 프롬프트
 * 건축 기술도면(CAD) 스타일로 변환하도록 명시합니다.
 */
const LINE_DRAWING_PROMPT = `Convert this architectural elevation image into a precise technical line drawing.

Requirements:
- Pure black lines on pure white background
- Architectural CAD / technical drawing style
- Clean, crisp geometric outlines only
- Preserve all proportions, dimensions, and architectural details exactly
- Show window frames, door openings, material panel divisions as fine black lines
- Remove all shadows, gradients, color fills, and atmospheric effects
- No people, vehicles, trees, or background elements
- Output: strict black-and-white technical elevation drawing`;

/** data URI에서 base64 + mimeType 추출 */
const parseDataUri = (dataUri: string): { base64: string; mimeType: string } => {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  return {
    mimeType: match?.[1] ?? 'image/jpeg',
    base64:   match?.[2] ?? dataUri,
  };
};

/** 단일 뷰 라인드로잉 변환 */
const convertOneView = async (
  view: ViewKey,
  imageDataUri: string,
  modelName: string,
): Promise<string> => {
  const startMs = Date.now();
  log(`LD-${view.toUpperCase()}`, `Line drawing conversion START → [${modelName}]`);

  const { base64, mimeType } = parseDataUri(imageDataUri);

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      temperature: 0.1,
    } as Record<string, unknown>,
  });

  const result = await model.generateContent([
    {
      inlineData: { data: base64, mimeType },
    },
    {
      text: LINE_DRAWING_PROMPT,
    },
  ]);

  const parts = result.response.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    const p = part as unknown as Record<string, unknown>;
    if (p.inlineData) {
      const id = p.inlineData as { data: string; mimeType: string };
      const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
      log(`LD-${view.toUpperCase()}`, `✓ Converted (${elapsed}s)`);
      return `data:${id.mimeType};base64,${id.data}`;
    }
  }

  // 이미지 파트가 없으면 에러
  const textFallback = result.response.text?.() ?? '';
  throw new Error(
    `Line drawing model returned no image for view "${view}". Response: ${textFallback.slice(0, 200)}`
  );
};

/**
 * Protocol LD 공개 진입점
 * 5개 뷰를 병렬 변환하고 결과를 GeneratedImages 형태로 반환합니다.
 */
export const generateLineDrawings = async (
  images: GeneratedImages,
): Promise<GeneratedImages> => {
  log('LD-PARA', 'Protocol LD START — 5-view line drawing conversion (parallel)');
  log('LD-PARA', `  Model: ${DRAW_MODEL} | Fallback: ${DRAW_FALLBACK}`);

  const views: ViewKey[] = ['front', 'rear', 'right', 'left', 'top'];

  const convertWithFallback = async (view: ViewKey): Promise<string> => {
    const src = images[view];
    if (!src) {
      log(`LD-${view.toUpperCase()}`, 'No source image — returning empty string');
      return '';
    }
    try {
      return await convertOneView(view, src, DRAW_MODEL);
    } catch (err) {
      logError(`LD-${view.toUpperCase()}`, err);
      log(`LD-${view.toUpperCase()}`, `Primary failed — fallback: ${DRAW_FALLBACK}`);
      return convertOneView(view, src, DRAW_FALLBACK);
    }
  };

  const [front, rear, right, left, top] = await Promise.all(
    views.map(convertWithFallback)
  );

  log('LD-DONE', 'Line Drawing 5-view conversion COMPLETE ██████████');

  return { front, rear, right, left, top };
};

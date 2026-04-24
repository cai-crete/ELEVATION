/**
 * server/services/imageGenService.ts
 * Protocol B — Visualization Execution Engine (서버 사이드)
 *
 * AEPS-v4 앙상블 페어 원칙:
 *   1_Geometry_MASTER → 형태 서술 (이미지 프롬프트 역할)
 *   2_Property_SLAVE  → 재질·광학 수치 (텍스트 프롬프트 역할)
 *
 * 5개 뷰를 Promise.all로 병렬 생성합니다.
 * 시스템 프롬프트는 protocolLoader로 Protocol 폴더를 동적 참조합니다.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadElevationGuidelines } from '../protocolLoader.js';
import { log, logError } from '../logger.js';
import type { AEPLSchema, GeneratedImages } from '../../src/types.js';

const API_KEY         = process.env.GEMINI_API_KEY!;
const GEN_MODEL       = process.env.GENERATION_MODEL   ?? 'gemini-2.0-flash-exp-image-generation';
const GEN_FALLBACK    = process.env.GENERATION_FALLBACK ?? 'gemini-2.0-flash-exp';

const genAI = new GoogleGenerativeAI(API_KEY);

type ViewKey = 'front' | 'rear' | 'right' | 'left' | 'top';

const VIEW_META: Record<ViewKey, { label: string; azimuth: number; elevation: number; normal: string }> = {
  front: { label: 'FRONT',  azimuth: 0,   elevation: 0,  normal: '(0, -1, 0)' },
  rear:  { label: 'REAR',   azimuth: 180, elevation: 0,  normal: '(0,  1, 0)' },
  right: { label: 'RIGHT',  azimuth: 90,  elevation: 0,  normal: '(1,  0, 0)' },
  left:  { label: 'LEFT',   azimuth: 270, elevation: 0,  normal: '(-1, 0, 0)' },
  top:   { label: 'TOP',    azimuth: 0,   elevation: 90, normal: '(0,  0, 1)' },
};

/**
 * 뷰별 앙상블 페어 프롬프트 조립
 * 1_Geometry_MASTER (형태): 카메라 방위, 법선, 3D 비례, articulation
 * 2_Property_SLAVE (속성): 재질 PBR, 유리 광학, 채광 환경
 */
const buildViewPrompt = (view: ViewKey, aepl: AEPLSchema, guidelines: string): string => {
  const meta = VIEW_META[view];
  const { materials, articulation, inferred_views, width, height, depth } = aepl;

  // 비가시권 서술 (Blind Spot Inference 결과 참조)
  const viewDesc: Record<ViewKey, string> = {
    front: `Primary facade — absolute datum. Width:${width} Height:${height}.`,
    rear:  inferred_views.rear,
    right: inferred_views.right,
    left:  inferred_views.left,
    top:   inferred_views.top,
  };

  const geometry = [
    `[1_Geometry_MASTER] Camera: azimuth=${meta.azimuth}°, elevation=${meta.elevation}°`,
    `Normal vector: ${meta.normal}`,
    `Orthographic projection, no perspective distortion`,
    `Building volume: W${width} × D${depth} × H${height} (relative units)`,
    `Mass articulation: base_height=${articulation.base_height}, body_rhythm="${articulation.body_rhythm}"`,
    `Top structure: "${articulation.top_structure}"`,
    `Void/solid ratio: ${(articulation.void_ratio * 100).toFixed(0)}% openings`,
    `Facade description: ${viewDesc[view]}`,
    `White background, strict orthographic cutout, transparent alpha if possible`,
  ].join('. ');

  const property = [
    `[2_Property_SLAVE] Base material: ${materials.base}`,
    `Secondary: ${materials.secondary}`,
    `Glazing: ${materials.glass}`,
    `PBR — roughness:${materials.pbr.roughness} metallic:${materials.pbr.metallic} reflectivity:${materials.pbr.reflectivity}`,
    `Overcast diffuse lighting, no harsh shadows, ambient occlusion subtle`,
    `Architectural elevation drawing style, ultra-detailed, high-end visualization`,
    `No people, no vehicles, no trees unless structurally part of building`,
  ].join('. ');

  return `${geometry}\n\n${property}\n\nReference guidelines:\n${guidelines.slice(0, 800)}`;
};

/** 단일 뷰 이미지 생성 (base64 반환) */
const generateOneView = async (
  view: ViewKey,
  prompt: string,
  modelName: string,
): Promise<string> => {
  const startMs = Date.now();
  log(`B-${VIEW_META[view].label}`, `Ensemble pair assembling → [${modelName}]`);

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.4,
    } as Record<string, unknown>,
  });

  const result = await model.generateContent([
    { text: prompt },
  ]);

  const response = result.response;

  // 이미지 파트 추출 (인라인 이미지 응답)
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if ((part as unknown as Record<string, unknown>).inlineData) {
      const inlineData = ((part as unknown as Record<string, unknown>).inlineData) as { data: string; mimeType: string };
      const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
      log(`B-${VIEW_META[view].label}`, `✓ Generated  (${elapsed}s)`);
      return `data:${inlineData.mimeType};base64,${inlineData.data}`;
    }
  }

  // 이미지 파트 없으면 텍스트 응답 확인 후 에러
  const textFallback = response.text();
  throw new Error(
    `Model returned no image for view "${view}". Response: ${textFallback.slice(0, 200)}`
  );
};

/** Protocol B 공개 진입점 */
export const generateElevationImages = async (
  aepl: AEPLSchema,
  originalImageBase64: string,
): Promise<GeneratedImages> => {
  log('B-PARA', 'Protocol B START — loading elevation guidelines from Protocol folder...');

  const guidelines = await loadElevationGuidelines();

  log('B-PARA', '5-view PARALLEL generation START (Promise.all)');
  log('B-PARA', `  Model: ${GEN_MODEL} | Fallback: ${GEN_FALLBACK}`);

  // front는 원본 이미지를 그대로 사용 (가시권 최우선 원칙)
  log('B-FRONT', 'FRONT — original image passthrough (Master-Priority rule) ✓  (0.0s)');
  const frontImage = originalImageBase64.startsWith('data:')
    ? originalImageBase64
    : `data:image/jpeg;base64,${originalImageBase64}`;

  // 비가시권 4개 뷰: 병렬 생성
  const views: ViewKey[] = ['rear', 'right', 'left', 'top'];

  const generateWithFallback = async (view: ViewKey): Promise<string> => {
    const prompt = buildViewPrompt(view, aepl, guidelines);
    try {
      return await generateOneView(view, prompt, GEN_MODEL);
    } catch (err) {
      logError(`B-${view.toUpperCase()}`, err);
      log(`B-${view.toUpperCase()}`, `Primary model failed — activating fallback: ${GEN_FALLBACK}`);
      return await generateOneView(view, prompt, GEN_FALLBACK);
    }
  };

  const [rear, right, left, top] = await Promise.all(
    views.map(generateWithFallback)
  );

  log('B-DONE', '5-view synchronized output COMPLETE ██████████');

  return { front: frontImage, rear, right, left, top };
};

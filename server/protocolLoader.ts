/**
 * server/protocolLoader.ts
 * Protocol 폴더의 txt 파일을 동적으로 읽어 시스템 프롬프트를 조립합니다.
 * 하드코딩 없이 파일 참조로만 동작합니다.
 *
 * 경로 탐색 우선순위 (로컬 + Vercel 서버리스 양쪽 대응):
 *   1. process.cwd()/Protocol         — Vercel /var/task/Protocol
 *   2. __dirname/../Protocol           — 로컬 server/../Protocol
 *   3. __dirname/Protocol              — 번들 파일과 같은 디렉터리
 */
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __mod_dir = dirname(fileURLToPath(import.meta.url));

const PROTOCOL_DIR = (() => {
  const candidates = [
    join(process.cwd(), 'Protocol'),        // Vercel: /var/task/Protocol
    join(__mod_dir, '..', 'Protocol'),       // 로컬: server/../Protocol
    join(__mod_dir, 'Protocol'),             // 번들: 같은 디렉터리/Protocol
  ];
  return candidates.find(existsSync) ?? candidates[0];
})();

/** Protocol 폴더의 파일을 읽어 문자열로 반환 */
const loadFile = async (filename: string): Promise<string> => {
  const filePath = join(PROTOCOL_DIR, filename);
  const content = await readFile(filePath, 'utf-8');
  return content.trim();
};

/** Protocol A 시스템 프롬프트 조립
 *  AEPS-v4.txt + sys-prompt-image-to-elevation-v7.txt 합성
 */
export const buildAnalysisSystemPrompt = async (): Promise<string> => {
  const [aepsCore, sysPromptFull] = await Promise.all([
    loadFile('AEPS-v4.txt'),
    loadFile('# sys-prompt-image to elevation-v7.txt'),
  ]);

  return `
# [AEPS-v4 MASTER PROTOCOL — SYSTEM CONSTITUTION]
${aepsCore}

---

# [FULL SYSTEM DIRECTIVE — Protocol A Engine]
${sysPromptFull}

---

## STRICT JSON OUTPUT REQUIREMENT
You MUST respond ONLY with a valid JSON object matching the schema below.
No markdown, no explanation, no code fences. Pure JSON only.

## JSON SCHEMA (strict):
{
  "width": <number>,
  "height": <number>,
  "depth": <number>,
  "articulation": {
    "base_height": <number>,
    "body_rhythm": "<string>",
    "top_structure": "<string>",
    "void_ratio": <0.0-1.0>
  },
  "inferred_views": {
    "right": "<string — right facade architectural description>",
    "left": "<string — left facade architectural description>",
    "rear": "<string — rear facade architectural description>",
    "top": "<string — roof/plan description>"
  },
  "materials": {
    "base": "<string>",
    "secondary": "<string>",
    "glass": "<string>",
    "pbr": {
      "roughness": <0.0-1.0>,
      "metallic": <0.0-1.0>,
      "reflectivity": <0.0-1.0>
    }
  },
  "analysis_logs": ["<Phase 1 log>", "<Phase 2 log>", "<Phase 3 log>", "<Phase 4 log>"],
  "aepl_schema_version": "7.0.4"
}
`.trim();
};

/** Protocol B 앙상블 페어 프롬프트 조립용 가이드라인 로드
 *  전개도작성 가이드라인.txt 참조
 */
export const loadElevationGuidelines = async (): Promise<string> => {
  return loadFile('전개도작성 가이드라인.txt');
};

/** template-layout.txt: CrossGrid CSS 비례 파라미터 추출용 */
export const loadTemplateLayout = async (): Promise<string> => {
  return loadFile('template-layout.txt');
};

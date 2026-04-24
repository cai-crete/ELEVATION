# CAI ELEVATION V7 — 작업 완료 보고서 (Walkthrough)
**완료일:** 2026-04-24 | **기준 계획서:** `exec-plan/EXECUTION-PLAN.md`

---

## 1. 변경 파일 전체 목록

| 파일 | 작업 종류 | 비고 |
|------|----------|------|
| `server/index.ts` | 신규 생성 | Express 서버 진입점, CORS, SSE, /api 라우트 |
| `server/logger.ts` | 신규 생성 | 터미널 컬러 출력 + SSE 브로드캐스터 |
| `server/protocolLoader.ts` | 신규 생성 | Protocol 폴더 동적 읽기, 시스템 프롬프트 조립 |
| `server/services/aiService.ts` | 신규 생성 | Protocol A 서버 구현 (Gemini Vision) |
| `server/services/imageGenService.ts` | 신규 생성 | Protocol B 서버 구현 (병렬 5뷰 이미지 생성) |
| `src/types.ts` | 수정 | `AEPLSchema` 통합 타입 (BIMAnalysisResult 교체) |
| `src/services/aiService.ts` | 교체 | 서버 `/api/analyze` fetch 래퍼로 전환 |
| `src/services/imageGenService.ts` | 교체 | 서버 `/api/generate` fetch 래퍼로 전환 |
| `src/App.tsx` | 수정 | SSE 구독 훅(`useSSELogs`) 추가, 로그 컬러 개선 |
| `src/components/CrossGrid.tsx` | 수정 | `template-layout.txt` 비례 기준 통일 (BASE_SCALE=30, GAP=60) |
| `vite.config.ts` | 수정 | `/api` → Express 3001 프록시, SSE 버퍼링 비활성화 |
| `package.json` | 수정 | `server`, `start` 스크립트 추가, `concurrently` / `@types/react` 추가 |
| `.env` | 수정 | 서버 전용 키 분리 (`GEMINI_API_KEY`, `ANALYSIS_MODEL`, `GENERATION_MODEL` 등) |

---

## 2. 해결된 문제 (Before → After)

### CRITICAL: Protocol B mock 이미지
| Before | After |
|--------|-------|
| `imageGenService.ts` — Unsplash mock URL 하드코딩 | `server/services/imageGenService.ts` — 실제 Gemini 이미지 생성 API 호출 |
| `console.log` 3개 (프로덕션 코드) | `logger.ts` 통합 로거로 교체 |

### HIGH: 하드코딩된 시스템 프롬프트
| Before | After |
|--------|-------|
| `aiService.ts:62~108` 인라인 62줄 하드코딩 | `protocolLoader.buildAnalysisSystemPrompt()` → `AEPS-v4.txt` + `sys-prompt-v7.txt` 동적 읽기 |

### HIGH: API 키 클라이언트 노출
| Before | After |
|--------|-------|
| `VITE_GOOGLE_API_KEY` → 브라우저 번들에 포함 | `GEMINI_API_KEY` → 서버 전용, `vite.config.ts`에서 클라이언트 빈 문자열 주입 |

### HIGH: Protocol B 병렬 생성 미구현
| Before | After |
|--------|-------|
| 단일 mock 반환, 병렬 없음 | `Promise.all([rear, right, left, top])` — 4개 뷰 병렬 생성 |

### MEDIUM: 터미널 로그 없음
| Before | After |
|--------|-------|
| UI ConsoleLog에만 표시 | `logger.ts` → 터미널 ANSI 컬러 출력 + SSE 브로드캐스트 동시 수행 |

---

## 3. 아키텍처 — 실제 구현 데이터 흐름

```
[Browser :3000]
  UploadArea ── File ──────────────────────────────────────────────────┐
  App.tsx                                                              │
    EventSource('/api/stream') ←── SSE logs ←─────────────────────┐  │
    fetch POST /api/analyze ──────────────────────────────────────► │  │
    fetch POST /api/generate ────────────────────────────────────► │  │
  CrossGrid ← GeneratedImages ← POST response                     │  │
                                                                    │  │
[Vite Proxy :3000/api → :3001]                                     │  │
                                                                    │  │
[Express :3001]                                                     │  │
  GET  /api/stream ── registerSSEClient() ──────────────────────── ┘  │
  POST /api/analyze                                                    │
    ← { imageBase64, mimeType, prompt } ◄──────────────────────────── ┘
    → protocolLoader.buildAnalysisSystemPrompt()
        fs.readFile('Protocol/AEPS-v4.txt')
        fs.readFile('Protocol/# sys-prompt-image to elevation-v7.txt')
    → GoogleGenerativeAI (ANALYSIS_MODEL)
    → log('A-P1') ... log('A-P4') → 터미널 + SSE
    → { success: true, aepl: AEPLSchema }
  POST /api/generate
    ← { aepl: AEPLSchema, originalImageBase64 }
    → protocolLoader.loadElevationGuidelines()
        fs.readFile('Protocol/전개도작성 가이드라인.txt')
    → Promise.all 4개 뷰 병렬
        buildViewPrompt(view, aepl, guidelines)
          1_Geometry_MASTER: 카메라, 법선벡터, 비례, articulation
          2_Property_SLAVE:  재질 PBR, 유리 광학, 조명
        GoogleGenerativeAI (GENERATION_MODEL) × 4
    → log('B-FRONT') ... log('B-DONE') → 터미널 + SSE
    → { success: true, images: GeneratedImages }

[Google AI API]
  gemini-3-pro-preview        ← Protocol A (분석)
  gemini-2.5-pro              ← Protocol A 폴백
  gemini-3-pro-image-preview  ← Protocol B (이미지 생성)
  gemini-2.0-flash-exp-image-generation ← Protocol B 폴백
```

---

## 4. 단계별 파일 교환 형식

```
Stage 0 → API
  Content-Type: application/json
  { imageBase64: string, mimeType: string, prompt: string }

Stage A (Protocol A 출력) — AEPLSchema
  {
    aepl_schema_version: "7.0.4",
    width, height, depth,            // 1_Geometry비례
    articulation: { ... },
    inferred_views: { right, left, rear, top },
    materials: { base, secondary, glass, pbr },  // 2_Property
    analysis_logs: string[]
  }

Stage A→B 핸드오버
  Content-Type: application/json
  { aepl: AEPLSchema, originalImageBase64: string }

Stage B (Protocol B 출력) — GeneratedImages
  {
    front: "data:image/jpeg;base64,...",  // 원본 패스스루
    rear:  "data:image/png;base64,...",   // Gemini 생성
    right: "data:image/png;base64,...",
    left:  "data:image/png;base64,...",
    top:   "data:image/png;base64,..."
  }

Stage Template — CrossGrid 렌더링
  CSS Grid (W×H×D 비례, BASE_SCALE=30px, GAP=60px)
  template-layout.txt 스펙 동일 적용
```

---

## 5. 터미널 출력 예시

```
[SERVER  ] 2026-04-24 10:00:01 ╔════════════════════════════════════╗
[SERVER  ] 2026-04-24 10:00:01 ║  CAI ELEVATION V7 — port 3001      ║
[SERVER  ] 2026-04-24 10:00:02 POST /api/analyze — image/jpeg (~340 KB)
[A-P1   ] 2026-04-24 10:00:02 ███░░░░░░░ Phase 1 — Macro Context Lock-on  [model: gemini-3-pro-preview]
[A-P2   ] 2026-04-24 10:00:03 ██████░░░░ Phase 2 — Boundary Parameterization...
[A-P3   ] 2026-04-24 10:00:04 ████████░░ Phase 3 — Blind Spot Reconstruction...
[A-P4   ] 2026-04-24 10:00:06 ██████████ Phase 4 — AEPL Schema Packaging ✓
[HAND   ] 2026-04-24 10:00:06 Protocol A → B Handover — AEPL Schema v7.0.4 ready
[B-PARA ] 2026-04-24 10:00:06 ▶ PARALLEL 5-view parallel generation START
[B-FRONT] 2026-04-24 10:00:06 FRONT — original image passthrough ✓  (0.0s)
[B-REAR ] 2026-04-24 10:00:06 Ensemble pair assembling → [gemini-3-pro-image-preview]
[B-RIGHT] 2026-04-24 10:00:06 Ensemble pair assembling → [gemini-3-pro-image-preview]
[B-LEFT ] 2026-04-24 10:00:06 Ensemble pair assembling → [gemini-3-pro-image-preview]
[B-TOP  ] 2026-04-24 10:00:06 Ensemble pair assembling → [gemini-3-pro-image-preview]
[B-RIGHT] 2026-04-24 10:00:09 ✓ Generated  (3.2s)
[B-LEFT ] 2026-04-24 10:00:09 ✓ Generated  (3.4s)
[B-REAR ] 2026-04-24 10:00:10 ✓ Generated  (3.8s)
[B-TOP  ] 2026-04-24 10:00:10 ✓ Generated  (4.1s)
[B-DONE ] 2026-04-24 10:00:10 ██████████ 5-view synchronized output COMPLETE
[TMPL   ] 2026-04-24 10:00:10 CrossGrid template payload ready — 5 images dispatched
```

---

## 6. 구동 방법

```bash
# 의존성 설치 (최초 1회)
npm install

# 개발 서버 (Express + Vite 동시 실행)
npm run start
# → Express: http://localhost:3001  (API + 터미널 로그)
# → Vite:    http://localhost:3000  (프론트엔드, /api 프록시)

# 또는 개별 실행
npm run server   # Express만
npm run dev      # Vite만
```

---

## 7. 하드코딩 방지 검증

| 항목 | 방식 |
|------|------|
| Protocol A 시스템 프롬프트 | `fs.readFile('Protocol/AEPS-v4.txt')` + `sys-prompt-v7.txt` |
| Protocol B 가이드라인 | `fs.readFile('Protocol/전개도작성 가이드라인.txt')` |
| 분석 모델명 | `.env ANALYSIS_MODEL` 참조 |
| 생성 모델명 | `.env GENERATION_MODEL` 참조 |
| 폴백 모델명 | `.env ANALYSIS_FALLBACK`, `GENERATION_FALLBACK` |
| API 키 | `.env GEMINI_API_KEY` (서버 전용, 클라이언트 미노출) |
| CrossGrid 비례 | `template-layout.txt` 스펙과 동일 BASE_SCALE=30, GAP=60 |
| 서버 포트 | `.env SERVER_PORT` |

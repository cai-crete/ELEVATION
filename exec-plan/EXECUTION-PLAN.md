# CAI ELEVATION V7 — 실행 계획서
**버전:** v1.0 | **작성일:** 2026-04-24

---

## 1. 현황 분석 (As-Is)

### 1.1 현재 구조 요약

```
ELEVATION/
├── Protocol/                        ← 규격 문서 (참조 전용)
│   ├── AEPS-v4.txt                  ← 마스터 프로토콜 헌법
│   ├── # sys-prompt-image...v7.txt  ← Protocol A/B 세부 지침
│   ├── template-layout.txt          ← 출력 HTML 템플릿 (미연결)
│   └── 전개도작성 가이드라인.txt     ← 입면 작성 기준
├── src/
│   ├── services/
│   │   ├── aiService.ts             ← Protocol A 구현 (Gemini Vision)
│   │   └── imageGenService.ts       ← Protocol B 구현 (⚠ 스텁 — mock URL 하드코딩)
│   ├── components/
│   │   ├── CrossGrid.tsx            ← 5면 Grid 렌더러 (template-layout.txt 미연동)
│   │   └── UploadArea.tsx / ...
│   ├── App.tsx                      ← 메인 파이프라인 오케스트레이터
│   └── types.ts                     ← 공유 타입
└── fetch.js                         ← 독립 스크립트 (파이프라인 미연동)
```

### 1.2 발견된 문제점

| # | 위치 | 문제 | 심각도 |
|---|------|------|--------|
| 1 | `aiService.ts:62` | Protocol 파일을 읽지 않고 시스템 프롬프트 전체를 하드코딩 | HIGH |
| 2 | `imageGenService.ts:26` | Gemini 이미지 생성 API 미호출 — Unsplash mock URL 반환 | CRITICAL |
| 3 | `imageGenService.ts:13,21,22` | `console.log` 3개 (프로덕션 코드 부적절) | MEDIUM |
| 4 | `CrossGrid.tsx` | `template-layout.txt`의 CSS Grid 비례 로직을 독립 재구현 (중복) | MEDIUM |
| 5 | 전체 | API 키가 Vite 환경변수 `VITE_GOOGLE_API_KEY`로 프론트엔드에 노출 | HIGH |
| 6 | 전체 | Protocol B가 병렬이 아닌 단일 mock 반환 (5개 뷰 동시 생성 미구현) | HIGH |
| 7 | `App.tsx:86` | Protocol B에 originalImage URL(ObjectURL)을 넘기지만 서버 전송 불가 | MEDIUM |
| 8 | `App.tsx` | 각 단계 로그가 UI ConsoleLog에만 표시 — 실제 터미널 출력 없음 | MEDIUM |

---

## 2. 목표 아키텍처 (To-Be)

### 2.1 파이프라인 전체 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                         HOST SERVER (Express)                    │
│  port: 3000  —  프론트엔드 서빙 + API 프록시 역할                  │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTP POST /api/analyze   (multipart/form-data)
                     │   → Field: image (File)
                     │   → Field: prompt (string)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  PROTOCOL A  —  Architectural Logic Engine                       │
│  Model: gemini-1.5-pro  (분석 전용 / 이미지 입력 가능)             │
│                                                                  │
│  Phase 1  Macro Context & Global Datum Lock-on                   │
│    INPUT : image (base64 inline) + userPrompt (string)           │
│    OUTPUT: console log "[A-P1] 가시권 스캔 완료..."               │
│                                                                  │
│  Phase 2  Boundary Parameterization                              │
│    INPUT : Phase 1 컨텍스트 (동일 generateContent 호출 내)        │
│    OUTPUT: console log "[A-P2] 경계 파라미터화..."                │
│                                                                  │
│  Phase 3  Blind Spot Reconstruction                              │
│    OUTPUT: console log "[A-P3] 비가시권 재구성 전략..."            │
│                                                                  │
│  Phase 4  AEPL Schema Packaging                                  │
│    OUTPUT: console log "[A-P4] AEPL 스키마 패키징 완료"           │
│    RETURN : AEPLSchema (JSON)  ← 아래 참조                       │
└────────────────────┬────────────────────────────────────────────┘
                     │ AEPLSchema JSON (HTTP 응답 스트림 또는 완료 후 POST)
                     │
          ┌──────────▼──────────┐
          │  HANDOVER PAYLOAD   │  ← 데이터 형식 섹션 참조
          │  (AEPLSchema JSON)  │
          └──────────┬──────────┘
                     │ HTTP POST /api/generate  (application/json)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  PROTOCOL B  —  Visualization Execution Engine                   │
│  Model: gemini-2.0-flash-exp-image-generation                    │
│         (또는 imagen-3.0-generate-002)                           │
│                                                                  │
│  5개 뷰 병렬(Promise.all) 동시 생성                               │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ │
│  │  FRONT   │ │   REAR   │ │  RIGHT   │ │   LEFT   │ │  TOP  │ │
│  │ Geometry │ │ Geometry │ │ Geometry │ │ Geometry │ │Geom.  │ │
│  │ +Property│ │ +Property│ │ +Property│ │ +Property│ │+Prop. │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └──┬────┘ │
│       │            │            │            │           │      │
│  console: "[B] FRONT 생성중..." etc. (각 뷰별 터미널 로그)        │
│                                                                  │
│    RETURN: GeneratedImages { front, rear, right, left, top }     │
│            (각각 base64 PNG 또는 data URL)                       │
└────────────────────┬────────────────────────────────────────────┘
                     │ GeneratedImages (JSON, base64 image strings)
                     │ HTTP 응답 → 프론트엔드
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  TEMPLATE  —  CrossGrid / template-layout.txt                    │
│                                                                  │
│  CrossGrid.tsx: CSS Grid로 5면 배치 (template-layout.txt 비례 참조)│
│    --bldg-width  = aepl.width                                    │
│    --bldg-depth  = aepl.depth                                    │
│    --bldg-height = aepl.height                                   │
│                                                                  │
│  출력 레이아웃 (십자형):                                          │
│                                                                  │
│        [  REAR  ]                                                │
│  [LEFT][  TOP  ][RIGHT]                                          │
│        [ FRONT ]                                                 │
│                                                                  │
│  각 패널: width/height = bldg 비례 × BASE_SCALE px               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 단계별 데이터 형식 (Data Format per Stage)

### Stage 0 — 사용자 입력
```
Content-Type: multipart/form-data
Fields:
  image : File (JPEG/PNG, 최대 10MB)
  prompt: string (선택, 추가 건축 제약 조건)
```

### Stage A-OUT (Protocol A → Protocol B 핸드오버)
```typescript
// src/types.ts 에 정의 (AEPLSchema)
interface AEPLSchema {
  aepl_schema_version: string;   // "7.0.4"
  
  // Geometry MASTER
  width: number;                 // X축 상대 비례 (예: 5.2)
  height: number;                // Z축 상대 비례 (예: 8.0)
  depth: number;                 // Y축 상대 비례 (예: 3.1)

  articulation: {
    base_height: number;         // 기단부 높이 비율
    body_rhythm: string;         // 중단부 입면 패턴 서술
    top_structure: string;       // 상단부 지붕 유형
    void_ratio: number;          // 0.0 ~ 1.0 (개구부 비율)
  };

  inferred_views: {
    right: string;               // 우측면 건축 언어 서술
    left: string;                // 좌측면 건축 언어 서술
    rear: string;                // 배면 건축 언어 서술
    top: string;                 // 평면/지붕 건축 언어 서술
  };

  // Property SLAVE
  materials: {
    base: string;                // 주 외장재 명칭
    secondary: string;           // 보조 외장재
    glass: string;               // 유리 유형
    pbr: {
      roughness: number;         // 0.0 ~ 1.0
      metallic: number;          // 0.0 ~ 1.0
      reflectivity: number;      // 0.0 ~ 1.0
    };
  };

  analysis_logs: string[];       // Phase별 분석 로그 배열
}
```
**전송 방식:** `application/json` (HTTP 응답 body)

### Stage B-IN (Protocol B 수신)
```typescript
// POST /api/generate 요청 body
{
  aepl: AEPLSchema,          // Protocol A 전체 출력
  originalImageBase64: string // 원본 이미지 (front view 기준)
}
```

### Stage B-OUT (Protocol B → Template)
```typescript
interface GeneratedImages {
  front: string;   // data:image/png;base64,... (원본 이미지 — 가시권 최우선)
  rear:  string;   // data:image/png;base64,... (Gemini 생성)
  right: string;   // data:image/png;base64,... (Gemini 생성)
  left:  string;   // data:image/png;base64,... (Gemini 생성)
  top:   string;   // data:image/png;base64,... (Gemini 생성)
}
```
**전송 방식:** `application/json` (HTTP 응답 body)

### Stage Template-OUT (최종 사용자 출력)
```
React DOM 렌더링
  CrossGrid.tsx:
    CSS Grid (3×3, 십자형 배치)
    각 셀 크기: AEPLSchema.{width|height|depth} × BASE_SCALE (px)
    이미지: <img src={data URL} />
    
선택적 HTML 내보내기:
  template-layout.txt의 {{변수}} 치환 후
  Blob → <a download="elevation.html"> 로 내려받기
```

---

## 4. 시스템 아키텍처 구조도

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (React + Vite)                                       │
│                                                              │
│  UploadArea.tsx                                              │
│    └─ File → base64 → POST /api/analyze                      │
│                                                              │
│  App.tsx (파이프라인 오케스트레이터)                           │
│    ├─ handleGenerate()                                       │
│    │   ├─ POST /api/analyze  → AEPLSchema                    │
│    │   └─ POST /api/generate → GeneratedImages               │
│    └─ ConsoleLog UI (실시간 SSE 또는 폴링)                    │
│                                                              │
│  CrossGrid.tsx                                               │
│    └─ AEPLSchema + GeneratedImages → 5면 CSS Grid 렌더링      │
└───────────────────────┬──────────────────────────────────────┘
                        │ HTTP (fetch API)
                        │
┌───────────────────────▼──────────────────────────────────────┐
│  Express Server  (server/index.ts)                           │
│  port: 3000                                                  │
│                                                              │
│  POST /api/analyze                                           │
│    ├─ multer: image 파일 수신 (multipart)                     │
│    ├─ Protocol A 실행 (aiService.ts)                         │
│    │   ├─ fs.readFile('Protocol/AEPS-v4.txt')    ← 참조     │
│    │   ├─ fs.readFile('Protocol/sys-prompt-v7.txt') ← 참조  │
│    │   └─ GoogleGenerativeAI.generateContent()               │
│    └─ 응답: AEPLSchema (JSON)                                │
│                                                              │
│  POST /api/generate                                          │
│    ├─ AEPLSchema 파싱                                        │
│    ├─ Protocol B 실행 (imageGenService.ts)                   │
│    │   ├─ 5개 프롬프트 조립 (ensemble_pair 원칙)              │
│    │   └─ Promise.all([front, rear, right, left, top])       │
│    │       └─ GoogleGenerativeAI (이미지 생성 모델) × 5      │
│    └─ 응답: GeneratedImages (JSON, base64)                   │
│                                                              │
│  GET /  → Vite 빌드 정적 파일 서빙                            │
└──────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│  Google AI API  (외부)                                       │
│                                                              │
│  분석 모델:  gemini-1.5-pro                                   │
│    - Vision: 이미지 + 텍스트 입력                             │
│    - 출력:   application/json (AEPLSchema)                   │
│                                                              │
│  생성 모델:  gemini-2.0-flash-exp-image-generation            │
│    또는:    imagen-3.0-generate-002                          │
│    - 입력:  텍스트 프롬프트 (ensemble_pair 조립)              │
│    - 출력:  PNG 이미지 (base64)                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. 구현 작업 목록 (Task List)

### Phase 1 — 서버 레이어 구축 (하드코딩 방지)

- [ ] **T1-1** `server/index.ts` 생성
  - Express + multer 설정
  - `GET /` → Vite 빌드 정적 파일
  - `POST /api/analyze`, `POST /api/generate` 라우트 등록
  - 서버 시작 시 터미널: `[SERVER] CAI ELEVATION V7 — port 3000`

- [ ] **T1-2** `server/protocolLoader.ts` 생성
  - `loadProtocol(filename)`: `fs.readFile`로 Protocol 폴더 파일 읽기
  - `buildSystemPrompt()`: AEPS-v4.txt + sys-prompt-v7.txt 합성 → 시스템 프롬프트 반환
  - **하드코딩 제거**: aiService.ts의 62~108행 인라인 프롬프트 → 파일 참조로 교체

- [ ] **T1-3** 환경변수 재구성
  - `.env`: `GEMINI_API_KEY` (서버 전용 — VITE_ 접두어 제거)
  - `ANALYSIS_MODEL`, `GENERATION_MODEL` 환경변수로 모델명 참조
  - `vite.config.ts`: 클라이언트에 API 키 노출 차단 확인

### Phase 2 — Protocol A 정비

- [ ] **T2-1** `server/services/aiService.ts` 리팩터링
  - `protocolLoader.buildSystemPrompt()` 호출로 시스템 프롬프트 주입
  - Phase별 `console.log` 포맷 통일:
    ```
    [A-P1] ████░░░░░░ MACRO CONTEXT LOCK-ON...
    [A-P2] ████████░░ BOUNDARY PARAMETERIZATION...
    [A-P3] ██████████ BLIND SPOT RECONSTRUCTION...
    [A-P4] ██████████ AEPL SCHEMA PACKAGED ✓
    ```
  - SSE(Server-Sent Events) 또는 WebSocket으로 실시간 Phase 로그 → 브라우저 ConsoleLog UI 전달

- [ ] **T2-2** `AEPLSchema` 타입을 `src/types.ts`에 통합 (BIMAnalysisResult 교체)

### Phase 3 — Protocol B 실제 구현

- [ ] **T3-1** `server/services/imageGenService.ts` 재구현
  - `@google/genai` SDK의 이미지 생성 API 호출
  - 뷰별 ensemble_pair 프롬프트 조립 함수 (`buildViewPrompt(view, aepl)`)
    - `1_Geometry_MASTER` → image prompt (ControlNet 대체: 상세 형태 서술)
    - `2_Property_SLAVE` → text prompt (재질, PBR, 광학 수치)
  - `Promise.all` 병렬 5개 뷰 동시 생성
  - 각 뷰 생성 시 터미널 로그:
    ```
    [B-FRONT] Ensemble pair assembling...
    [B-REAR ] Ensemble pair assembling...
    [B-RIGHT] 생성 완료 ✓  (2.3s)
    [B-LEFT ] 생성 완료 ✓  (2.5s)
    [B-TOP  ] 생성 완료 ✓  (3.1s)
    ```
  - `front`는 원본 이미지 base64 그대로 사용 (가시권 최우선 원칙)
  - mock URL 완전 제거

### Phase 4 — 템플릿 연동

- [ ] **T4-1** `CrossGrid.tsx` — `template-layout.txt` 비례 로직 통일
  - CSS 변수 `--bldg-width`, `--bldg-depth`, `--bldg-height` 방식 채택
  - gap, rotation 값을 template-layout.txt 스펙과 일치

- [ ] **T4-2** HTML 내보내기 기능 (선택)
  - template-layout.txt 로드 → `{{변수}}` 치환 → Blob 다운로드

### Phase 5 — 콘솔/터미널 로깅 통합

- [ ] **T5-1** SSE 엔드포인트 `GET /api/stream`
  - Protocol A/B 각 단계별 로그를 `text/event-stream`으로 push
  - 프론트엔드 `ConsoleLog` UI가 `EventSource`로 구독

- [ ] **T5-2** 터미널 출력 포맷 확정
  ```
  [SERVER]  2026-04-24T10:00:00 | POST /api/analyze — image.jpg (512KB)
  [A-P1]   ████░░░░░░ Macro Context Lock-on...
  [A-P2]   ████████░░ Boundary Parameterization...
  [A-P3]   ██████████ Blind Spot Reconstruction...
  [A-P4]   ██████████ AEPL Schema v7.0.4 ✓
  [HAND]   Protocol A → B Handover | payload: 1.2KB JSON
  [B-PARA] 5-view parallel generation START
  [B-FRONT]  ✓ (0.0s — original image passthrough)
  [B-REAR ]  ✓ (3.2s)
  [B-RIGHT]  ✓ (3.4s)
  [B-LEFT ]  ✓ (3.7s)
  [B-TOP  ]  ✓ (4.0s)
  [B-DONE] GeneratedImages payload: 4.8MB
  [TMPL]   CrossGrid assembled — 5-view output complete
  ```

### Phase 6 — 검증

- [ ] **T6-1** 실제 건물 사진으로 엔드투엔드 테스트
- [ ] **T6-2** 콘솔 UI와 터미널 로그 동기화 확인
- [ ] **T6-3** CrossGrid 비례 정확도 검증 (template-layout.txt 스펙 대비)
- [ ] **T6-4** 보안: API 키 클라이언트 노출 없음 확인

---

## 6. 파일별 변경 범위 요약

| 파일 | 작업 | 비고 |
|------|------|------|
| `server/index.ts` | **신규 생성** | Express 서버 진입점 |
| `server/protocolLoader.ts` | **신규 생성** | Protocol 파일 동적 로드 |
| `server/services/aiService.ts` | **신규 생성** | 서버 측 Protocol A |
| `server/services/imageGenService.ts` | **신규 생성** | 서버 측 Protocol B |
| `src/services/aiService.ts` | **교체** | 서버 API 호출로 전환 |
| `src/services/imageGenService.ts` | **교체** | 서버 API 호출로 전환 |
| `src/types.ts` | **수정** | AEPLSchema 타입 추가 |
| `src/components/CrossGrid.tsx` | **수정** | CSS 변수 방식 적용 |
| `src/App.tsx` | **수정** | SSE 구독 추가 |
| `.env` | **수정** | VITE_ 제거, 서버 전용 키 |
| `package.json` | **수정** | `"server"` 스크립트 추가 |
| `Protocol/*.txt` | **유지** | 참조 소스 (수정 없음) |

---

## 7. 우선순위 및 실행 순서

```
T1-1 → T1-2 → T1-3   (서버 기반 구축)
     ↓
T2-1 → T2-2           (Protocol A 정비)
     ↓
T3-1                  (Protocol B 실구현 — 핵심)
     ↓
T4-1 → T5-1 → T5-2   (Template + 로깅)
     ↓
T6-1 → T6-4           (검증)
```

**총 예상 작업 단위:** 14개 태스크
**핵심 블로커:** T3-1 (Gemini 이미지 생성 API 호출 — 모델 가용성 확인 필요)

---

## 8. 주요 참조 파일 매핑

| 참조 대상 | 소스 파일 | 사용 방식 |
|----------|----------|----------|
| Protocol A 시스템 프롬프트 | `Protocol/# sys-prompt-image to elevation-v7.txt` | `fs.readFile` → 문자열 주입 |
| AEPS-v4 데이터 철학 | `Protocol/AEPS-v4.txt` | `fs.readFile` → 시스템 프롬프트 prefix |
| 입면 작성 기준 | `Protocol/전개도작성 가이드라인.txt` | Protocol B 프롬프트 조립 참조 |
| 출력 레이아웃 비례 | `Protocol/template-layout.txt` | CrossGrid CSS 변수 계산 기준 |
| 모델명 | `.env` (`ANALYSIS_MODEL`, `GENERATION_MODEL`) | 환경변수 참조 |
| API 키 | `.env` (`GEMINI_API_KEY`) | 서버 전용, 클라이언트 미노출 |

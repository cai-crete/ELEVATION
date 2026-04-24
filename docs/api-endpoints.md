# ELEVATION API Endpoints — 엔드포인트 설계 문서

**서비스 URL**: `https://elevation-rose.vercel.app`  
**버전**: V7  
**최종 수정**: 2026-04-24

---

## 공통 사항

| 항목 | 내용 |
|------|------|
| Base URL | `https://elevation-rose.vercel.app` |
| Content-Type | `application/json` |
| 인증 | 없음 (서버 간 통신, CAI_CANVAS 전용) |
| CORS | `*` (모든 오리진 허용) |
| Timeout | 최대 120초 (Vercel maxDuration 설정) |

---

## 엔드포인트 목록

### 1. POST `/api/process` — 건물 이미지 → 입면도 5뷰 생성 (All-in-One)

CAI_CANVAS에서 이미지 아트보드를 ELEVATION 탭으로 전환할 때 호출되는 주 엔드포인트입니다.  
Protocol A (분석) → Protocol B (이미지 생성) 순서로 실행합니다.

**Request Body:**
```json
{
  "imageBase64": "<base64 string — data URI prefix 없음>",
  "mimeType": "image/jpeg",
  "prompt": ""
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "aeplSchema": {
      "aepl_schema_version": "7.0.4",
      "width": 10,
      "height": 15,
      "depth": 8,
      "articulation": {
        "base_height": 2.5,
        "body_rhythm": "regular bay spacing with punched windows",
        "top_structure": "flat roof with parapet",
        "void_ratio": 0.35
      },
      "inferred_views": {
        "right": "...",
        "left": "...",
        "rear": "...",
        "top": "..."
      },
      "materials": {
        "base": "concrete panel",
        "secondary": "aluminum cladding",
        "glass": "clear double-glazed",
        "pbr": { "roughness": 0.6, "metallic": 0.1, "reflectivity": 0.3 }
      },
      "analysis_logs": ["Phase 1...", "Phase 2...", "Phase 3...", "Phase 4..."]
    },
    "images": {
      "front": "data:image/jpeg;base64,...",
      "rear":  "data:image/jpeg;base64,...",
      "right": "data:image/jpeg;base64,...",
      "left":  "data:image/jpeg;base64,...",
      "top":   "data:image/jpeg;base64,..."
    }
  }
}
```

**Response 500:**
```json
{ "success": false, "error": "Protocol A failed on both models: ..." }
```

**처리 흐름:**
- Protocol A: `aiService.analyzeElevation()` → Gemini Vision → AEPLSchema JSON
- Protocol B: `imageGenService.generateElevationImages()` → Gemini Image Gen → 5-view data URIs
- front: 원본 이미지 패스스루 (Master-Priority 원칙)
- rear/right/left/top: Gemini 병렬 생성

**파일 위치:**
- Vercel endpoint: `api/process.ts`
- 서비스: `server/services/aiService.ts`, `server/services/imageGenService.ts`

---

### 2. POST `/api/analyze` — Protocol A 단독 실행

AEPLSchema만 추출할 때 사용합니다. Protocol B(이미지 생성)는 실행하지 않습니다.

**Request Body:**
```json
{
  "imageBase64": "<base64 string>",
  "mimeType": "image/jpeg",
  "prompt": ""
}
```

**Response 200:**
```json
{
  "success": true,
  "aepl": { ...AEPLSchema }
}
```

**파일 위치:** `api/analyze.ts`

---

### 3. POST `/api/generate` — Protocol B 단독 실행

AEPLSchema가 이미 있을 때 이미지만 생성합니다.

**Request Body:**
```json
{
  "aepl": { ...AEPLSchema },
  "originalImageBase64": "<base64 string>"
}
```

**Response 200:**
```json
{
  "success": true,
  "images": {
    "front": "data:image/jpeg;base64,...",
    "rear":  "data:image/jpeg;base64,...",
    "right": "data:image/jpeg;base64,...",
    "left":  "data:image/jpeg;base64,...",
    "top":   "data:image/jpeg;base64,..."
  }
}
```

**파일 위치:** `api/generate.ts`

---

### 4. POST `/api/linedrawing` — Protocol LD: 5뷰 이미지 → 라인드로잉 변환

**신규 엔드포인트 (2026-04-24 추가)**

ELEVATION 출력 노드의 5장 이미지를 건축 기술도면(CAD) 스타일 라인드로잉으로 변환합니다.  
CAI_CANVAS의 "LINE DRAWING GENERATE" 버튼이 이 엔드포인트를 호출합니다.

**Request Body:**
```json
{
  "images": {
    "front": "data:image/jpeg;base64,...",
    "rear":  "data:image/jpeg;base64,...",
    "right": "data:image/jpeg;base64,...",
    "left":  "data:image/jpeg;base64,...",
    "top":   "data:image/jpeg;base64,..."
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "images": {
      "front": "data:image/png;base64,...",
      "rear":  "data:image/png;base64,...",
      "right": "data:image/png;base64,...",
      "left":  "data:image/png;base64,...",
      "top":   "data:image/png;base64,..."
    }
  }
}
```

**Response 400:**
```json
{ "success": false, "error": "Missing image views: rear, top" }
```

**Response 500:**
```json
{ "success": false, "error": "Line drawing model returned no image for view 'front'. ..." }
```

**처리 흐름:**
1. 5개 뷰 이미지를 `generateLineDrawings()` 서비스로 전달
2. 각 이미지에 대해 Gemini multimodal 호출 (이미지 입력 → 이미지 출력)
3. `responseModalities: ['IMAGE', 'TEXT']` 필수 설정
4. Primary 실패 시 Fallback 모델로 재시도
5. 5개 뷰 병렬 처리 (`Promise.all`)

**모델 환경변수:**
| 변수명 | 기본값 | 용도 |
|--------|--------|------|
| `LINE_DRAW_MODEL` | `gemini-2.0-flash-exp` | Primary 모델 |
| `LINE_DRAW_FALLBACK` | `gemini-2.0-flash` | Fallback 모델 |

**파일 위치:**
- Vercel endpoint: `api/linedrawing.ts`
- 서비스: `server/services/lineDrawingService.ts`

---

### 5. GET `/api/stream` — SSE 연결 스텁 (미완성)

Vercel 서버리스 환경에서는 SSE 영구 연결을 유지할 수 없습니다.  
현재는 `connected` 이벤트 후 즉시 종료합니다. 향후 구현 필요.

**파일 위치:** `api/stream.ts`

---

## 환경변수

Vercel Dashboard → Project Settings → Environment Variables에서 설정합니다.

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `GEMINI_API_KEY` | **필수** | Google Gemini API 키 |
| `ANALYSIS_MODEL` | 선택 | Protocol A 기본 모델 (기본: `gemini-3-pro-preview`) |
| `ANALYSIS_FALLBACK` | 선택 | Protocol A 폴백 모델 (기본: `gemini-2.5-pro`) |
| `GENERATION_MODEL` | 선택 | Protocol B 기본 모델 (기본: `gemini-3-pro-image-preview`) |
| `GENERATION_FALLBACK` | 선택 | Protocol B 폴백 모델 (기본: `gemini-2.0-flash-exp-image-generation`) |
| `LINE_DRAW_MODEL` | 선택 | Protocol LD 기본 모델 (기본: `gemini-2.0-flash-exp`) |
| `LINE_DRAW_FALLBACK` | 선택 | Protocol LD 폴백 모델 (기본: `gemini-2.0-flash`) |

---

## CAI_CANVAS S2S 프록시 경로

CAI_CANVAS Next.js 앱에서 CORS 및 API 키 노출 없이 호출하기 위한 서버사이드 프록시입니다.

| CAI-CANVAS 경로 | → | ELEVATION 백엔드 |
|----------------|---|-----------------|
| `POST /api/elevation/process` | → | `POST /api/process` |
| `POST /api/elevation/linedrawing` | → | `POST /api/linedrawing` |

---

COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.

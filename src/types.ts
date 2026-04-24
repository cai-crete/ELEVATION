// src/types.ts
// CAI ELEVATION V7 — 공유 타입 정의
// Protocol A/B 및 Template 전체에서 참조하는 단일 소스

export type ViewState = 'upload' | 'generating' | 'result';

/** Protocol A → B 핸드오버 규격 (AEPL Schema v7.0.4) */
export interface AEPLSchema {
  aepl_schema_version: string; // "7.0.4"

  // 1_Geometry_MASTER — 형태 확정자
  width: number;   // X축 상대 비례
  height: number;  // Z축 상대 비례
  depth: number;   // Y축 상대 비례

  articulation: {
    base_height: number;   // 기단부 높이 비율
    body_rhythm: string;   // 중단부 입면 패턴
    top_structure: string; // 상단부 지붕 유형
    void_ratio: number;    // 0.0~1.0 (개구부 비율)
  };

  inferred_views: {
    right: string; // 우측면 건축 언어
    left: string;  // 좌측면 건축 언어
    rear: string;  // 배면 건축 언어
    top: string;   // 평면/지붕 서술
  };

  // 2_Property_SLAVE — 정보 귀속자
  materials: {
    base: string;      // 주 외장재
    secondary: string; // 보조 외장재
    glass: string;     // 유리 유형
    pbr: {
      roughness: number;    // 0.0~1.0
      metallic: number;     // 0.0~1.0
      reflectivity: number; // 0.0~1.0
    };
  };

  analysis_logs: string[]; // Phase별 분석 로그
}

/** Protocol B 출력 — 5개 뷰 이미지 (data URL 또는 base64) */
export interface GeneratedImages {
  front: string; // 원본 이미지 (가시권 최우선)
  rear: string;
  right: string;
  left: string;
  top: string;
}

/** CrossGrid props용 (AEPLSchema 부분집합 — 비례 파라미터만) */
export interface ArchitectureParams {
  width: number;
  depth: number;
  height: number;
}

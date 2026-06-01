# Solar Anomaly Detection Dashboard

태양광 발전량 조작(SA: Scaling Attack) 탐지를 시각화하는 React 기반 대시보드.

`entro2` LightGBM forecaster + `test_ver7` zone-specific detector 파이프라인의
추론 결과 CSV를 업로드하면, 시계열 재생과 함께 적발 구간·잔차·attack_prob 을
한 화면에서 확인할 수 있습니다.

## Features

- 📂 **CSV 업로드** — 드래그앤드롭 / 클릭 선택, idle / loading / ready / error 4상태 UX
- ⏯️ **시계열 재생 컨트롤** — Play / Pause / Reset, 속도 x1·x2·x6
- 📊 **KPI 카드 4종** — 현재 power_ratio · GHI/zone · 라벨 적발 · 공격 타입 누적
- 📈 **시계열 차트** — 측정 PR vs forecaster 예측 ŷ, 적발 구간 ReferenceArea
- 🔍 **탐지 파이프라인 시각화** — Forecaster → GHI Zone 분기 → Zone-specific Detector
- ⚖️ **최종 판정** — no-data / monitoring / suspect / confirmed 4상태 hero 카드

## Tech Stack

- **React 18** + **Vite 6**
- **Tailwind CSS v4**
- **Recharts** (시계열 차트)
- **lucide-react** (아이콘)

## Getting Started

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
```

## CSV Schema

대시보드가 인식하는 컬럼:

| 컬럼 | 필수 | 설명 |
|---|---|---|
| `timestamp` | ✅ | 측정 시각 |
| `power_ratio` | ✅ | 측정 발전량 비율 (0–1) |
| `site`, `capacity_kw` | | 발전소 메타 |
| `ghi`, `temp` | | 기상 입력 |
| `power_ratio_pred` (또는 `predicted`) | | forecaster 예측값 |
| `residual_raw`, `residual_pr` | | 사전 계산된 잔차 |
| `attack_label`, `attack_type`, `attack_ratio` | | ground truth 라벨 |
| `attack_prob`, `final_pred` | | detector 출력 |

## Pipeline Spec

- **Forecaster**: LightGBM, 35 feature (GHI lag/diff/slope/rolling + 시간 + capacity)
- **GHI Zone**: `excluded (< 200)` / `mid (300–545)` / `high (≥ 545)`
- **Detector**: zone-specific LightGBM
  - mid → PR residual + GHI features
  - high → Raw residual + GHI features
- **Threshold**: mid `0.45` / high `0.55`
- **Window scales**: 5분 간격 × `[6, 12, 24, 36, 48]` = 30/60/120/180/240분

## Project Structure

```
src/
├── SolarEdgeDashboard.jsx     # 메인 composition
├── main.jsx                   # 엔트리
├── index.css                  # Tailwind import + base
├── api/
│   └── dataset.js             # CSV 파서 + zone 분류
├── utils/
│   └── format.js              # 시각 포맷 유틸
└── components/
    ├── Header.jsx             # Hero 헤더
    ├── StatusPill.jsx         # 재사용 상태 pill
    ├── DataSourcePanel.jsx    # CSV 업로드 UI
    ├── ControlBar.jsx         # 재생 컨트롤
    ├── KpiCards.jsx           # KPI 4종
    ├── TimelineChart.jsx      # Recharts 시계열
    ├── PipelinePanel.jsx      # 탐지 파이프라인 3단계
    └── VerdictPanel.jsx       # 최종 판정 hero
```

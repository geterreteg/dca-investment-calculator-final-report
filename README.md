# 定期定額投資試算網站

## 專案簡介

本專案為「財金資訊系統開發期末報告」作品，主題是定期定額投資試算網站。系統提供互動式輸入欄位，讓大學生、小資族與投資新手可以試算長期投資成果，理解期初投入、每月投入、年化報酬率、管理費率、通膨率與目標金額之間的關係。

網站會自動計算期末資產、累積投入本金、投資損益、投資報酬率、通膨後購買力，以及若要達成目標金額每月應投入多少。同時使用 Recharts 呈現資產成長、本金累積與通膨後購買力線，並提供保守、基本、樂觀三種情境比較。

## 使用技術

- React
- Vite
- Tailwind CSS
- Recharts
- JavaScript
- HTML / CSS

## 安裝方式

請先確認電腦已安裝 Node.js 與 npm。

```bash
npm install
```

## 執行方式

開發模式：

```bash
npm run dev
```

建立正式版本：

```bash
npm run build
```

預覽正式版本：

```bash
npm run preview
```

## 系統功能

- 使用者可輸入期初投入金額、每月投入金額、預估年化報酬率、投資年期、年管理費率、年通膨率與目標金額。
- 系統即時計算期末資產、累積本金、投資損益、投資報酬率、通膨後購買力與目標金額反推每月投入金額。
- 使用者可輸入常見台股 ETF 代碼，系統透過後端 API 查詢 Yahoo Finance 近 5 年歷史價格，估算年化報酬率並自動帶入欄位。
- 使用 Recharts 製作每一年資產成長圖，包含期末資產線、累積本金線與通膨後購買力線。
- 提供保守、基本、樂觀三種情境比較。
- 可匯出 txt 試算結果，內容包含輸入參數、試算結果、情境比較與免責聲明。
- 網頁支援電腦與手機瀏覽。

## ETF 報酬率自動查詢

第一版支援以下常見台股 ETF：

- 0050 元大台灣50
- 0056 元大高股息
- 006208 富邦台50
- 00692 富邦公司治理
- 00713 元大台灣高息低波
- 00878 國泰永續高股息
- 00881 國泰台灣5G+
- 00919 群益台灣精選高息
- 00923 群益台ESG低碳50
- 00929 復華台灣科技優息

API 路徑：

```text
GET /api/etf-return?symbol=0050
```

系統會優先使用 adjusted close 計算近 5 年年化報酬率；若資料不足，會以可取得期間估算並在畫面顯示提醒。若查詢失敗，使用者仍可手動輸入預估年化報酬率。

## Vercel 部署方式

本專案包含 Vercel serverless API，可部署到 Vercel。

- Framework Preset：Vite
- Build Command：`npm run build`
- Output Directory：`dist`
- API Function：`api/etf-return.js`

部署前請執行：

```bash
npm install
npm run build
```

## 專案資料夾結構

```text
dca-investment-calculator-final-report/
├─ api/
│  └─ etf-return.js
├─ index.html
├─ package.json
├─ postcss.config.js
├─ tailwind.config.js
├─ vercel.json
├─ vite.config.js
├─ README.md
├─ 操作說明書.md
├─ 期末報告簡報.md
├─ demo-data.txt
└─ src/
   ├─ App.jsx
   ├─ index.css
   └─ main.jsx
```

## 注意事項

- 本系統採用情境試算，所有結果都會受到使用者輸入假設影響。
- 報酬率、管理費與通膨率皆為估計值，不代表未來實際投資結果。
- ETF 報酬率由 Yahoo Finance 歷史價格資料估算，資料來源非官方 API，僅供課程展示與情境試算使用。
- 本系統僅供財金資訊系統開發課程報告與情境試算使用，不構成任何投資建議。

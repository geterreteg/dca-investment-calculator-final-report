import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const disclaimer =
  "本系統僅供財金資訊系統開發課程報告與情境試算使用，不構成任何投資建議。實際投資仍須考量個人風險承受度、市場波動、稅費與金融商品特性。";

const etfDataDisclaimer =
  "ETF 報酬率由 Yahoo Finance 歷史價格資料估算，資料來源非官方 API，僅供課程展示與情境試算使用，不代表未來績效。";

const supportedEtfs = [
  ["0050", "元大台灣50"],
  ["0056", "元大高股息"],
  ["006208", "富邦台50"],
  ["00692", "富邦公司治理"],
  ["00713", "元大台灣高息低波"],
  ["00878", "國泰永續高股息"],
  ["00881", "國泰台灣5G+"],
  ["00919", "群益台灣精選高息"],
  ["00923", "群益台ESG低碳50"],
  ["00929", "復華台灣科技優息"],
];

const initialInputs = {
  initialAmount: 10000,
  monthlyAmount: 3000,
  annualReturn: 6,
  years: 10,
  annualFee: 0.3,
  inflation: 2,
  targetAmount: 1000000,
};

const inputFields = [
  ["initialAmount", "期初投入金額", "元", "一開始投入市場的金額"],
  ["monthlyAmount", "每月投入金額", "元", "每個月固定投入的金額"],
  ["annualReturn", "預估年化報酬率", "%", "可手動輸入，也可由台股 ETF 代碼自動估算"],
  ["years", "投資年期", "年", "預計持續投資的時間"],
  ["annualFee", "年管理費率 / 交易成本", "%", "基金管理費、平台費或交易成本估計"],
  ["inflation", "年通膨率", "%", "用來估計未來資產的實質購買力"],
  ["targetAmount", "目標金額", "元", "希望在期末達成的資產目標"],
];

function currency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function percent(value) {
  return `${(Number.isFinite(value) ? value : 0).toFixed(2)}%`;
}

function monthlyRateFromAnnual(annualPercent) {
  const annualDecimal = annualPercent / 100;
  if (annualDecimal <= -0.99) return -0.99;
  return Math.pow(1 + annualDecimal, 1 / 12) - 1;
}

function simulateInvestment(inputs, returnAdjustment = 0) {
  const years = Math.max(1, Number(inputs.years) || 1);
  const months = Math.round(years * 12);
  const initialAmount = Math.max(0, Number(inputs.initialAmount) || 0);
  const monthlyAmount = Math.max(0, Number(inputs.monthlyAmount) || 0);
  const netAnnualReturn =
    (Number(inputs.annualReturn) || 0) + returnAdjustment - (Number(inputs.annualFee) || 0);
  const monthlyReturn = monthlyRateFromAnnual(netAnnualReturn);
  const monthlyInflation = monthlyRateFromAnnual(Number(inputs.inflation) || 0);

  let asset = initialAmount;
  const yearlyData = [
    {
      year: "第0年",
      asset,
      principal: initialAmount,
      realValue: asset,
    },
  ];

  for (let month = 1; month <= months; month += 1) {
    asset = asset * (1 + monthlyReturn) + monthlyAmount;
    if (month % 12 === 0 || month === months) {
      const yearNumber = Math.min(years, month / 12);
      const principal = initialAmount + monthlyAmount * month;
      const realValue = asset / Math.pow(1 + monthlyInflation, month);
      yearlyData.push({
        year: `第${Number.isInteger(yearNumber) ? yearNumber : yearNumber.toFixed(1)}年`,
        asset,
        principal,
        realValue,
      });
    }
  }

  const principal = initialAmount + monthlyAmount * months;
  const profit = asset - principal;
  const roi = principal > 0 ? (profit / principal) * 100 : 0;
  const realValue = asset / Math.pow(1 + monthlyInflation, months);

  return {
    asset,
    principal,
    profit,
    roi,
    realValue,
    yearlyData,
    netAnnualReturn,
    months,
    monthlyReturn,
  };
}

function requiredMonthlyInvestment(inputs) {
  const target = Math.max(0, Number(inputs.targetAmount) || 0);
  const years = Math.max(1, Number(inputs.years) || 1);
  const months = Math.round(years * 12);
  const initialAmount = Math.max(0, Number(inputs.initialAmount) || 0);
  const netAnnualReturn = (Number(inputs.annualReturn) || 0) - (Number(inputs.annualFee) || 0);
  const r = monthlyRateFromAnnual(netAnnualReturn);
  const initialFutureValue = initialAmount * Math.pow(1 + r, months);
  const remaining = target - initialFutureValue;
  if (remaining <= 0) return 0;
  if (Math.abs(r) < 0.000001) return remaining / months;
  return remaining / (((Math.pow(1 + r, months) - 1) / r) || months);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-soft">
      <p className="mb-2 font-semibold text-slate-800">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} style={{ color: item.color }} className="leading-6">
          {item.name}：{currency(item.value)}
        </p>
      ))}
    </div>
  );
}

function App() {
  const [inputs, setInputs] = useState(initialInputs);
  const [etfCode, setEtfCode] = useState("0050");
  const [etfLoading, setEtfLoading] = useState(false);
  const [etfError, setEtfError] = useState("");
  const [etfInfo, setEtfInfo] = useState(null);

  const result = useMemo(() => simulateInvestment(inputs), [inputs]);
  const monthlyNeeded = useMemo(() => requiredMonthlyInvestment(inputs), [inputs]);
  const scenarios = useMemo(() => {
    const base = simulateInvestment(inputs, 0);
    return [
      ["保守情境", -2, "市場表現較弱時的估計"],
      ["基本情境", 0, "依照使用者輸入條件估計"],
      ["樂觀情境", 2, "市場表現較佳時的估計"],
    ].map(([name, adjustment, note]) => {
      const data = simulateInvestment(inputs, adjustment);
      return {
        name,
        adjustment,
        note,
        asset: data.asset,
        profit: data.profit,
        diff: data.asset - base.asset,
      };
    });
  }, [inputs]);

  const handleChange = (key, value) => {
    setInputs((current) => ({
      ...current,
      [key]: value === "" ? "" : Number(value),
    }));
  };

  const handleEtfLookup = async () => {
    const symbol = etfCode.trim();
    setEtfLoading(true);
    setEtfError("");

    try {
      const response = await fetch(`/api/etf-return?symbol=${encodeURIComponent(symbol)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "查詢失敗，請手動輸入報酬率。");
      }

      setEtfInfo(data);
      setInputs((current) => ({
        ...current,
        annualReturn: data.annualizedReturn,
      }));
    } catch (error) {
      setEtfInfo(null);
      setEtfError(error.message || "查詢失敗，請手動輸入報酬率。");
    } finally {
      setEtfLoading(false);
    }
  };

  const exportText = () => {
    const etfLines = etfInfo
      ? [
          `ETF 代碼：${etfInfo.symbol}`,
          `ETF 名稱：${etfInfo.name}`,
          `ETF 報酬率資料來源：${etfInfo.source}`,
          `ETF 報酬率計算期間：${etfInfo.startDate} 至 ${etfInfo.endDate}，約 ${etfInfo.periodYears} 年`,
          `ETF 近年年化報酬率：${etfInfo.annualizedReturn}%`,
          `ETF 資料提醒：${etfInfo.warning || etfDataDisclaimer}`,
        ]
      : ["ETF 報酬率資料：未使用自動查詢，採手動輸入報酬率。"];

    const lines = [
      "定期定額投資試算網站 - 試算結果",
      "",
      "一、使用者輸入參數",
      ...etfLines,
      `期初投入金額：${currency(inputs.initialAmount)}`,
      `每月投入金額：${currency(inputs.monthlyAmount)}`,
      `預估年化報酬率：${inputs.annualReturn}%`,
      `投資年期：${inputs.years} 年`,
      `年管理費率 / 交易成本：${inputs.annualFee}%`,
      `年通膨率：${inputs.inflation}%`,
      `目標金額：${currency(inputs.targetAmount)}`,
      "",
      "二、試算結果",
      `期末資產：${currency(result.asset)}`,
      `累積投入本金：${currency(result.principal)}`,
      `投資損益：${currency(result.profit)}`,
      `投資報酬率：${percent(result.roi)}`,
      `通膨後購買力：${currency(result.realValue)}`,
      `若要達成目標金額，每月應投入：約 ${currency(monthlyNeeded)}`,
      "",
      "三、三種情境比較",
      ...scenarios.map(
        (item) =>
          `${item.name}：期末資產 ${currency(item.asset)}，投資損益 ${currency(
            item.profit
          )}，與基本情境差距 ${currency(item.diff)}`
      ),
      "",
      "四、資料來源與免責聲明",
      etfDataDisclaimer,
      disclaimer,
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "定期定額投資試算結果.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const summaryCards = [
    ["期末資產", currency(result.asset), "長期投入與複利後的預估總資產", "bg-emerald-50 text-emerald-700"],
    ["累積本金", currency(result.principal), "期初投入加上每月投入的總和", "bg-sky-50 text-sky-700"],
    ["投資損益", currency(result.profit), `投資報酬率 ${percent(result.roi)}`, "bg-amber-50 text-amber-700"],
    ["通膨後購買力", currency(result.realValue), "把通膨影響折回今天購買力", "bg-rose-50 text-rose-700"],
    ["每月需投入金額", currency(monthlyNeeded), "為達成目標金額的反推結果", "bg-violet-50 text-violet-700"],
  ];

  return (
    <main className="min-h-screen bg-[#f5f7fb]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-14">
          <div className="flex flex-col justify-center">
            <p className="mb-3 text-sm font-semibold text-emerald-700">財金資訊系統開發期末報告</p>
            <h1 className="text-4xl font-bold tracking-normal text-slate-950 sm:text-5xl">
              定期定額投資試算網站
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              用互動式試算理解複利、成本與通膨對長期投資的影響
            </p>
            <div className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <b className="block text-slate-900">ETF 自動估算</b>
                輸入台股 ETF 代碼，帶入近 5 年年化報酬率
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <b className="block text-slate-900">即時計算結果</b>
                資產、本金、損益與實質購買力
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <b className="block text-slate-900">比較三種情境</b>
                保守、基本、樂觀一眼比較
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white shadow-soft">
            <p className="text-sm text-slate-300">基本情境期末資產</p>
            <p className="mt-3 text-4xl font-bold">{currency(result.asset)}</p>
            <div className="mt-6 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.yearlyData}>
                  <defs>
                    <linearGradient id="assetPreview" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.75} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" hide />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="asset"
                    name="期末資產"
                    stroke="#34d399"
                    strokeWidth={3}
                    fill="url(#assetPreview)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              投入本金 {currency(result.principal)}，預估投資損益 {currency(result.profit)}。
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950">輸入區</h2>
                <p className="text-sm text-slate-500">可手動試算，也可用 ETF 代碼估算報酬率</p>
              </div>
              <button
                onClick={() => {
                  setInputs(initialInputs);
                  setEtfCode("0050");
                  setEtfInfo(null);
                  setEtfError("");
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                重設
              </button>
            </div>

            <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-900">台股 ETF 代碼</span>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={etfCode}
                    onChange={(event) => {
                      setEtfCode(event.target.value.replace(/[^\d]/g, ""));
                      setEtfError("");
                    }}
                    placeholder="0050、0056、006208、00878、00919"
                    inputMode="numeric"
                    className="min-w-0 flex-1 rounded-lg border border-emerald-300 bg-white px-3 py-3 text-base font-semibold text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />
                  <button
                    type="button"
                    onClick={handleEtfLookup}
                    disabled={etfLoading}
                    className="rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {etfLoading ? "查詢中..." : "查詢近5年年化報酬率"}
                  </button>
                </div>
              </label>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                支援：{supportedEtfs.map(([code]) => code).join("、")}。查詢失敗時仍可手動填寫報酬率。
              </p>
              {etfInfo && (
                <div className="mt-3 rounded-lg bg-white p-3 text-sm leading-6 text-slate-700">
                  <p className="font-bold text-emerald-800">
                    {etfInfo.symbol} {etfInfo.name}：近年年化報酬率 {etfInfo.annualizedReturn}%
                  </p>
                  <p>
                    期間：{etfInfo.startDate} 至 {etfInfo.endDate}，約 {etfInfo.periodYears} 年；來源：
                    {etfInfo.source}
                  </p>
                  <p className="text-xs text-slate-500">{etfInfo.warning || etfDataDisclaimer}</p>
                </div>
              )}
              {etfError && (
                <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                  {etfError}
                </p>
              )}
            </div>

            <div className="grid gap-4">
              {inputFields.map(([key, label, unit, hint]) => (
                <label key={key} className="block">
                  <span className="mb-1 flex items-center justify-between gap-2 text-sm font-semibold text-slate-800">
                    {label}
                    <span className="text-xs font-medium text-slate-400">{unit}</span>
                  </span>
                  <input
                    type="number"
                    min={key === "annualReturn" || key === "annualFee" || key === "inflation" ? -50 : 0}
                    step={key.includes("Amount") || key === "targetAmount" ? 1000 : 0.1}
                    value={inputs[key]}
                    onChange={(event) => handleChange(key, event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base font-semibold text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{hint}</span>
                  {key === "annualReturn" && etfInfo && (
                    <span className="mt-1 block text-xs leading-5 text-emerald-700">
                      已由 {etfInfo.symbol} {etfInfo.name} 的近年年化報酬率帶入，可依個人假設再手動調整。
                    </span>
                  )}
                </label>
              ))}
            </div>
            <button
              onClick={exportText}
              className="mt-6 w-full rounded-lg bg-slate-950 px-4 py-3 text-base font-bold text-white transition hover:bg-emerald-700"
            >
              匯出試算結果
            </button>
          </div>

          <div className="space-y-6">
            <section>
              <h2 className="mb-4 text-xl font-bold text-slate-950">結果卡片區</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {summaryCards.map(([title, value, note, color]) => (
                  <div key={title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
                    <div className={`mb-4 inline-flex rounded-lg px-3 py-1 text-xs font-bold ${color}`}>
                      {title}
                    </div>
                    <p className="break-words text-2xl font-bold text-slate-950">{value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
              <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">每一年資產成長圖</h2>
                  <p className="text-sm text-slate-500">
                    同時呈現期末資產、累積本金與通膨後購買力
                  </p>
                </div>
                <p className="text-sm font-semibold text-emerald-700">
                  淨年化報酬率：{percent(result.netAnnualReturn)}
                </p>
              </div>
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.yearlyData} margin={{ top: 12, right: 16, left: 12, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                    <XAxis dataKey="year" tick={{ fill: "#475569", fontSize: 12 }} />
                    <YAxis
                      tick={{ fill: "#475569", fontSize: 12 }}
                      tickFormatter={(value) => `${Math.round(value / 10000)}萬`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: 12 }} />
                    <Line type="monotone" dataKey="asset" name="期末資產" stroke="#059669" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="principal" name="累積本金線" stroke="#0284c7" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="realValue" name="通膨後購買力線" stroke="#e11d48" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-bold text-slate-950">情境比較區</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {scenarios.map((item) => (
                  <div key={item.name} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="text-lg font-bold text-slate-950">{item.name}</h3>
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                        {item.adjustment > 0 ? "+" : ""}
                        {item.adjustment}%
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{item.note}</p>
                    <dl className="mt-5 space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-slate-500">期末資產</dt>
                        <dd className="font-bold text-slate-950">{currency(item.asset)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-slate-500">投資損益</dt>
                        <dd className="font-bold text-slate-950">{currency(item.profit)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-slate-500">與基本情境差距</dt>
                        <dd className={item.diff >= 0 ? "font-bold text-emerald-700" : "font-bold text-rose-700"}>
                          {currency(item.diff)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-2xl font-bold text-slate-950">報告說明區</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              ["系統目的", "用互動式網站協助使用者理解定期定額、複利、費用與通膨如何改變長期投資成果。"],
              ["使用對象", "大學生、小資族、投資新手，以及需要用簡單方式建立投資規劃概念的使用者。"],
              ["解決的痛點", "多數新手不知道報酬率要填多少，因此系統可透過台股 ETF 代碼估算近年年化報酬率。"],
              ["產品特色", "即時計算、ETF 報酬率查詢、圖表視覺化、情境比較、目標金額反推與 txt 匯出。"],
              ["系統提供的洞見 insight", "長期投資成果不只取決於報酬率，也受到投入紀律、成本控制與通膨侵蝕影響。"],
              ["免責聲明", `${etfDataDisclaimer} ${disclaimer}`],
            ].map(([title, text]) => (
              <article key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-bold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;

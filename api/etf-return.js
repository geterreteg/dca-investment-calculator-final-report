const supportedEtfs = {
  "0050": "元大台灣50",
  "0056": "元大高股息",
  "006208": "富邦台50",
  "00692": "富邦公司治理",
  "00713": "元大台灣高息低波",
  "00878": "國泰永續高股息",
  "00881": "國泰台灣5G+",
  "00919": "群益台灣精選高息",
  "00923": "群益台ESG低碳50",
  "00929": "復華台灣科技優息",
};

const dayMs = 24 * 60 * 60 * 1000;

function sendJson(response, status, payload) {
  response.status(status).json(payload);
}

function formatDate(timestampSeconds) {
  return new Date(timestampSeconds * 1000).toISOString().slice(0, 10);
}

function pickValidPricePoint(timestamps, adjustedPrices, closePrices, fromStart = true) {
  const length = timestamps.length;
  for (let offset = 0; offset < length; offset += 1) {
    const index = fromStart ? offset : length - 1 - offset;
    const adjustedPrice = adjustedPrices?.[index];
    const closePrice = closePrices?.[index];
    const price =
      Number.isFinite(adjustedPrice) && adjustedPrice > 0
        ? adjustedPrice
        : Number.isFinite(closePrice) && closePrice > 0
          ? closePrice
          : null;

    if (price) {
      return {
        price,
        timestamp: timestamps[index],
        usedAdjustedClose: Number.isFinite(adjustedPrice) && adjustedPrice > 0,
      };
    }
  }

  return null;
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  const rawSymbol = String(request.query.symbol || "").trim();
  const symbol = rawSymbol.replace(/\D/g, "");

  if (!/^\d{4,6}$/.test(symbol)) {
    return sendJson(response, 400, {
      error: "ETF 代碼格式錯誤，請輸入 4 到 6 位數字。",
    });
  }

  if (!supportedEtfs[symbol]) {
    return sendJson(response, 404, {
      error: "目前第一版僅支援 10 檔常見台股 ETF，請改用支援清單內的代碼或手動輸入報酬率。",
      supportedSymbols: Object.keys(supportedEtfs),
    });
  }

  const yahooSymbol = `${symbol}.TW`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol
  )}?range=5y&interval=1d&events=history&includeAdjustedClose=true`;

  try {
    const yahooResponse = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DCAInvestmentCalculator/1.0; +https://vercel.app)",
      },
    });

    if (!yahooResponse.ok) {
      return sendJson(response, 502, {
        error: "查詢失敗，請手動輸入報酬率。",
      });
    }

    const data = await yahooResponse.json();
    const chart = data?.chart?.result?.[0];
    const timestamps = chart?.timestamp || [];
    const quote = chart?.indicators?.quote?.[0] || {};
    const adjustedPrices = chart?.indicators?.adjclose?.[0]?.adjclose;
    const closePrices = quote.close;

    if (!timestamps.length || (!adjustedPrices?.length && !closePrices?.length)) {
      return sendJson(response, 404, {
        error: "查無足夠歷史價格資料，請手動輸入報酬率。",
      });
    }

    const start = pickValidPricePoint(timestamps, adjustedPrices, closePrices, true);
    const end = pickValidPricePoint(timestamps, adjustedPrices, closePrices, false);

    if (!start || !end || end.timestamp <= start.timestamp) {
      return sendJson(response, 404, {
        error: "查無足夠歷史價格資料，請手動輸入報酬率。",
      });
    }

    const periodYears = (end.timestamp - start.timestamp) * 1000 / (365.25 * dayMs);
    const annualizedReturn = (Math.pow(end.price / start.price, 1 / periodYears) - 1) * 100;
    const warnings = [];

    if (periodYears < 4.8) {
      warnings.push("此 ETF 歷史資料未滿 5 年，系統以可取得期間估算。");
    }

    if (!start.usedAdjustedClose || !end.usedAdjustedClose) {
      warnings.push("Yahoo Finance 未提供完整 adjusted close，系統改用收盤價估算。");
    }

    return sendJson(response, 200, {
      symbol,
      name: supportedEtfs[symbol],
      annualizedReturn: Number(annualizedReturn.toFixed(2)),
      periodYears: Number(periodYears.toFixed(2)),
      startDate: formatDate(start.timestamp),
      endDate: formatDate(end.timestamp),
      source: "Yahoo Finance",
      warning: warnings.length ? warnings.join(" ") : null,
    });
  } catch (error) {
    return sendJson(response, 500, {
      error: "查詢失敗，請手動輸入報酬率。",
    });
  }
}

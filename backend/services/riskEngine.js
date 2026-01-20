// WHO 2021 guideline-inspired defaults (24h for PM, ozone is tricky depending on dataset availability).
// We'll keep ozone optional if not available or unit mismatch.
// Values in µg/m³.
const WHO_BASE = {
  pm25: 15,  // 24h guideline
  pm10: 45,  // 24h guideline
  o3: 60     // 8h guideline (only if reliably provided)
};

// Safety factors for sensitive groups (design choice)
const FACTORS = {
  normal: 1.0,
  asthma: 0.7,
  child: 0.7,
  elderly: 0.7
};

function normalizeGroup(g) {
  const x = String(g || "normal").toLowerCase();
  return ["normal", "asthma", "child", "elderly"].includes(x) ? x : "normal";
}

function computeThresholds(groupType) {
  const g = normalizeGroup(groupType);
  const f = FACTORS[g] ?? 1.0;
  return {
    pm25: Number((WHO_BASE.pm25 * f).toFixed(1)),
    pm10: Number((WHO_BASE.pm10 * f).toFixed(1)),
    o3: Number((WHO_BASE.o3 * f).toFixed(1))
  };
}

function evaluateRisk({ pm25, pm10, o3, groupType }) {
  const thresholds = computeThresholds(groupType);

  const reasons = [];
  const checks = [];

  if (pm25 != null) {
    const over = pm25 > thresholds.pm25;
    checks.push({ pollutant: "PM2.5", value: pm25, limit: thresholds.pm25, over });
    if (over) reasons.push(`PM2.5 is above your limit (${pm25} > ${thresholds.pm25})`);
  }
  if (pm10 != null) {
    const over = pm10 > thresholds.pm10;
    checks.push({ pollutant: "PM10", value: pm10, limit: thresholds.pm10, over });
    if (over) reasons.push(`PM10 is above your limit (${pm10} > ${thresholds.pm10})`);
  }
  // Ozone may be missing or inconsistent. Use if present.
  if (o3 != null) {
    const over = o3 > thresholds.o3;
    checks.push({ pollutant: "O₃", value: o3, limit: thresholds.o3, over });
    if (over) reasons.push(`O₃ is above your limit (${o3} > ${thresholds.o3})`);
  }

  // Risk level logic (simple, explainable)
  let level = "OK";
  const overCount = checks.filter(c => c.over).length;

  if (overCount >= 2) level = "HIGH";
  else if (overCount === 1) level = "MEDIUM";

  const recommendation =
    level === "HIGH"
      ? "Risky: avoid outdoor exercise, keep windows closed, consider a mask if you must go out."
      : level === "MEDIUM"
        ? "Moderate risk: limit long outdoor activity; sensitive users should be cautious."
        : "Good: air quality is acceptable for your selected group right now.";

  // UX-friendly label mapping
  const label = level === "HIGH" ? "Risky" : level === "MEDIUM" ? "Moderate" : "Good";

  return { level, label, thresholds, reasons, checks, recommendation };
}

module.exports = { evaluateRisk, normalizeGroup };

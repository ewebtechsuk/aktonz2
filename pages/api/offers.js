const { sendMailGraph } = require("../../lib/ms-graph");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const {
    name,
    email,
    phone,
    offerAmount,
    propertyId,
    propertyTitle,
    message,
    frequency,
    depositAmount,
    ...rest
  } = req.body || {};

  const toNumber = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return null;
  };

  const formatCurrency = (value) => {
    const numeric = toNumber(value);
    if (numeric === null) {
      return value ?? "";
    }

    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 2,
    }).format(numeric);
  };

  const hasValue = (value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim() !== "";
    return true;
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const rows = [
    ["Name", name || ""],
    ["Email", email || ""],
  ];

  if (hasValue(phone)) {
    rows.push(["Phone", phone || ""]);
  }

  if (hasValue(offerAmount)) {
    rows.push(["Offer amount", formatCurrency(offerAmount)]);
  }

  if (hasValue(frequency)) {
    rows.push(["Offer frequency", frequency || ""]);
  }

  if (hasValue(depositAmount)) {
    rows.push(["Holding deposit", formatCurrency(depositAmount)]);
  }

  if (hasValue(propertyTitle)) {
    rows.push(["Property title", propertyTitle || ""]);
  }

  rows.push(["Property ID", propertyId || ""]);

  if (hasValue(message)) {
    rows.push(["Message", message || ""]);
  }

  for (const [key, value] of Object.entries(rest || {})) {
    rows.push([key, value]);
  }

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:4px 8px;background:#f7f7f7;border:1px solid #ddd;">${escapeHtml(
          label
        )}</th><td style="padding:4px 8px;border:1px solid #ddd;">${escapeHtml(
          value
        )}</td></tr>`
    )
    .join("");

  try {
    await sendMailGraph({
      to: ["info@aktonz.com"],
      subject: propertyId
        ? `Offer for ${propertyId}: ${hasValue(offerAmount) ? formatCurrency(offerAmount) : "N/A"}`
        : "aktonz.com offer submission",
      html: `<h2 style="font-family:Arial,sans-serif;">Offer submission</h2><table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">${htmlRows}</table>`,
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || "Failed to send message" });
  }
};

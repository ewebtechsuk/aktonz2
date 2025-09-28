const { sendMailGraph } = require("../../lib/ms-graph");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const { name, email, phone, address, details } = req.body || {};

  try {
    await sendMailGraph({
      to: ["valuations@aktonz.com"],
      subject: `Valuation request: ${address || "Unknown address"}`,
      html: `<p><b>Name:</b> ${name || ""}</p><p><b>Email:</b> ${email || ""}</p><p><b>Phone:</b> ${phone || ""}</p><p><b>Address:</b> ${address || ""}</p><p><b>Details:</b> ${details || ""}</p>`,
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || "Failed to send message" });
  }
};

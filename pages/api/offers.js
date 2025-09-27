const { sendMailGraph } = require("../../lib/ms-graph");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const { name, email, phone, offerAmount, propertyId, notes } = req.body || {};

  try {
    await sendMailGraph({
      to: ["info@aktonz.com"],
      subject: `Offer for ${propertyId || "property"}: £${offerAmount || "N/A"}`,
      html: `<p><b>Name:</b> ${name || ""}</p><p><b>Email:</b> ${email || ""}</p><p><b>Phone:</b> ${phone || ""}</p><p><b>Offer:</b> £${offerAmount || ""}</p><p><b>Notes:</b> ${notes || ""}</p>`,
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || "Failed to send message" });
  }
};

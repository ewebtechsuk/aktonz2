const { sendMailGraph } = require("../../lib/ms-graph");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const { name, email, message } = req.body || {};

  try {
    await sendMailGraph({
      to: ["info@aktonz.com"],
      subject: `New contact from ${name || "Unknown"}`,
      html: `<p><b>From:</b> ${name || ""} (${email || ""})</p><p>${message || ""}</p>`,
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, error: error?.message || "Failed to send message" });
  }
};

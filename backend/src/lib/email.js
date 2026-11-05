const nodemailer = require('nodemailer')
// const sgKey = process.env.SENDGRID_API_KEY;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const useNodeMailer = () => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_ADDRESS,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  return transporter;
}

/* const sendReuseAlert = async ({ userId, ip, device, refreshToken }) => {
  await transporter.sendMail({
    from: process.env.ALERT_FROM_EMAIL,
    to: process.env.ALERT_TO_EMAIL,
    subject: "⚠️ Refresh Token Reuse Detected",
    html: `
      <h2>Security Alert: Token Reuse Detected</h2>
      <p><strong>User ID:</strong> ${userId}</p>
      <p><strong>IP Address:</strong> ${ip}</p>
      <p><strong>Device:</strong> ${device}</p>
      <p><strong>Refresh Token:</strong> ${refreshToken}</p>
    `,
  });
}; */

const requestSendMail = async (params) => {
  const transporter = useNodeMailer();
  await transporter.sendMail({
    from: params.from || process.env.EMAIL_ADDRESS,
    to: params.to || process.env.EMAIL_ADDRESS, // If no recipient is provided, send to the default email address.
    subject: params.subject || `New message!!`,
    text: params.text || ``,
    html: params.html || ``
  });
}

/* if (foundToken.isInvalidated || tokenNotInWhitelist) {
   await sendReuseAlert({
      userId: foundToken.userId,
      ip: req.ip,
      device: req.headers["user-agent"],
      refreshToken,
   });

  //  return res.status(403).json({ error: "Token reuse detected" });
}

if (sgKey) {
  // SendGrid implementation
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(sgKey);

  sendReuseAlert = async ({ userId, ip, device, tokenId, note }) => {
    const msg = {
      to: process.env.ALERT_TO_EMAIL,
      from: process.env.ALERT_FROM_EMAIL || process.env.SMTP_USER,
      subject: `Security Alert: Refresh token reuse detected (user=${userId || 'unknown'})`,
      html: `
        <h2>Refresh Token Reuse Detected</h2>
        <p><strong>User ID:</strong> ${userId || 'unknown'}</p>
        <p><strong>IP:</strong> ${ip || 'unknown'}</p>
        <p><strong>Device:</strong> ${device || 'unknown'}</p>
        <p><strong>Token id:</strong> ${tokenId || 'unknown'}</p>
        <p><strong>Note:</strong> ${note || ''}</p>
        <hr/>
        <p>Recommended actions: revoke sessions, force logout, require password reset.</p>
      `
    };

    await sgMail.send(msg);
  };
} else {
  // Nodemailer fallback
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  sendReuseAlert = async ({ userId, ip, device, tokenId, note }) => {
    await transporter.sendMail({
      from: process.env.ALERT_FROM_EMAIL || process.env.SMTP_USER,
      to: process.env.ALERT_TO_EMAIL,
      subject: `Security Alert: Refresh token reuse detected (user=${userId || 'unknown'})`,
      html: `
        <h2>Refresh Token Reuse Detected</h2>
        <p><strong>User ID:</strong> ${userId || 'unknown'}</p>
        <p><strong>IP:</strong> ${ip || 'unknown'}</p>
        <p><strong>Device:</strong> ${device || 'unknown'}</p>
        <p><strong>Token id:</strong> ${tokenId || 'unknown'}</p>
        <p><strong>Note:</strong> ${note || ''}</p>
        <hr/>
        <p>Recommended actions: revoke sessions, force logout, require password reset.</p>
      `
    });
  };
}

console.warn("TOKEN REUSE DETECTED:", {
  userId: foundToken.userId,
  ip: req.ip,
  userAgent: req.headers["user-agent"]
}); */

module.exports = { requestSendMail };
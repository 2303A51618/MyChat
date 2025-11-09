let cachedTransporter = null;

async function createTransporter() {
  if (cachedTransporter) return cachedTransporter;

  try {
    // dynamic import so the module won't crash if nodemailer is not installed
    const nodemailer = await import('nodemailer');
    // build transport options and only add auth when provided
    const transportOptions = {
      host: process.env.SMTP_HOST || '127.0.0.1',
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      secure: false,
    };
    if (process.env.SMTP_USER) {
      transportOptions.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      };
    }

    const transporter = nodemailer.createTransport(transportOptions);
    // verify transporter connectivity early to fail fast and provide clearer logs
    try {
      await transporter.verify();
      console.log('[mailer] transporter verified and ready');
    } catch (verifyErr) {
      console.warn('[mailer] transporter verification failed:', verifyErr && verifyErr.message);
      // still return transporter so runtime send attempts can show real errors
    }

    cachedTransporter = transporter;
    return cachedTransporter;
  } catch (err) {
    // nodemailer not installed or failed to load — fall back to a no-op logger
    console.warn('[mailer] nodemailer is not available. OTPs will be logged to the console instead of being emailed. Install nodemailer and set SMTP_* env vars to enable real email sending.');
    return null;
  }
}

export const sendOtpEmail = async (to, otp) => {
  const from = process.env.FROM_EMAIL || process.env.SMTP_USER || 'no-reply@example.com';
  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h2>Your verification code</h2>
      <p>Use the following one-time code to verify your account:</p>
      <div style="font-size:28px; letter-spacing:6px; font-weight:700;">${otp}</div>
      <p>This code expires in 10 minutes.</p>
    </div>
  `;

  const msg = {
    from,
    to,
    subject: 'Your verification code',
    html,
  };

  const transporter = await createTransporter();
  if (!transporter) {
    // Development fallback: log the OTP so developers can copy it for testing.
    console.info(`[mailer] (fallback) OTP for ${to}: ${otp}`);
    return Promise.resolve({ fallback: true, otp });
  }

  try {
    const res = await transporter.sendMail(msg);
    console.log('[mailer] sent email to', to);
    return res;
  } catch (err) {
    console.error('[mailer] failed to send email:', err);
    // Provide richer guidance for common connectivity errors
    if (err && err.code === 'ETIMEDOUT') {
      console.error('[mailer] connection timed out. Possible causes: wrong SMTP host/port, network egress blocked by host (some platforms block SMTP), or remote SMTP server is unreachable.');
    }
    // don't throw — allow the signup flow to continue for local dev, but surface the error
    return Promise.resolve({ error: true, details: err.message, code: err.code });
  }
};

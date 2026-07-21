const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function isConfigured() {
  return Boolean(env.email.host && env.email.user && env.email.password);
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: env.email.port === 465,
      auth: { user: env.email.user, pass: env.email.password },
    });
  }
  return transporter;
}

const SEVERITY_COLORS = { CRITICAL: '#e34948', WARNING: '#eda100', INFO: '#378add' };

function renderInsightsHtml(user, insights) {
  const rows = insights
    .map(
      (i) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #1e304f;">
          <span style="display:inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; color: #03122a; background: ${SEVERITY_COLORS[i.severity] || '#378add'};">${i.severity}</span>
          <div style="margin-top: 6px; font-weight: 600; color: #ffffff; font-size: 15px;">${i.title}</div>
          <div style="margin-top: 2px; color: #94a3b8; font-size: 13px;">${i.description}</div>
        </td>
      </tr>`
    )
    .join('');

  return `
  <div style="background:#03122a; padding: 32px; font-family: -apple-system, Segoe UI, Roboto, sans-serif;">
    <div style="max-width: 480px; margin: 0 auto; background:#0c1930; border-radius: 12px; padding: 24px; border: 1px solid #1e304f;">
      <div style="font-size: 18px; font-weight: 700; color: #ffffff;">Insight<span style="color:#378add;">IQ</span></div>
      <p style="color:#94a3b8; font-size: 14px; margin-top: 4px;">Hi ${user.name}, here's your latest data summary.</p>
      <table style="width:100%; margin-top: 16px; border-collapse: collapse;">${rows}</table>
      <p style="color:#52617a; font-size: 12px; margin-top: 20px;">You're receiving this because insights were found across your connected data sources.</p>
    </div>
  </div>`;
}

/**
 * Emails a user a digest of their recent insights. No-ops (with a log)
 * rather than throwing when SMTP isn't configured, so the scheduled scan
 * job keeps running even without email set up.
 */
async function sendInsightsDigest(user, insights) {
  if (insights.length === 0) return;
  if (!isConfigured()) {
    console.log(`[email] SMTP not configured — skipping digest for ${user.email} (${insights.length} insight(s)).`);
    return;
  }

  await getTransporter().sendMail({
    from: env.email.from,
    to: user.email,
    subject: `InsightIQ: ${insights.length} new insight${insights.length === 1 ? '' : 's'} from your data`,
    html: renderInsightsHtml(user, insights),
  });
}

module.exports = { sendInsightsDigest, isConfigured };

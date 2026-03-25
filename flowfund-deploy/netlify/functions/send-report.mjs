// netlify/functions/send-report.mjs
// Sends the FlowFund diagnostic report to the user via Resend (free tier: 3,000 emails/month)
// Activate: add RESEND_API_KEY to Netlify environment variables

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const RESEND_API_KEY = Netlify.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'Email service not configured yet' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let data;
  try {
    data = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }

  const { email, name, reportData } = data;
  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ error: 'Valid email required' }), { status: 400 });
  }

  const r = reportData || {};
  const sym = r.currency === 'USD' ? '$' : r.currency === 'GBP' ? '£' : '₹';
  const scoreColor = r.health_score >= 70 ? '#2D5A3D' : r.health_score >= 50 ? '#B5620A' : '#A02020';
  const scoreLabel = r.health_score >= 70 ? 'Healthy' : r.health_score >= 50 ? 'Moderate' : 'Needs Attention';

  const htmlEmail = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Your FlowFund Financial Report</title></head>
<body style="margin:0;padding:0;background:#F5F3EE;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:32px 20px">

  <div style="background:#1A1A18;padding:28px 32px;border-radius:8px 8px 0 0">
    <div style="font-size:24px;font-weight:700;color:#4ADE80;font-family:Georgia,serif;margin-bottom:4px">FlowFund</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:.08em">Financial Diagnostic Report</div>
  </div>

  <div style="background:#fff;padding:28px 32px;border-left:1px solid #ddd;border-right:1px solid #ddd">
    <p style="font-size:13px;color:#888;margin-bottom:4px">Hi ${name || 'there'},</p>
    <p style="font-size:15px;color:#1A1A18;margin-bottom:24px;line-height:1.6">Here is your FlowFund financial diagnostic. Keep this as your baseline and compare it every quarter.</p>

    <div style="background:#F5F3EE;border-radius:8px;padding:20px 24px;margin-bottom:24px;text-align:center">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:8px">Financial Health Score</div>
      <div style="font-size:52px;font-weight:700;color:${scoreColor};font-family:Georgia,serif;line-height:1">${r.health_score || '—'}</div>
      <div style="font-size:14px;font-weight:700;color:${scoreColor};margin-top:4px">${scoreLabel}</div>
    </div>

    <table width="100%" cellpadding="0" cellspacing="8" style="margin-bottom:24px">
      <tr>
        <td style="text-align:center;padding:14px 8px;background:#F5F3EE;border-radius:6px;width:23%">
          <div style="font-size:18px;font-weight:700;color:#2D5A3D">${sym}${Number(r.monthly_income||0).toLocaleString('en-IN')}</div>
          <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-top:3px">Income/mo</div>
        </td>
        <td style="text-align:center;padding:14px 8px;background:#F5F3EE;border-radius:6px;width:23%">
          <div style="font-size:18px;font-weight:700;color:#B5620A">${r.expense_pct || 0}%</div>
          <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-top:3px">Spent</div>
        </td>
        <td style="text-align:center;padding:14px 8px;background:#F5F3EE;border-radius:6px;width:23%">
          <div style="font-size:18px;font-weight:700;color:#1A4A7A">${r.savings_pct || 0}%</div>
          <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-top:3px">Saved</div>
        </td>
        <td style="text-align:center;padding:14px 8px;background:#F5F3EE;border-radius:6px;width:23%">
          <div style="font-size:18px;font-weight:700;color:#2D5A3D">${r.emergency_months || 0}mo</div>
          <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-top:3px">Buffer</div>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-collapse:collapse;border:1px solid #eee;border-radius:6px;overflow:hidden">
      <tr style="background:#1A1A18"><td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,0.55)">Key numbers</td></tr>
      <tr style="border-bottom:1px solid #eee"><td style="padding:10px 16px;font-size:13px;color:#555">Monthly income</td><td style="padding:10px 16px;font-size:13px;font-weight:700;color:#1A1A18;text-align:right">${sym}${Number(r.monthly_income||0).toLocaleString('en-IN')}</td></tr>
      <tr style="border-bottom:1px solid #eee;background:#fafaf8"><td style="padding:10px 16px;font-size:13px;color:#555">Total expenses</td><td style="padding:10px 16px;font-size:13px;font-weight:700;color:#B5620A;text-align:right">${sym}${Number(r.total_expenses||0).toLocaleString('en-IN')} (${r.expense_pct}%)</td></tr>
      <tr style="border-bottom:1px solid #eee"><td style="padding:10px 16px;font-size:13px;color:#555">Total savings</td><td style="padding:10px 16px;font-size:13px;font-weight:700;color:#1A4A7A;text-align:right">${sym}${Number(r.total_savings||0).toLocaleString('en-IN')} (${r.savings_pct}%)</td></tr>
      <tr style="border-bottom:1px solid #eee;background:#fafaf8"><td style="padding:10px 16px;font-size:13px;color:#555">Debt-to-income</td><td style="padding:10px 16px;font-size:13px;font-weight:700;color:${Number(r.debt_to_income||0)>30?'#A02020':'#2D5A3D'};text-align:right">${r.debt_to_income || 0}% ${Number(r.debt_to_income||0)>30?'⚠':'✓'}</td></tr>
      <tr style="border-bottom:1px solid #eee"><td style="padding:10px 16px;font-size:13px;color:#555">Rewards missed/month</td><td style="padding:10px 16px;font-size:13px;font-weight:700;color:#B5620A;text-align:right">${sym}${Number(r.rewards_missed_monthly||0).toLocaleString('en-IN')} → ${sym}${(Number(r.rewards_missed_monthly||0)*12).toLocaleString('en-IN')}/yr</td></tr>
      ${Number(r.tax_saving_potential||0) > 0 ? `<tr style="background:#fafaf8"><td style="padding:10px 16px;font-size:13px;color:#555">Tax saving potential</td><td style="padding:10px 16px;font-size:13px;font-weight:700;color:#2D5A3D;text-align:right">₹${Number(r.tax_saving_potential||0).toLocaleString('en-IN')}/yr</td></tr>` : ''}
      <tr><td style="padding:10px 16px;font-size:13px;color:#555">Surplus / Deficit</td><td style="padding:10px 16px;font-size:13px;font-weight:700;color:${r.surplus_or_deficit?.startsWith('Surplus')?'#2D5A3D':'#A02020'};text-align:right">${r.surplus_or_deficit||'—'}</td></tr>
    </table>

    <div style="text-align:center;margin-bottom:20px">
      <a href="https://funds-planner.netlify.app" style="display:inline-block;background:#2D5A3D;color:#fff;padding:13px 28px;border-radius:6px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:.01em">Re-run your diagnostic →</a>
      <p style="font-size:11px;color:#aaa;margin-top:10px">Run this every 3 months to track your progress</p>
    </div>
  </div>

  <div style="background:#EDEAE2;padding:16px 32px;border-radius:0 0 8px 8px;border:1px solid #ddd;border-top:none;text-align:center">
    <div style="font-size:11px;color:#888;line-height:1.8">
      <strong style="color:#1A1A18">FlowFund</strong> · Financial Diagnostics<br>
      For informational purposes only. Not financial advice.<br>
      Generated ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}
    </div>
  </div>

</div>
</body>
</html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'FlowFund <reports@flowfund.in>',
        to: [email],
        subject: `Your FlowFund Report — Health Score ${r.health_score}/100`,
        html: htmlEmail
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: 'Failed to send', detail: err }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const config = {
  path: '/send-report'
};

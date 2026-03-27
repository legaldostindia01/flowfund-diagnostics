export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const RESEND_API_KEY = Netlify.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'No API key' }), { status: 503 });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }); }

  const { email, name, reportData: r = {} } = body;
  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ error: 'Valid email required' }), { status: 400 });
  }

  const scoreColor = r.health_score >= 70 ? '#2D5A3D' : r.health_score >= 50 ? '#B5620A' : '#A02020';
  const scoreLabel = r.health_score >= 70 ? 'Healthy' : r.health_score >= 50 ? 'Moderate' : 'Needs Attention';
  const sym = r.user_currency === 'USD' ? '$' : r.user_currency === 'GBP' ? '£' : '₹';
  const n = (v) => Number(v || 0).toLocaleString('en-IN');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Your FlowFund Report</title></head>
<body style="margin:0;padding:0;background:#F5F3EE;font-family:Arial,sans-serif">
<div style="max-width:580px;margin:0 auto;padding:24px 16px">
  <div style="background:#1A1A18;padding:24px 28px;border-radius:8px 8px 0 0">
    <div style="font-size:22px;font-weight:700;color:#4ADE80">FlowFund</div>
    <div style="font-size:11px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.1em;margin-top:2px">Financial Diagnostic Report</div>
  </div>
  <div style="background:#fff;padding:24px 28px;border:1px solid #ddd;border-top:none">
    <p style="font-size:15px;margin-bottom:20px;line-height:1.6">Hi ${name || r.user_name || 'there'}, here is your FlowFund financial diagnostic report.</p>
    <div style="text-align:center;background:#F5F3EE;border-radius:8px;padding:22px;margin-bottom:20px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#888;margin-bottom:4px">Financial Health Score</div>
      <div style="font-size:58px;font-weight:700;color:${scoreColor};line-height:1">${r.health_score || '?'}</div>
      <div style="font-size:14px;font-weight:700;color:${scoreColor};margin-top:4px">${scoreLabel}</div>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;font-size:13px">
      <tr style="background:#1A1A18"><td colspan="2" style="padding:8px 14px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.5)">Key Numbers</td></tr>
      <tr style="border-bottom:1px solid #eee"><td style="padding:9px 14px;color:#555">Monthly income</td><td style="padding:9px 14px;font-weight:700;text-align:right">${sym}${n(r.monthly_income)}</td></tr>
      <tr style="border-bottom:1px solid #eee;background:#fafaf8"><td style="padding:9px 14px;color:#555">Total expenses</td><td style="padding:9px 14px;font-weight:700;color:#B5620A;text-align:right">${sym}${n(r.total_expenses)} (${r.expense_pct}%)</td></tr>
      <tr style="border-bottom:1px solid #eee"><td style="padding:9px 14px;color:#555">Total savings</td><td style="padding:9px 14px;font-weight:700;color:#1A4A7A;text-align:right">${sym}${n(r.total_savings)} (${r.savings_pct}%)</td></tr>
      <tr style="border-bottom:1px solid #eee;background:#fafaf8"><td style="padding:9px 14px;color:#555">Surplus / Deficit</td><td style="padding:9px 14px;font-weight:700;text-align:right">${r.surplus_or_deficit || '—'}</td></tr>
      <tr style="border-bottom:1px solid #eee"><td style="padding:9px 14px;color:#555">Rewards missed/month</td><td style="padding:9px 14px;font-weight:700;color:#B5620A;text-align:right">${sym}${n(r.rewards_missed_monthly)}/mo</td></tr>
      <tr><td style="padding:9px 14px;color:#555">Tax saving potential</td><td style="padding:9px 14px;font-weight:700;color:#2D5A3D;text-align:right">₹${n(r.tax_saving_potential)}/yr</td></tr>
    </table>
    <div style="text-align:center">
      <a href="https://flowfunddiagnostics.netlify.app" style="display:inline-block;background:#2D5A3D;color:#fff;padding:12px 26px;border-radius:6px;font-size:14px;font-weight:700;text-decoration:none">Re-run your diagnostic →</a>
      <p style="font-size:11px;color:#aaa;margin-top:10px">Run every 3 months to track your progress</p>
    </div>
  </div>
  <div style="background:#EDEAE2;padding:14px 28px;border-radius:0 0 8px 8px;border:1px solid #ddd;border-top:none;text-align:center">
    <p style="font-size:11px;color:#888;margin:0">FlowFund · Financial Diagnostics · Not financial advice.</p>
  </div>
</div>
</body></html>`;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'FlowFund <reports@legaldostindia.com>',
        to: [email],
        reply_to: 'legaldostindia@gmail.com',
        subject: `Your FlowFund Report — Health Score ${r.health_score || '?'}/100`,
        html
      })
    });

    const result = await resp.json();

    if (!resp.ok) {
      console.error('Resend rejected:', JSON.stringify(result));
      return new Response(JSON.stringify({ error: result.message || 'Send failed', resend: result }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Fetch error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const config = { path: '/send-report' };

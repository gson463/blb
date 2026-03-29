/// <reference path="../pb_data/types.d.ts" />
/**
 * Daily 08:00 UTC: Twilio SMS when an active lease ends in 15 or 5 days.
 *
 * Credentials (first match wins):
 * 1) Environment: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 * 2) PocketBase `sms_config` row with enabled = true (set in landlord GUI → SMS & notifications)
 *
 * Phones: tenants.phone and landlord users.phone — E.164; local TZ +255 if no + prefix.
 */
cronAdd('lease-expiry-sms', '0 8 * * *', () => {
  function resolveTwilio() {
    const sidE = $os.getenv('TWILIO_ACCOUNT_SID');
    const tokenE = $os.getenv('TWILIO_AUTH_TOKEN');
    const fromE = $os.getenv('TWILIO_FROM_NUMBER');
    if (sidE && tokenE && fromE) {
      return { sid: sidE, token: tokenE, from: fromE };
    }
    try {
      const rows = $app.findRecordsByFilter('sms_config', '', '-created', 5, 0);
      if (!rows || !rows.length) {
        return null;
      }
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r) continue;
        if (!r.getBool('enabled')) continue;
        const sid = r.getString('account_sid');
        const token = r.getString('auth_token');
        const from = r.getString('twilio_phone_number');
        if (sid && token && from) {
          return { sid, token, from };
        }
      }
    } catch (e) {
      $app.logger().error('lease-expiry-sms: sms_config ' + String(e), 'error');
    }
    return null;
  }

  const creds = resolveTwilio();
  if (!creds) {
    return;
  }

  const { sid, token, from } = creds;
  let basic;
  try {
    basic = btoa(`${sid}:${token}`);
  } catch (e) {
    $app.logger().error('lease-expiry-sms: btoa failed ' + String(e), 'error');
    return;
  }

  function normalizeE164(raw) {
    const p = String(raw || '')
      .trim()
      .replace(/\s/g, '');
    if (!p) return '';
    if (p.startsWith('+')) return p;
    if (p.startsWith('0')) return '+255' + p.slice(1);
    if (p.startsWith('255')) return '+' + p;
    return '+255' + p;
  }

  function sendSms(to, body) {
    const res = $http.send({
      url: `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `To=${encodeURIComponent(to)}&From=${encodeURIComponent(from)}&Body=${encodeURIComponent(body)}`,
    });
    if (res.statusCode >= 300) {
      $app.logger().error(`Twilio HTTP ${res.statusCode}: ${String(res.json)}`, 'error');
    }
  }

  const leases = $app.findRecordsByFilter('leases', 'status = "Active"', 'end_date', 500, 0);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const lease of leases) {
    if (!lease) continue;
    const endRaw = lease.getString('end_date');
    if (!endRaw) continue;
    const end = new Date(endRaw.split(' ')[0] + 'T12:00:00Z');
    const days = Math.round((end - startOfToday) / 86400000);
    if (days !== 15 && days !== 5) continue;

    const kind = days === 15 ? '15d' : '5d';
    let already = null;
    try {
      already = $app.findFirstRecordByFilter(
        'lease_reminder_sends',
        'lease_id = {:lid} && reminder_kind = {:k}',
        { lid: lease.id, k: kind }
      );
    } catch (_) {
      already = null;
    }
    if (already) continue;

    $app.expandRecord(lease, ['tenant_id', 'property_id'], null);
    const tenant = lease.expandedOne('tenant_id');
    const property = lease.expandedOne('property_id');
    if (!tenant || !property) continue;

    $app.expandRecord(property, ['landlord_id'], null);
    const landlord = property.expandedOne('landlord_id');

    let unitLabel = 'unit';
    try {
      const u = $app.findRecordById('units', lease.getString('unit_id'));
      unitLabel = u.getString('name') || 'unit';
    } catch (_) {}

    const propName = property.getString('name') || 'property';
    const endStr = endRaw.split(' ')[0];
    const body = `Lease reminder: ${unitLabel} at ${propName} ends ${endStr} (in ${days} days). Please confirm renewal or move-out with your landlord.`;

    const tPhone = normalizeE164(tenant.getString('phone'));
    if (tPhone) sendSms(tPhone, body);

    if (landlord) {
      const lPhone = normalizeE164(landlord.getString('phone'));
      if (lPhone) {
        sendSms(
          lPhone,
          `Landlord alert: lease for ${unitLabel} / ${propName} ends ${endStr} (tenant notified, ${days}d window).`
        );
      }
    }

    const col = $app.findCollectionByNameOrId('lease_reminder_sends');
    const row = new Record(col);
    row.set('lease_id', lease.id);
    row.set('reminder_kind', kind);
    try {
      $app.save(row);
    } catch (err) {
      $app.logger().error('lease_reminder_sends: ' + String(err), 'error');
    }
  }
});

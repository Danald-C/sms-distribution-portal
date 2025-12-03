import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function SmsPortalDemo() {
  const [message, setMessage] = useState('');
  const [recipientsFile, setRecipientsFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [usage, setUsage] = useState({ daily: [], totalUnits: 0, customers: [] });
  const [balance, setBalance] = useState(0); // currency balance
  const [apiKeys, setApiKeys] = useState({ smsProvider: '', paystack: '', flutterwave: '' });

  useEffect(() => {
    // Fetch usage + account summary (demo static data)
    async function fetchSummary() {
      // Replace with real API call: /api/dashboard/summary
      const demo = {
        daily: [
          { date: '2025-09-25', units: 120 },
          { date: '2025-09-26', units: 240 },
          { date: '2025-09-27', units: 180 },
          { date: '2025-09-28', units: 300 },
          { date: '2025-09-29', units: 220 },
        ],
        totalUnits: 1060,
        customers: [
          { name: 'Alpha Corp', units: 540 },
          { name: 'Beta NGO', units: 260 },
          { name: 'Gamma Shop', units: 260 },
        ],
      };
      setUsage(demo);
      setBalance(45.50);
    }
    fetchSummary();
  }, []);

  function calculateUnits(text) {
    // Rough SMS segmentation: 160 chars per unit for GSM-7
    const chars = text.length;
    if (chars === 0) return 0;
    return Math.ceil(chars / 160);
  }

  async function handleSendSMS(e) {
    e.preventDefault();
    setSending(true);
    try {
      // Upload recipients file if provided, else send to single test number
      const form = new FormData();
      form.append('message', message);
      if (recipientsFile) form.append('recipients', recipientsFile);

      const res = await fetch('/api/sms/send', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Failed to send SMS');
      alert('Queued for sending — check dashboard for progress');
      setMessage('');
      setRecipientsFile(null);
      // refresh usage
    } catch (err) {
      alert(err.message || 'Send failed');
    } finally {
      setSending(false);
    }
  }

  function handleFileChange(e) {
    setRecipientsFile(e.target.files[0]);
  }

  // Quick mobile-money/Paystack checkout flow (client-side redirect to hosted checkout)
  async function payWithPaystack() {
    // Call server to create transaction and get authorization url
    const res = await fetch('/api/payments/paystack/create', { method: 'POST' });
    const data = await res.json();
    if (data.authorization_url) window.location.href = data.authorization_url;
  }

  async function payWithFlutterwave() {
    const res = await fetch('/api/payments/flutterwave/create', { method: 'POST' });
    const data = await res.json();
    if (data.link) window.location.href = data.link;
  }

  // UI
  return (
    <>
    <div className="min-h-screen p-6 bg-gradient-to-br from-white to-gray-50">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* {Left: Compose + Send} */}
        <div className="col-span-2 bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-2">SMS Composer</h2>
          <p className="text-sm text-gray-500 mb-4">Write your message and upload recipients (CSV: phone). SMS units: <strong>{calculateUnits(message)}</strong></p>

          <form onSubmit={handleSendSMS} className="space-y-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full border rounded-lg p-3 text-sm"
              placeholder="Type message here (160 chars = 1 unit)"
            />

            <div className="flex items-center gap-4">
              <label className="block">
                <span className="text-sm text-gray-600">Recipients (CSV)</span>
                <input onChange={handleFileChange} type="file" accept="text/csv" className="block mt-2" />
              </label>

              <div className="ml-auto">
                <button
                  type="submit"
                  disabled={sending || message.length === 0}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {sending ? 'Sending…' : 'Send SMS'}
                </button>
              </div>
            </div>

            <div className="text-xs text-gray-500">Tip: Use short messages or concatenate carefully — we bill per SMS unit.</div>
          </form>

          <hr className="my-6" />

          <h3 className="text-lg font-medium mb-3">Quick Pay (Top-up balance)</h3>
          <div className="flex gap-3 flex-wrap">
            <button onClick={payWithPaystack} className="px-4 py-2 rounded-lg border">Pay with Paystack</button>
            <button onClick={payWithFlutterwave} className="px-4 py-2 rounded-lg border">Pay with Flutterwave</button>
            <button className="px-4 py-2 rounded-lg border">Pay with MTN MoMo (coming)</button>
          </div>
        </div>

        {/* {Right: Dashboard} */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Dashboard</h3>
              <div className="text-sm text-gray-500">Account summary</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Balance</div>
              <div className="text-xl font-bold">${balance.toFixed(2)}</div>
            </div>
          </div>

          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usage.daily} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="units" stroke="#4f46e5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-500">Total SMS units used</div>
            <div className="text-2xl font-bold">{usage.totalUnits}</div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-500">Top customers</div>
            <ul className="mt-2 space-y-2">
              {usage.customers.map((c) => (
                <li key={c.name} className="flex justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="font-medium">{c.units}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>

      <footer className="max-w-6xl mx-auto mt-6 text-gray-500 text-sm">Designed for West Africa — supports Paystack & Flutterwave integrations, MTN MoMo extension, and easy billing metering.</footer>
    </div>
    </>
  );
}
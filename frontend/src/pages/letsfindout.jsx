import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function LetsFindOut() {

  return (
    <>
<div className="ml-auto">
<button type="submit" disabled={sending || message.length===0} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60">
{sending ? 'Sending…' : 'Send SMS'}
</button>
</div>


<hr className="my-6" />


<h3 className="text-lg font-medium mb-3">Quick Pay (Top-up)</h3>
<div className="flex gap-3 flex-wrap">
<button onClick={payWithPaystack} className="px-4 py-2 rounded-lg border">Pay with Paystack</button>
<button onClick={payWithFlutterwave} className="px-4 py-2 rounded-lg border">Pay with Flutterwave</button>
<button className="px-4 py-2 rounded-lg border">Pay with MTN MoMo (coming)</button>
</div>


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


<div className="mt-4"><div className="text-sm text-gray-500">Total SMS units used</div><div className="text-2xl font-bold">{usage.totalUnits}</div></div>


<div className="mt-4"><div className="text-sm text-gray-500">Top customers</div>
<ul className="mt-2 space-y-2">{usage.customers.map(c=> (<li key={c.name} className="flex justify-between text-sm"><span>{c.name}</span><span className="font-medium">{c.units}</span></li>))}</ul>
</div>
</div>


<footer className="max-w-6xl mx-auto mt-6 text-gray-500 text-sm">Designed for West Africa — supports Paystack & Flutterwave integrations, MTN MoMo extension, and easy billing metering.</footer>
    </>
  );
}
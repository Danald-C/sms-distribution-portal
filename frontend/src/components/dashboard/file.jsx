import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'

const demo = [{date:'2025-09-25',units:120},{date:'2025-09-26',units:240},{date:'2025-09-27',units:180}]

export default function Dashboard(){
    return (
    <div className="bg-white rounded-xl p-6 shadow">
      <h3 className="font-semibold">Dashboard</h3>
      <div className="h-48 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={demo}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Line type="monotone" dataKey="units" stroke="#4f46e5"/></LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
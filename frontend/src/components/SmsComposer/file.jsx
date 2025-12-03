import React, { useState } from 'react';

export default function SmsComposer(){
  const [message,setMessage]=useState('')
  const [file,setFile]=useState(null)
  const units = Math.ceil(message.length/160)||0

  async function submit(e){
    e.preventDefault()
    const form = new FormData()
    form.append('message',message)
    if(file) form.append('recipients',file)
    const res = await fetch('/api/sms/send',{method:'POST',body:form,credentials:'include'})
    if(!res.ok) return alert('Failed')
    alert('Queued')
    setMessage('')
    setFile(null)
  }

  return (
    <form className="bg-white rounded-xl p-6 shadow" onSubmit={submit}>
      <h2 className="text-lg font-semibold mb-2">Compose SMS</h2>
      <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={6} className="w-full p-3 border rounded mb-3" placeholder="Message" />
      <div className="flex items-center gap-3">
        <input type="file" accept=".csv" onChange={e=>setFile(e.target.files[0])} />
        <div className="ml-auto">Units: <strong>{units}</strong></div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded">Send</button>
      </div>
    </form>
  )
}
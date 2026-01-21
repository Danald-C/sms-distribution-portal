import React, { useState } from 'react';
import ComposeSMS from '../SmsComposer/file.jsx'

export default function GetContacts(){
  // const [message,setMessage]=useState('')
  // const [file,setFile]=useState(null)
  const [number,setNumber] = useState('')
  const [name,setName] = useState('')
  const [email,setEmail] = useState('')
  const [contacts, setContacts] = useState([])
  const [load, setLoad] = useState(false)
  // const units = Math.ceil(message.length/160)||0

  async function submit(e){
    e.preventDefault()
    const form = new FormData()
    form.append('Number', number)
    setContacts([[name, number, email], ...contacts])
    setLoad(true)
    // form.append('message',message)
    // if(file) form.append('recipients',file)
    /* const res = await fetch('/api/sms/send',{method:'POST',body:form,credentials:'include'})
    if(!res.ok) return alert('Failed') */
    // setMessage('')
    // setFile(null)
  }

  return (
    <>
      <form className="bg-white rounded-xl p-6 shadow" onSubmit={submit}>
        <h2 className="text-lg font-semibold mb-2">Provide the Contact number.</h2>
        {/* <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={6} className="w-full p-3 border rounded mb-3" placeholder="Message" /> */}
        <div className="flex items-center gap-3">
          <input type="text" value={number} onChange={e=>setNumber(e.target.value)} className="flex-grow p-3 border rounded mb-3" placeholder="Number" />
          <input type="text" value={name} onChange={e=>setName(e.target.value)} className="flex-grow p-3 border rounded mb-3" placeholder="Name (optional)" />
          <input type="text" value={email} onChange={e=>setEmail(e.target.value)} className="flex-grow p-3 border rounded mb-3" placeholder="Email (optional)" />
        </div>
        <div className="flex items-center gap-3">
          {/* <input type="file" accept=".csv" onChange={e=>setFile(e.target.files[0])} /> */}
          {/* <div className="ml-auto">Units: <strong>{units}</strong></div> */}
          <button className="px-4 py-2 bg-indigo-600 text-white rounded">Add Contact</button>
        </div>
      </form>
      <ComposeSMS props={{load, contacts}} />
    </>
  )
}
import React, { useState, useRef } from 'react';
import ComposeSMS from '../SmsComposer/sc-file.jsx'
import ContactInput from './ContactInput.jsx';
import PhoneInput from "react-phone-number-input";
import { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

export default function GetContacts(){
  const otherEventTrigger = useRef(null);
  // const [message,setMessage]=useState('')
  // const [file,setFile]=useState(null)
  const [number,setNumber] = useState('')
  const [name,setName] = useState('')
  const [email,setEmail] = useState('')
  const [contacts, setContacts] = useState([])
  const [clear, setClear] = useState(true)
  const [load, setLoad] = useState(false)
  const [alerts, setAlerts] = useState([])
  // const [phone, setPhone] = useState("");
  // const units = Math.ceil(message.length/160)||0

  // const checkNumber = {noPlus: function(){ return number.split("+")[1] }, lastNine: function(){ return this.noPlus().slice(-9) }, countryCode: function(){ return this.noPlus().length - this.lastNine().length }}
  let allAlerts = []
  
  function submit(e){
    e.preventDefault()
    // const form = new FormData()
    // form.append('Number', number)
    // clearAlerts(alerts, number);
    allAlerts = validateNumber(number);
    // if(!isValidPhoneNumber(number)){
    if(allAlerts.length > 0){
      setAlerts(allAlerts)
      allAlerts = [];
      // alert("Invalid phone number");
      // console.log(alerts)
    }else{
      allAlerts = [];
      setAlerts(allAlerts)
      setContacts([[name, number, email], ...contacts])

      setNumber('')
      setName('')
      setEmail('')
      // setClear(true)
      setLoad(true)
      
      // splitMsg.splice(target, 0, contact[0]);
    }
    // form.append('message',message)
    // if(file) form.append('recipients',file)
    /* const res = await fetch('/api/sms/send',{method:'POST',body:form,credentials:'include'})
    if(!res.ok) return alert('Failed') */
    // setMessage('')
    // setFile(null)
  }
  function getValues(e, type){
    // type == 0 && setNumber(e.target.value)
    // type == 1 && setName(e.target.value)
    // type == 2 && setEmail(e.target.value)

    // setClear(false)
  }

  return (
    <>
      {alerts.length > 0 && alerts.map(alert => (<p>{alert.message}</p>))}
      {/* <ContactInput /> */}
    {/* <div className="min-h-screen flex items-center justify-center bg-gray-100"> */}
      <form className="bg-white rounded-xl p-6 shadow bg-white p-6 rounded-2xl shadow-lg w-full max-w-md" onSubmit={submit}>
        <h2 className="text-lg font-semibold mb-2">Provide the Contact number.</h2>
        {/* <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={6} className="w-full p-3 border rounded mb-3" placeholder="Message" /> */}
        <div className="flex items-center gap-3">
          {/* <input type="text" value={clear ? '' : number} onChange={e=>getValues(e, 0)} className="flex-grow p-3 border rounded mb-3" placeholder="Number" autoFocus={ clear ? true : false} /> */}
          {/* <input type="text" value={clear ? '' : name} onChange={e=>getValues(e, 1)} className="flex-grow p-3 border rounded mb-3" placeholder="Name (optional)" />
          <input type="text" value={clear ? '' : email} onChange={e=>getValues(e, 2)} className="flex-grow p-3 border rounded mb-3" placeholder="Email (optional)" /> */}
          <PhoneInput international defaultCountry="GH" ref={otherEventTrigger} value={number} onChange={setNumber} className="border p-3 rounded-lg" />
          <input type="text" value={name} onChange={setName} className="flex-grow p-3 border rounded mb-3" placeholder="Name (optional)" />
          <input type="text" value={email} onChange={setEmail} className="flex-grow p-3 border rounded mb-3" placeholder="Email (optional)" />
        </div>
        <div className="flex items-center gap-3">
          {/* <input type="file" accept=".csv" onChange={e=>setFile(e.target.files[0])} /> */}
          {/* <div className="ml-auto">Units: <strong>{units}</strong></div> */}
          <button className="px-4 py-2 bg-indigo-600 text-white rounded">Add Contact</button>
        </div>
      </form>
    {/* </div> */}
      <ComposeSMS props={{load, contacts}} />
    </>
  )
}
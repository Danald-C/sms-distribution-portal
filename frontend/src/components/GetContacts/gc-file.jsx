import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../Contexts/auth.jsx';
import ComposeSMS from '../SmsComposer/sc-file.jsx'
import ContactInput from './ContactInput.jsx';
import PhoneInput from "react-phone-number-input";
import { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

export default function GetContacts(){
  // const otherEventTrigger = useRef(null);
  const { values: { data, functions, setStates } } = useAuth();
  // const [message,setMessage]=useState('')
  // const [file,setFile]=useState(null)
  const [number, setNumber] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const [contacts, setContacts] = useState({new_numbers: [], existing_numbers: []})
  // const [contacts, setContacts] = useState({})
  // const [contacts, setContacts] = useState([["Danald","0502653700",""],["Helena","0244246167",""],["David","0558244996",""]])
  const [clear, setClear] = useState(false)
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState({})
  let selectedOS = {single: {}, multi: [[], []], mode: 0};
  const [selectedIS, setSelectedIS] = useState(selectedOS);
  const [sendSMSTo, setSendSMSTo] = useState([]);
  // const [phone, setPhone] = useState("");
  // const units = Math.ceil(message.length/160)||


  // const checkNumber = {noPlus: function(){ return number.split("+")[1] }, lastNine: function(){ return this.noPlus().slice(-9) }, countryCode: function(){ return this.noPlus().length - this.lastNine().length }}
  let allAlerts = [];
  

  useEffect(() => {
        settingData();
    }, [])

    
    async function settingData(){
      try{
        if(data.phoneNumbersData.phone_numbers.data){
      // console.log('Wait, are you the one? ', contacts)
            setContacts({...contacts, existing_numbers: data.phoneNumbersData.phone_numbers.data});
            // setContacts({new_numbers: [], existing_numbers: data.phoneNumbersData.phone_numbers.data});
          }
        }catch(error){
          //
        }finally{
        setLoading(false)
      }
    }

  function submit(e){
    e.preventDefault();
    // const form = new FormData()
    // form.append('Number', number)
    // clearAlerts(alerts, number);
    allAlerts = functions.validateNumber(number);
    // if(!isValidPhoneNumber(number)){
    if(allAlerts.length > 0){
      setAlerts(allAlerts)
      allAlerts = [];
      // alert("Invalid phone number");
    }else{
      allAlerts = [];
      setAlerts(allAlerts)
      let newContact = {id: selectedOS.single.id || contacts.new_numbers.length, full_name: name, phone_number: number, email}
      // if(Object.keys(selected.thisData).length > 0 && selected.mode === 0){ // From existing
      if(Object.keys(selectedOS.single).length > 0){ // From existing
    // console.log("Like Seriously? ", selected);
        saveContacts([newContact], "update");
      }/* else if(Object.keys(selected.thisData).length > 0 && selected.mode == 1){ // From new
        saveContacts([newContact]);
      } */else{
        // setContacts([[name, number, email], ...contacts])
        setContacts({...contacts, new_numbers: [newContact, ...contacts.new_numbers]});
      }
        // setSelected({thisData: {}, mode: 0});
        selectedOS = {thisData: {}, mode: 0};

      setNumber('')
      setName('')
      setEmail('')
      // setClear(true)
      // setLoading(true)
    }
    // form.append('message',message)
    // if(file) form.append('recipients',file)
    /* const res = await fetch('/api/sms/send',{method:'POST',body:form,credentials:'include'})
    if(!res.ok) return alert('Failed') */
    // setMessage('')
    // setFile(null)
  }

  // async function saveContacts(contact=[], action="create", id=0){
  async function saveContacts(contact=[], action="create"){
    /* const response = await fetch('http://localhost:4000/api/auth/save-contacts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({contacts, user_id: data.user.user_id}),
    }) */
    // if(responseData.success) setContacts([]), data.user.user_id
     
    // console.log("We came here...", selected);
    if(selectedIS.mode == 1){
      contact.map(each_1 => {
        contacts.new_numbers.map((each_2, j) => {
          if(each_1.id == each_2.id){
            if(action == "update"){
              contacts.new_numbers[j] = each_1;
            }else{
              contacts.new_numbers.splice(j, 1);
            }
          }
        });
      });
          setContacts({...contacts, new_numbers: contacts.new_numbers});
    }else{
      try{
          setLoading(true)
          
          // const response = await fetch(`http://localhost:4000/api/auth/save-contacts?id=${id}&user_id=${data.user.user_id}&action=${action}`, {
          /* const response = await fetch(`http://localhost:4000/api/auth/save-contacts?user_id=${data.user.user_id}&action=${action}`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify(contact),
          })
          const responseData = await response.json();
          
          if(responseData.Success){
            // Backend updated state isn't ready immediately, so also perform update on the frontend
            let newContacts = [];
            contact.map(each_1 => {
              contacts.existing_numbers.map((each_2, j) => {
                if(each_1.id == each_2.id){
                  // if(action == "update") newContacts.push(each_1);
                  if(action == "update"){
                    contacts.existing_numbers[j] = each_1;
                  }else{
                    contacts.existing_numbers.splice(j, 1);
                  }
                }
                  else{ // Take the rest
                  newContacts.push(each_2);
                }
              });
            });

            // setContacts({...contacts, existing_numbers: newContacts});
            setContacts({...contacts, existing_numbers: contacts.existing_numbers});
          } */
      }catch(error){
          //
      }finally{
          setClear(true);
          setLoading(false);
          setAlerts([]);
      }
    }
    if(action != "remove"){
            // setSelected({thisData: {}, mode: 0});
            /* selected = {thisData: {}, mode: 0};
            setName('')
            setNumber('') */
            processSelected(selectedOS.single, 0, false);
    }
  }

  function getValues(e, type){
    // type == 0 && setNumber(e.target.value)
    type == 1 && setName(e.target.value)
    type == 2 && setEmail(e.target.value)

    setClear(false)
  }

  function processSelected(thisData, mode, remove=false){
    let callSelf = false, multiSel = selectedIS.multi[mode].filter(each => thisData.id == each.id);

    if(Object.keys(selectedOS.single).length > 0 && thisData.id == selectedOS.single.id || multiSel.length > 0){
      selectedOS = selectedIS;
      selectedOS = {...selectedOS, single: {}, mode: 0};
      selectedOS.multi[mode] = selectedOS.multi[mode].filter(each => thisData.id !== each.id);
    // console.log("End here...", selectedOS.multi[mode]);

        setName('')
        setNumber('')
      }else{
        selectedOS = selectedIS;
        selectedOS = {...selectedOS, single: thisData, mode}; // mode: From New 1 / Existing 0
        selectedOS.multi[mode].push(thisData);

        setName(thisData.full_name)
        setNumber(thisData.phone_number)
        setEmail(thisData.email)

        callSelf = true;
      }
      setSelectedIS(selectedOS)

      if(remove){
        saveContacts([thisData], "remove");

        // Reset
        if(callSelf) processSelected(thisData, mode, false);
      }

    setClear(false)
  }

  function removeMulti(mode){
    selectedOS = {...selectedOS, mode};
    saveContacts(selectedIS.multi[mode], "remove");
    setSelectedIS(selectedOS);
  }

  function prepareSMS(mode){
    let baseContacts = [contacts.existing_numbers, contacts.new_numbers], finalContacts = selectedIS.multi[mode].length > 0 ? selectedIS.multi[mode] : baseContacts[mode];
    setSendSMSTo(finalContacts);
  }

  if(loading) return <p>Loading...</p>



  return (
    <>
      {/* {alerts.length > 0 && alerts.map(alert => (<p>{alert.message}</p>))} */}
      {/* <ContactInput /> */}
      {/* <div className="min-h-screen flex items-center justify-center bg-gray-100"> */}
      {/* {loading && */}
      {alerts.length > 0 && functions.displayError(alerts)}
      {/* {!loading && console.log('Look just here, ', sendSMSTo)} */}
      <>
        <Link to="/profile" className="text-blue-500 hover:underline">Profile</Link>
          <form className="bg-white rounded-xl p-6 shadow bg-white p-6 rounded-2xl shadow-lg w-full max-w-md" onSubmit={submit}>
            <h2 className="text-lg font-semibold mb-2">Provide the Contact number.</h2>
            {/* <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={6} className="w-full p-3 border rounded mb-3" placeholder="Message" /> */}
            <div className="flex items-center gap-3">
              {/* <input type="text" value={clear ? '' : number} onChange={e=>getValues(e, 0)} className="flex-grow p-3 border rounded mb-3" placeholder="Number" autoFocus={ clear ? true : false} /> */}
              <PhoneInput international defaultCountry="GH" value={selectedOS.single.phone_number || number} onChange={setNumber} className="border p-3 rounded-lg" />
              {/* <input type="text" value={clear ? '' : selected.thisData.full_name || name} onChange={e=>getValues(e, 1)} className="flex-grow p-3 border rounded mb-3" placeholder="Name (optional)" />
              <input type="text" value={clear ? '' : selected.thisData.email || email} onChange={e=>getValues(e, 2)} className="flex-grow p-3 border rounded mb-3" placeholder="Email (optional)" /> */}
              <input type="text" value={clear ? '' : selectedOS.single.full_name || name} onChange={e=>setName(e.target.value)} className="flex-grow p-3 border rounded mb-3" placeholder="Name (optional)" />
              <input type="text" value={clear ? '' : selectedOS.single.email || email} onChange={e=>setEmail(e.target.value)} className="flex-grow p-3 border rounded mb-3" placeholder="Email (optional)" />
            </div>
            <div className="flex items-center gap-3">
              {/* <input type="file" accept=".csv" onChange={e=>setFile(e.target.files[0])} /> */}
              {/* <div className="ml-auto">Units: <strong>{units}</strong></div> */}
              <button className="px-4 py-2 bg-indigo-600 text-white rounded">{Object.keys(selectedOS.single).length > 0 ? "Change" : "Add"} Contact</button>
            </div>
          </form>
          <div className="items-center gap-3">
              {/* <span className="text-green-600">{ functions.displayElements(0, contacts) }</span> */}
              {!loading && 
                contacts.new_numbers.length > 0 && <><h2 className="text-green-600">New Contacts:</h2><p>When the page reloads, this List might be lost. Save them if they're important.</p></>
              }
              <ul className="text-green-600">
                {!loading &&
                  contacts.new_numbers.map((contact, index) => (
                    <li key={index} className="mr-2">
                      <input type="checkbox" checked={selectedIS.multi[1].some(each => each.id == contact.id)} onChange={() => processSelected(contact, 1)} />
                      <a href='#' onClick={() => processSelected(contact, 1)}>{contact.full_name || "No Name"}: {contact.phone_number} {contact.email}</a> | <a href='#' onClick={() => processSelected(contact, 1, true)}>Remove</a>
                    </li>
                  ))
                }
              </ul>
              {!loading && contacts.new_numbers.length > 0 && <button onClick={() => saveContacts(contacts.new_numbers)} className="px-4 py-2 bg-green-600 text-white rounded cursor-pointer">Save Contacts</button>}
              {selectedIS.multi[1].length > 0 && <button onClick={() => removeMulti(1)}>Delete Selected</button>}
              {selectedIS.multi[1].length > 0 && <button onClick={() => prepareSMS(1)}>Prepare SMS</button>}
          </div>
          <div className="items-center gap-3">
              {!loading && 
                contacts.existing_numbers.length > 0 && <h2 className="text-green-600">Existing Contacts:</h2>
              }
              <ul className="text-green-600">
                {/* <span className="text-green-600">{ functions.displayElements(0, data.phoneNumbersData.phoneNumbers.data) }</span> */}
                {!loading && 
                 contacts.existing_numbers.map((contact, index) => (
                    <li key={index} className="mr-2">
                      <input type="checkbox" checked={selectedIS.multi[0].some(each => each.id == contact.id)} onChange={() => processSelected(contact, 0)} />
                      <a href='#' onClick={() => processSelected(contact, 0)}>{contact.full_name || "No Name"}: {contact.phone_number} {contact.email}</a> | <a href='#' onClick={() => processSelected(contact, 0, true)}>Remove</a>
                    </li>
                  ))
                }
              </ul>
              {selectedIS.multi[0].length > 0 && <button onClick={() => removeMulti(0)}>Delete Selected</button>}
              {selectedIS.multi[0].length > 0 && <button onClick={() => prepareSMS(0)}>Prepare SMS</button>}
          </div>
        </>
      {/* } */}
      {/* </div> */}
      {/* <ComposeSMS props={{newContact: contacts.new_numbers, loading}} /> */}
      <ComposeSMS props={{sendSMSTo: sendSMSTo, sentState: false}} />
    </>
  )
}
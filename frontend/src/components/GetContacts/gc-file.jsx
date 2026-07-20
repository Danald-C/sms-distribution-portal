import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Contexts/auth.jsx';
import ComposeSMS from '../SmsComposer/sc-file.jsx'
import ContactInput from './ContactInput.jsx';
import PhoneInput from "react-phone-number-input";
import { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

export default function GetContacts(){
  // const otherEventTrigger = useRef(null);
  const { values: { data, functions, setStates } } = useAuth();
  const navigate = useNavigate();
  // const [message,setMessage]=useState('')
  // const [file,setFile]=useState(null)
  const [number, setNumber] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  let setContactsOS = {new_numbers: [], existing_numbers: [], all_numbers: [], groupAssociations: []};
  const [contacts, setContacts] = useState(setContactsOS);
  // const [contacts, setContacts] = useState({})
  // const [contacts, setContacts] = useState([["Danald","0502653700",""],["Helena","0244246167",""],["David","0558244996",""]])
  const [clear, setClear] = useState(false);
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState([])
  // let selectedOS = {single: {}, multi: [[], []], mode: 0};
  let selectedOS = {single: {}, multi: [[false, false], [[], []]], mode: 0};
  const [selectedIS, setSelectedIS] = useState(selectedOS);
  const [sendSMSTo, setSendSMSTo] = useState([]);
  const [toGroup, setToGroup] = useState({showAddToGroup: false, activeGroup: {id: "all"}, addToGroup: {}, contactsToAdd: sendSMSTo});
  // const [phone, setPhone] = useState("");
  // const units = Math.ceil(message.length/160)||


  // const checkNumber = {noPlus: function(){ return number.split("+")[1] }, lastNine: function(){ return this.noPlus().slice(-9) }, countryCode: function(){ return this.noPlus().length - this.lastNine().length }}
  let allAlerts = [];
  

// console.log("Just get the Index: ", ["Mango", "Banana", "Orange"].findIndex(each => each == "Orange"));

  useEffect(() => {
        settingData();
    }, [])

    
    async function settingData(){
      try{
        // console.log('Wait, are you the one? ', selectedIS)
        if(data.phoneNumbersData.phone_numbers.data){
            setContacts({...contacts, existing_numbers: data.phoneNumbersData.phone_numbers.data, all_numbers: data.phoneNumbersData.phone_numbers.data, groupAssociations: data.phoneNumbersData.phoneNumGrpAssociations.data});
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
      selectedOS = selectedIS;
      let newContact = {id: selectedOS.single.id || contacts.new_numbers.length, full_name: name, phone_number: number, email}
      // if(Object.keys(selected.thisData).length > 0 && selected.mode === 0){ // From existing
      if(Object.keys(selectedOS.single).length > 0){ // From existing
        // saveContacts([newContact], selectedIS.mode, "update");
        prepState("update-contact", {contact: [newContact], mode: selectedOS.mode, action: "update"});
      }/* else if(Object.keys(selected.thisData).length > 0 && selected.mode == 1){ // From new
        saveContacts([newContact]);
      } */else{
        // setContacts([[name, number, email], ...contacts])
        setContacts({...contacts, new_numbers: [newContact, ...contacts.new_numbers]});
        selectedOS = {...selectedOS, mode: 1, single: {}};
      }
      selectedOS.multi[1][selectedOS.mode] = [];
      selectedOS.multi[0][selectedOS.mode] = false;
      // console.log("Like Seriously? ", selectedOS);
      setSelectedIS(selectedOS);

      setNumber('')
      setName('')
      setEmail('')
      setClear(true)
      // setLoading(true)
    }
    // form.append('message',message)
    // if(file) form.append('recipients',file)
    /* const res = await fetch('/api/sms/send',{method:'POST',body:form,credentials:'include'})
    if(!res.ok) return alert('Failed') */
    // setMessage('')
    // setFile(null)
  }

  async function saveContacts(contact=[], mode=0, action="create"){
                  // console.log(`Check the Index`, action);
    // if(selectedIS.mode == 1){
    if(mode == 1){
      contact.map(each_1 => {
        setContactsOS.new_numbers.map((each_2, j) => {
          if(each_1.id == each_2.id){
            if(action == "update"){
              setContactsOS.new_numbers[j] = each_1;
            }else{
              setContactsOS.new_numbers.splice(j, 1);
            }
          }
        });
      });
          // setContacts({...contacts, new_numbers: contacts.new_numbers});
    }else{
      try{
          setLoading(true)
          
          if(action == "create"){
            contact = contact.filter(each_1 => !setContactsOS.all_numbers.some(each_2 => each_1.phone_number == each_2.phone_number));
            setContactsOS.new_numbers = setContactsOS.new_numbers.filter(each_1 => !contact.some(each_2 => each_1.phone_number == each_2.phone_number));
            selectedIS.multi[1][mode] = setContactsOS.new_numbers;
            if(selectedIS.multi[1][mode].length > 0) setAlerts([{from: 2, type: "caution", message: "Numbers taken already cannot be taken again."}, ...alerts]);
    // console.log("Numbers taken already cannot be taken again.");
          }
          const response = await fetch(`http://localhost:4000/api/auth/save-contacts?user_id=${data.user.user_id}&action=${action}`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify(contact),
          })
          const responseData = await response.json();
          
          if(responseData.Success){
            // Backend updated state isn't ready immediately, so also perform update on the frontend
            contact.map(each_1 => {
              if(action == "create"){
                // setContactsOS.all_numbers.push(each_1);
                setContactsOS.all_numbers = [each_1, ...setContactsOS.all_numbers];
                setContactsOS.existing_numbers = [each_1, ...setContactsOS.existing_numbers];
              }else{
                let getIndex_2_1 = setContactsOS.all_numbers.findIndex(each_2 => each_1.id == each_2.id);
                let getIndex_2_2 = setContactsOS.existing_numbers.findIndex(each_2 => each_1.id == each_2.id);
                if(action == "update"){
                  if(getIndex_2_1 > -1) setContactsOS.all_numbers[getIndex_2_1] = each_1;
                  if(getIndex_2_2 > -1) setContactsOS.existing_numbers[getIndex_2_2] = each_1;
                }
                if(action == "remove"){
                  setContactsOS.all_numbers = setContactsOS.all_numbers.filter(each_2 => each_1.id !== each_2.id);
                  setContactsOS.existing_numbers = setContactsOS.existing_numbers.filter(each_2 => each_1.id !== each_2.id);
                }
              }
            });
          }
      }catch(error){
          //
      }finally{
          setClear(true);
          setLoading(false);
      }
    }
    setContactsOS = {...setContactsOS, new_numbers: setContactsOS.new_numbers, all_numbers: setContactsOS.all_numbers, existing_numbers: setContactsOS.existing_numbers};
    setContacts(setContactsOS);
    // processNumberGroup(toGroup.activeGroup);
    selectedOS = {...selectedOS, multi: [[false, false], [[], []]]};
    setSelectedIS(selectedOS);
    // selectedIS.multi[1][mode].map(contact => processSelected(contact, mode)); // Remove those that were selected
    // if(action != "remove") processSelected(selectedOS.single, 0, false);
    
    setNumber('')
    setName('')
    setEmail('')
  }

  function getValues(e, type){
    // type == 0 && setNumber(e.target.value)
    type == 1 && setName(e.target.value)
    type == 2 && setEmail(e.target.value)

    setClear(false)
  }

  function processSelected(thisData, mode, remove=false){
    let callSelf = false, multiSel = selectedIS.multi[1][mode].filter(each => thisData.id == each.id), getContact = [contacts.existing_numbers, contacts.new_numbers];

    // console.log("End here...", selectedOS, selectedIS);
    if(Object.keys(selectedOS.single).length > 0 && thisData.id == selectedOS.single.id || multiSel.length > 0){
      selectedOS = selectedIS;
      selectedOS = {...selectedOS, single: {}, mode: 0};
      selectedOS.multi[1][mode] = selectedOS.multi[1][mode].filter(each => thisData.id !== each.id);
        if(selectedOS.multi[1][mode].length < getContact[mode].length) selectedOS.multi[0][mode] = false;

        setName('')
        setNumber('')
      }else{
        selectedOS = selectedIS;
        selectedOS = {...selectedOS, single: thisData, mode}; // mode: From New 1 / Existing 0
        selectedOS.multi[1][mode].push(thisData);
        if(selectedOS.multi[1][mode].length == getContact[mode].length) selectedOS.multi[0][mode] = true;

        setName(thisData.full_name)
        setNumber(thisData.phone_number)
        setEmail(thisData.email)

        callSelf = true;
      }
    // console.log("We came here...", selectedOS);
      setSelectedIS(selectedOS)

      if(remove){
        // saveContacts([thisData], mode, "remove");
        prepState("remove-contact", {contact: [thisData], mode, action: "remove"});

        // Reset
        if(callSelf) processSelected(thisData, mode, false);
      }

    setClear(false)
  }

  function removeMulti(mode){
    // console.log("End here...", setContactsOS, contacts);
    setContactsOS = contacts;
    selectedOS = {...selectedIS, mode: 0, single: {}};
    selectedOS.multi[0][mode] = false;
    saveContacts(selectedOS.multi[1][mode], mode, "remove");
    setSelectedIS(selectedOS);

    setNumber('')
    setName('')
    setEmail('')
  }

  function prepareSMS(mode){
    let baseContacts = [contacts.existing_numbers, contacts.new_numbers], finalContacts = selectedIS.multi[1][mode].length > 0 ? selectedIS.multi[1][mode] : baseContacts[mode];
    setSendSMSTo(finalContacts);
    if(functions.temporaryStore({name: 'sms-list', value: finalContacts})) navigate("/send-sms");
  }

  async function sendToGroup(action, mode=0){
    setContactsOS = contacts;
    selectedOS = selectedIS;
    let thisToGroup = toGroup;
    if(action && action == "show"){
      let firstGroupI = (thisToGroup.activeGroup.id == data.phoneNumbersData.phone_number_groups.data[0].id) ? 1 : 0
      thisToGroup = {...thisToGroup, showAddToGroup: true, addToGroup: data.phoneNumbersData.phone_number_groups.data[firstGroupI], contactsToAdd: selectedOS.multi[1][mode]};
      // setToGroup({...thisToGroup, showAddToGroup: true, addToGroup: data.phoneNumbersData.phone_number_groups.data[0], contactsToAdd: selectedOS.multi[1][mode]});
      selectedOS = {...selectedOS, mode};
      // setSelectedIS({...selectedOS, mode});
    }else{
      thisToGroup.addToGroup = action == "remove" ? thisToGroup.activeGroup : thisToGroup.addToGroup;
      thisToGroup.contactsToAdd = action == "remove" ? selectedOS.multi[1][0] : thisToGroup.contactsToAdd;
            // console.log("Add here...", thisToGroup);
      if(Object.keys(thisToGroup.addToGroup).length > 0){
        try{
          setLoading(true)
          
          const response = await fetch(`http://localhost:4000/api/auth/group-processor?user_id=${data.user.user_id}&action=${action}`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({group: thisToGroup.addToGroup, contacts: thisToGroup.contactsToAdd}),
              // body: JSON.stringify({group: thisToGroup, contacts: toGroup.contactsToAdd),
          })
          const responseData = await response.json();
          
          if(responseData.Success){
            thisToGroup.contactsToAdd.map(each_1 => {
              if(action == "add"){
                setContactsOS.groupAssociations.map(each_2 => {
                  console.log(`Group: ${each_2.group_id} & ${thisToGroup.addToGroup.id}`)
                  console.log(`Number: ${each_2.phone_number_id} & ${each_1.id}`)
                })
                if(!setContactsOS.groupAssociations.some(each_2 => each_2.group_id === thisToGroup.addToGroup.id && each_2.phone_number_id === each_1.id)){
            ;
                  setContactsOS.groupAssociations.push({group_id: thisToGroup.addToGroup.id, phone_number_id: each_1.id, user_id: data.user.user_id});
                }
              }
              if(action == "remove"){
                setContactsOS.groupAssociations.splice(setContactsOS.groupAssociations.findIndex(each_2 => each_2.group_id == thisToGroup.addToGroup.id && each_2.phone_number_id == each_1.id), 1);
              }
            });
            // console.log("After...", setContactsOS.groupAssociations);
                selectedOS = {...selectedOS, multi: [[false, false], [[], []]]};
            // getGroupNumbers(thisToGroup.addToGroup, setContactsOS);
            getGroupNumbers(thisToGroup.activeGroup, setContactsOS);

            thisToGroup = {...thisToGroup, showAddToGroup: false, addToGroup: {}, contactsToAdd: []};
          }
        }catch(error){
            //
        }finally{
            setLoading(false);
        }
      }else{
        setAlerts([{from: 2, type: "caution", message: "You need to select number(s) to add."}, ...alerts]);
      }
    }
    setSelectedIS(selectedOS);
    setToGroup(thisToGroup);
  }

  // function processNumberGroup(group, thisToGroup={}, setAddToGrp=false){
  function processNumberGroup(group, setAddToGrp=false){
    // let useThisToGroup = Object.keys(thisToGroup).length > 0 ? thisToGroup : toGroup, useThisSelectedIS = selectedIS, useThisContacts = setContactsOS;
    let thisToGroup = toGroup, useThisSelectedIS = selectedIS, useThisContacts = setContactsOS;
              // console.log("Set it here...", setAddToGrp, group, useThisContacts);
    if(setAddToGrp){
      thisToGroup = {...thisToGroup, addToGroup: group};
      // setToGroup(thisToGroup);
    }else{
     getGroupNumbers(group, useThisContacts);

      // useThisContacts = {...useThisContacts, existing_numbers: useThisContacts.existing_numbers};
        // setContacts(useThisContacts);

        useThisSelectedIS = {...useThisSelectedIS, mode: 0, single: {}, multi: [[false, false], [[], []]]};
        setSelectedIS(useThisSelectedIS);

        setNumber('')
        setName('')
        setEmail('')
        
      thisToGroup = {...thisToGroup, activeGroup: group, showAddToGroup: false, addToGroup: {}, contactsToAdd: []};
    }
    setToGroup(thisToGroup);

    return {toGroup: thisToGroup, selectedIS: useThisSelectedIS, contacts: useThisContacts};
  }

  function getGroupNumbers(group, contacts){
    if(group.id == 'all'){
        contacts.existing_numbers = contacts.all_numbers;
      }else{
        let sel_grp = contacts.groupAssociations.filter(each => each.group_id == group.id), getContacts = [];
        sel_grp.map(each_1 => {
          if(contacts.all_numbers.some(each_2 => each_1.phone_number_id == each_2.id)) getContacts.push(contacts.all_numbers.find(each_2 => each_1.phone_number_id == each_2.id));
        });
        contacts.existing_numbers = getContacts;
      }
      setContacts(contacts);

      // return contacts;
  }

  function processCheckAll(checked, mode){
          // console.log("End here...", mode);
    selectedIS.multi[0][mode] = checked;
    if(selectedIS.multi[0][mode]){ // First clear all already selected if in the Check All state
      selectedIS.multi[1][mode].map(contact => processSelected(contact, mode));
    }
    let selDataType = [contacts.existing_numbers, contacts.new_numbers];
    selDataType[mode].map(contact => processSelected(contact, mode));
  }

  function prepState(on, param){
    let triggers = [["active-group", "add-group", "save-numbers", "update-contact", "remove-contact"], []];

    // if(on == "active-group" || on == "save-numbers" || on == "update-contact" || on == "remove-contact"){
    if(triggers[0].some(each => each == on)){
      setContactsOS = contacts;
    // console.log("On prep...", setContactsOS, param);
      // if(on == "active-group") processNumberGroup(param);
      if(on == "active-group" || on == "add-group") processNumberGroup(param.group, param.setAddToGrp || false);
      if(on == "save-numbers") saveContacts(param.newNums, param.mode);
      if(on == "update-contact" || on == "remove-contact") saveContacts(param.contact, param.mode, param.action);
    }
    
    if(triggers[1].some(each => each == on)){
      //
    }
  }


  if(loading) return <p>Loading...</p>



  return (
    <>
      {/* <ContactInput /> */}
      {/* <div className="min-h-screen flex items-center justify-center bg-gray-100"> */}
      {/* {console.log('Look just here, ', clear)}; */}
      {alerts.length > 0 && functions.displayError(alerts)}
      <>
        {/* <Link to="/dashboard" className="text-blue-500 hover:underline">Back &laquo;</Link> */}

        {/* Add new contacts */}
          <form className="bg-white rounded-xl p-6 shadow bg-white p-6 rounded-2xl shadow-lg w-full max-w-md" onSubmit={submit}>
            <h2 className="text-lg font-semibold mb-2">Provide the Contact number.</h2>
            <div className="flex items-center gap-3">
              <PhoneInput international defaultCountry="GH" value={number} onChange={setNumber} className="border p-3 rounded-lg" autoFocus={true} />
              <input type="text" value={clear ? '' : name} onChange={e=>setName(e.target.value)} className="flex-grow p-3 border rounded mb-3" placeholder="Name (optional)" />
              <input type="text" value={clear ? '' : email} onChange={e=>setEmail(e.target.value)} className="flex-grow p-3 border rounded mb-3" placeholder="Email (optional)" />
            </div>
            <div className="flex items-center gap-3">
              {/* <input type="file" accept=".csv" onChange={e=>setFile(e.target.files[0])} /> */}
              {/* <div className="ml-auto">Units: <strong>{units}</strong></div> */}
              <button className="px-4 py-2 bg-indigo-600 text-white rounded">{Object.keys(selectedIS.single).length > 0 ? "Change" : "Add"} Contact</button>
            </div>
          </form>

          {/* Save new contacts */}
          <div className="items-center gap-3">
              {!loading && 
                contacts.new_numbers.length > 0 && <><h2 className="text-green-600">New Contacts:</h2><p>When the page reloads, this List might be lost. Save them if they're important.</p>
              <label htmlFor="check-all-new"><input id='check-all-new' type='checkbox' checked={selectedIS.multi[0][1]} onChange={e => processCheckAll(e.target.checked, 1)} /> Check All</label></>
              }
              <ul className="text-green-600">
                {!loading &&
                  contacts.new_numbers.map((contact, index) => (
                    <li key={index} className="mr-2">
                      <input type="checkbox" checked={selectedIS.multi[1][1].some(each => each.id == contact.id)} onChange={() => processSelected(contact, 1)} />
                      <a href='#' onClick={() => processSelected(contact, 1)}>{contact.full_name || "No Name"}: {contact.phone_number} {contact.email}</a> | <a href='#' onClick={() => processSelected(contact, 1, true)}>Remove</a>
                    </li>
                  ))
                }
              </ul>
              {!loading && contacts.new_numbers.length > 0 && selectedIS.multi[1][1].length > 0 && <><button onClick={() => prepState("save-numbers", {newNums: selectedIS.multi[1][1], mode: 0})} className="px-4 py-2 bg-green-600 text-white rounded cursor-pointer">Save Selected</button><button onClick={() => removeMulti(1)}>Remove Selected</button><button onClick={() => prepareSMS(1)}>Prepare SMS</button></>}
          </div>

          {/* Show saved contacts */}
          <div className="items-center gap-3">
              {!loading && <><h2 className="text-green-600">{data.phoneNumbersData.phone_number_groups.data.find(group => group.id === toGroup.activeGroup.id)?.group_name || "All"} Contacts:</h2>
              <label htmlFor="check-all-saved"><input id='check-all-saved' type='checkbox' checked={selectedIS.multi[0][0]} onChange={e => processCheckAll(e.target.checked, 0)} /> Check All</label></>}
              <ul className="text-green-600">
                {!loading && 
                 contacts.existing_numbers.length > 0 && contacts.existing_numbers.map((contact, index) => (
                    <li key={index} className="mr-2">
                      <input type="checkbox" checked={selectedIS.multi[1][0].some(each => each.id == contact.id)} onChange={() => processSelected(contact, 0)} />
                      <a href='#' onClick={() => processSelected(contact, 0)}>{contact.full_name || "No Name"}: {contact.phone_number} {contact.email}{/*  {contact.id} */}</a> {toGroup.activeGroup.id == "all" && <>| <a href='#' onClick={() => processSelected(contact, 0, true)}>Remove</a></>}
                    </li>
                  ))
                }
              </ul>
              {selectedIS.multi[1][0].length > 0 && <>{toGroup.activeGroup.id == "all" && <button onClick={() => removeMulti(0)}>Delete Selected</button>}{toGroup.activeGroup.id != "all" && <button onClick={() => sendToGroup("remove")}>Remove From Group</button>}<button onClick={() => sendToGroup("show", 0)}>Add To Group</button><button onClick={() => prepareSMS(0)}>Prepare SMS</button></>}
          </div>

          {/* Add to group */}
          {toGroup.showAddToGroup &&
          <div className="items-center gap-3">
            <h2 className="text-green-600">Add Numbers Here..</h2>
            <button onClick={() => prepState("active-group", {group: toGroup.activeGroup})}>Cancel</button>
            <select name="" id="" onChange={e => prepState("add-group", {group: data.phoneNumbersData.phone_number_groups.data[e.target.value], setAddToGrp: true})}>
              {data.phoneNumbersData.phone_number_groups.data.map((each, i) => toGroup.activeGroup.id != each.id && <option key={i} value={i}>{each.group_name}</option>)}
            </select>
            <button onClick={() => sendToGroup("add")}>Add Now</button>
          </div>}

          {/* Show groups */}
          <div className="items-center gap-3">
            <h2 className="text-green-600">Available Groups</h2>
            <ul className="text-green-600">
              <li key={0}><a href='#' onClick={() => prepState("active-group", {group: {id: 'all'}})}>All</a></li>
              {data.phoneNumbersData.phone_number_groups.data.map((each, i) => <li key={i+1}><a href='#' onClick={() => prepState("active-group", {group: each})}>{each.group_name}{/*  {each.id} */}</a></li>)}
            </ul>
          </div>
        </>
      {/* } */}
      {/* </div> */}
      {/* <ComposeSMS props={{newContact: contacts.new_numbers, loading}} /> */}
      {/* <ComposeSMS props={{sendSMSTo: sendSMSTo, sentState: false}} /> */}
    </>
  )
}
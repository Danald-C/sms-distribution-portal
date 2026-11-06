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
  const accessToken = data.accessToken;

  // const [message,setMessage]=useState('')
  // const [file,setFile]=useState(null)
  const [number, setNumber] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  // let setContactsOS = {new_numbers: [], existing_numbers: [], all_numbers: [], groupAssociations: []};
  let setContactsOS = {new_numbers: [[], 1], existing_numbers: [], all_numbers: [], groupAssociations: []};
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
  // const [toGroup, setToGroup] = useState({showAddToGroup: false, activeGroup: {id: "all"}, addToGroup: {}, contactsToAdd: sendSMSTo});
  const [toGroup, setToGroup] = useState({showAddToGroup: false, activeGroup: {id: "all"}, addToGroup: {}, contactsToAdd: []});
  // const [phone, setPhone] = useState("");
  // const units = Math.ceil(message.length/160)||


  // const checkNumber = {noPlus: function(){ return number.split("+")[1] }, lastNine: function(){ return this.noPlus().slice(-9) }, countryCode: function(){ return this.noPlus().length - this.lastNine().length }}
  let allAlerts = [];
  

// console.log("Just get the Index: ", ["Mango", "Banana", "Orange"].findIndex(each => each == "Orange"));
// console.log("Just get the Index: ", ["Mango", "Banana", "Orange", "Watermelon", "Apple"].slice(2));

  /* useEffect(() => {
      if (!data.authReady) return;

      // Never call a protected endpoint with a missing token.
      if (!accessToken) {
        console.warn("[VERIFY] No access token available. Skipping user request.");
        return;
      }
      setLoading(false);
      // functions.dataReload(data.accessToken);
      // console.log('Check for phone numbers: ', data.phoneNumbersData)

      
      setContacts({...contacts, existing_numbers: data.phoneNumbersData.phone_numbers.data, all_numbers: data.phoneNumbersData.phone_numbers.data, groupAssociations: data.phoneNumbersData.phoneNumGrpAssociations.data})
      // settingData();
  }, [data.authReady, accessToken]); */
  useEffect(() => {
    if (!data.authReady) return;

    if (!accessToken) {
        console.warn("[VERIFY] No access token available. Skipping user request.");
        return;
    }

    const phoneData = data.phoneNumbersData;

    if (!phoneData) return;

    const allNumbers = phoneData.phone_numbers?.data || [];
    const groupAssociations = phoneData.phoneNumGrpAssociations?.data || [];

    // Respect the currently selected group.
    let existingNumbers = allNumbers;

    if (toGroup.activeGroup.id !== "all") {
        const selectedGroupContacts = groupAssociations
            .filter(each => each.group_id === toGroup.activeGroup.id)
            .map(each => allNumbers.find(contact =>
                contact.id === each.phone_number_id
            ))
            .filter(Boolean);

        existingNumbers = selectedGroupContacts;
    }

    setContacts(previous => ({
        ...previous,
        existing_numbers: existingNumbers,
        all_numbers: allNumbers,
        groupAssociations
    }));

    setLoading(false);
  }, [
      data.authReady,
      accessToken,
      data.phoneNumbersData,
      toGroup.activeGroup.id
  ]);

    
    /* async function settingData(){
      try{
        let thisContent = {...contacts};
        if(data.loadContent){
          const response = await fetch(`${data.API_URL}/auth/refresh`, {
            headers: {
              Authorization: `Bearer ${data.accessToken}`,
            },
          });
          const returnedResponse = await response.json();

          if(returnedResponse.Success){
            functions.setPhoneNumbersData(returnedResponse.allData);
            thisContent = {...thisContent, existing_numbers: returnedResponse.allData.phone_numbers.data, all_numbers: returnedResponse.allData.phone_numbers.data, groupAssociations: returnedResponse.allData.phoneNumGrpAssociations.data}
          }
        }else{
          if(data.phoneNumbersData.phone_numbers.data){
            thisContent = {...thisContent, existing_numbers: data.phoneNumbersData.phone_numbers.data, all_numbers: data.phoneNumbersData.phone_numbers.data, groupAssociations: data.phoneNumbersData.phoneNumGrpAssociations.data}
          }
        }
            // setContacts({...contacts, existing_numbers: data.phoneNumbersData.phone_numbers.data, all_numbers: data.phoneNumbersData.phone_numbers.data, groupAssociations: data.phoneNumbersData.phoneNumGrpAssociations.data});
            setContacts(thisContent);
        }catch(error){
          //
        }finally{
        setLoading(false)
      }
    } */

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
      let count = contacts.new_numbers[1]+1;
      // let newContact = {id: selectedOS.single.id || contacts.new_numbers.length > 0 ? contacts.new_numbers.length+1 : 0, full_name: name, phone_number: number, email}
      let newContact = {id: selectedOS.single.id || count, full_name: name, phone_number: number, email}
      // if(Object.keys(selected.thisData).length > 0 && selected.mode === 0){ // From existing
      if(Object.keys(selectedOS.single).length > 0){ // From existing
        // saveContacts([newContact], selectedIS.mode, "update");
        prepState("update-contact", {contact: [newContact], mode: selectedOS.mode, action: "update"});
      }/* else if(Object.keys(selected.thisData).length > 0 && selected.mode == 1){ // From new
        saveContacts([newContact]);
      } */else{
      // console.log("Like Seriously? ", contacts.new_numbers);
        // setContacts({...contacts, new_numbers: [newContact, ...contacts.new_numbers]});
        setContacts({...contacts, new_numbers: [[newContact, ...contacts.new_numbers[0]], count]});
        selectedOS = {...selectedOS, mode: 1, single: {}};
      }
      selectedOS.multi[1][selectedOS.mode] = [];
      selectedOS.multi[0][selectedOS.mode] = false;
      setSelectedIS(selectedOS);

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

  async function saveContacts(contact=[], mode=0, action="create"){
                  // console.log(`Check the Index`, action);
    // if(selectedIS.mode == 1){
    if(mode == 1){
      contact.map(each_1 => {
        setContactsOS.new_numbers[0].map((each_2, j) => {
          if(each_1.id == each_2.id){
            if(action == "update"){
              setContactsOS.new_numbers[0][j] = each_1;
            }else{
              setContactsOS.new_numbers[0].splice(j, 1);
            }
          }
        });
      });
          // setContacts({...contacts, new_numbers: contacts.new_numbers});
    }else{
      try{
          setLoading(true)
          
          if(action == "create"){
            contact = contact.filter(each_1 => !setContactsOS.all_numbers.some(each_2 => each_1.phone_number == each_2.phone_number)); // Make sure no duplicates or already does not exist
            setContactsOS.new_numbers[0] = setContactsOS.new_numbers[0].filter(each_1 => !contact.some(each_2 => each_1.phone_number == each_2.phone_number)); // Make sure incoming new contacts not already collected or does not exist in the new collections list
            selectedIS.multi[1][mode] = setContactsOS.new_numbers[0];
            if(selectedIS.multi[1][mode].length > 0) setAlerts([{from: 2, type: "caution", message: "Numbers taken already cannot be taken again."}, ...alerts]);
          }
          console.log("Numbers taken already cannot be taken again.", JSON.stringify(contact));
          // const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/save-contacts?user_id=${data.user.user_id}&action=${action}`, {
          /* const response = await fetch(`${data.API_URL}/auth/save-contacts?user_id=${data.user.user_id}&action=${action}`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify(contact),
          }) */
          const response = await functions.authenticatedFetch(
              `${data.API_URL}/auth/save-contacts?action=${action}`,
              {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json",
                  },
                  body: JSON.stringify(contact),
              }
          );
          const responseData = await response.json();
          
          if(responseData.Success){
            // Backend updated state isn't ready immediately, so also perform update on the frontend
            contact.map(each_1 => {
              if(action == "create"){
                // setContactsOS.all_numbers.push(each_1);
                setContactsOS.all_numbers = [each_1, ...setContactsOS.all_numbers];
                if(toGroup.activeGroup.id == "all") setContactsOS.existing_numbers = [each_1, ...setContactsOS.existing_numbers];
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
    // let new_numbers = setContactsOS.new_numbers[0].length > 0 ? setContactsOS.new_numbers : [[], 1];
    setContactsOS = {...setContactsOS, new_numbers: setContactsOS.new_numbers, all_numbers: setContactsOS.all_numbers, existing_numbers: setContactsOS.existing_numbers};
    // setContactsOS = {...setContactsOS, new_numbers, all_numbers: setContactsOS.all_numbers, existing_numbers: setContactsOS.existing_numbers};
    setContacts(setContactsOS);
    console.log("New numbers: ", setContactsOS);
    // processNumberGroup(toGroup.activeGroup);
    selectedOS = {...selectedOS, multi: [[false, false], [[], []]]};
    setSelectedIS(selectedOS);
    // selectedIS.multi[1][mode].map(contact => processSelected(contact, mode)); // Remove those that were selected
    // if(action != "remove") processSelected(selectedOS.single, 0, false);
    
    setNumber('')
    setName('')
    setEmail('')
  }

  function processSelected(thisData, mode, remove=false){
    let callSelf = false, multiSel = selectedIS.multi[1][mode].filter(each => thisData.id == each.id), getContact = [contacts.existing_numbers, contacts.new_numbers[0]];

    // console.log("End here...", contacts.new_numbers);
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
    let baseContacts = [contacts.existing_numbers, contacts.new_numbers[0]], finalContacts = selectedIS.multi[1][mode].length > 0 ? selectedIS.multi[1][mode] : baseContacts[mode];
    processCheckAll(false, mode);
    // console.log("Prep SMS here...", toGroup.activeGroup.group_name || "No name");
    // if(functions.temporaryStore({name: 'sms-list', value: finalContacts}, 1, true)) navigate("/send-sms");
    if(functions.temporaryStore({name: 'sms-list', value: [finalContacts, !toGroup.activeGroup.group_name ? "" : toGroup.activeGroup.group_name]}, 1, true)) navigate("/send-sms");
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
          
          // const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/group-processor?user_id=${data.user.user_id}&action=${action}`, {
          /* const response = await fetch(`${data.API_URL}/auth/group-processor?user_id=${data.user.user_id}&action=${action}`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({group: thisToGroup.addToGroup, contacts: thisToGroup.contactsToAdd}),
              // body: JSON.stringify({group: thisToGroup, contacts: toGroup.contactsToAdd),
          }) */
          const response = await functions.authenticatedFetch(
              `${data.API_URL}/auth/group-processor?action=${action}`,
              {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json",
                  },
                  body: JSON.stringify({group: thisToGroup.addToGroup, contacts: thisToGroup.contactsToAdd}),
              }
          );
          const responseData = await response.json();
          
          if(responseData.Success){
            thisToGroup.contactsToAdd.map(each_1 => {
              if(action == "add"){
                setContactsOS.groupAssociations.map(each_2 => {
                  // console.log(`Group: ${each_2.group_id} & ${thisToGroup.addToGroup.id}`)
                  // console.log(`Number: ${each_2.phone_number_id} & ${each_1.id}`)
                })
                if(!setContactsOS.groupAssociations.some(each_2 => each_2.group_id === thisToGroup.addToGroup.id && each_2.phone_number_id === each_1.id)){
            ;
                  setContactsOS.groupAssociations.push({group_id: thisToGroup.addToGroup.id, phone_number_id: each_1.id, user_id: data.user.user_id});
                }
              }
              if(action == "remove"){
                setContactsOS.groupAssociations.splice(setContactsOS.groupAssociations.findIndex(each_2 => each_2.group_id == thisToGroup.addToGroup.id && each_2.phone_number_id == each_1.id), 1);

                setName('');
                setEmail('');
                // selectedOS = {...selectedOS, single: {}};
              }
              selectedOS = {...selectedOS, single: {}};
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
    let selDataType = [contacts.existing_numbers, contacts.new_numbers[0]];
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
    <div className="w-full min-w-0 space-y-6 text-slate-800">
      {alerts.length > 0 && functions.displayError(alerts)}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Contact Management
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Add and organise recipients, manage contact groups, and prepare contacts for SMS campaigns.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {contacts.existing_numbers.length} saved contacts
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">Add a contact</h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter a phone number and optionally add the person's name and email.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="min-w-0">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Phone number <span className="text-rose-500">*</span>
              </label>
              <PhoneInput
                international
                defaultCountry="GH"
                value={number}
                onChange={setNumber}
                className="contact-phone-input w-full"
                // autoFocus={true}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                Full name <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="contact-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Ama Mensah"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email address <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              Include the country code when adding international numbers.
            </p>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 focus:outline-none focus:ring-4 focus:ring-sky-200"
            >
              {Object.keys(selectedIS.single).length > 0 ? "Update contact" : "Add contact"}
            </button>
          </div>
        </form>
      </section>

      {contacts.new_numbers[0].length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-amber-100 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Unsaved contacts</h2>
              <p className="mt-1 text-sm text-slate-600">
                These contacts are temporary until you save them. They may be lost when you leave this page.
              </p>
            </div>
            <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              {contacts.new_numbers[0].length} pending
            </span>
          </div>
          <div className="p-4 sm:p-5">
            <label htmlFor="check-all-new" className="mb-3 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
              <input
                id="check-all-new"
                type="checkbox"
                checked={selectedIS.multi[0][1]}
                onChange={e => processCheckAll(e.target.checked, 1)}
                className="h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-500"
              />
              Select all pending contacts
            </label>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {contacts.new_numbers[0].map((contact, index) => (
                <div key={contact.id ?? index} className="flex min-w-0 items-start gap-3 p-3 sm:p-4">
                  <input
                    aria-label={`Select ${contact.full_name || contact.phone_number}`}
                    type="checkbox"
                    checked={selectedIS.multi[1][1].some(each => each.id == contact.id)}
                    onChange={() => processSelected(contact, 1)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-sky-700 focus:ring-sky-500"
                  />
                  <button type="button" onClick={() => processSelected(contact, 1)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-semibold text-slate-800">{contact.full_name || "No name"}</span>
                    <span className="mt-1 block break-words text-sm text-slate-600">{contact.phone_number}</span>
                    {contact.email && <span className="mt-0.5 block break-all text-xs text-slate-500">{contact.email}</span>}
                  </button>
                  <button type="button" onClick={() => processSelected(contact, 1, true)} className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                    Remove
                  </button>
                </div>
              ))}
            </div>
            {selectedIS.multi[1][1].length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => prepState("save-numbers", {newNums: selectedIS.multi[1][1], mode: 0})} className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800">
                  Save selected
                </button>
                <button type="button" onClick={() => removeMulti(1)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Remove selected
                </button>
                <button type="button" onClick={() => prepareSMS(1)} className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-800 hover:bg-sky-100">
                  Prepare SMS
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {data.phoneNumbersData.phone_number_groups.data.find(group => group.id === toGroup.activeGroup.id)?.group_name || "All"} contacts
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select contacts to manage groups, remove entries, or prepare an SMS.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <label htmlFor="contact-group-filter" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Filter by group
            </label>
            <select
              id="contact-group-filter"
              value={toGroup.activeGroup.id === "all" ? "0" : String(data.phoneNumbersData.phone_number_groups.data.findIndex(group => group.id === toGroup.activeGroup.id) + 1)}
              onChange={e => prepState("active-group", e.target.value == 0 ? {group: {id: 'all'}} : {group: data.phoneNumbersData.phone_number_groups.data[Number(e.target.value)-1]})}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            >
              <option value={0}>All contacts</option>
              {data.phoneNumbersData.phone_number_groups.data.map((each, i) => (
                <option key={i+1} value={i+1}>{each.group_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label htmlFor="check-all-saved" className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
              <input
                id="check-all-saved"
                type="checkbox"
                checked={selectedIS.multi[0][0]}
                onChange={e => processCheckAll(e.target.checked, 0)}
                className="h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-500"
              />
              Select all ({contacts.existing_numbers.length})
            </label>
            {selectedIS.multi[1][0].length > 0 && (
              <span className="w-fit rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
                {selectedIS.multi[1][0].length} selected
              </span>
            )}
          </div>

          {contacts.existing_numbers.length > 0 ? (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {contacts.existing_numbers.map((contact, index) => (
                <div key={contact.id ?? index} className="flex min-w-0 items-start gap-3 p-3 sm:p-4">
                  <input
                    aria-label={`Select ${contact.full_name || contact.phone_number}`}
                    type="checkbox"
                    checked={selectedIS.multi[1][0].some(each => each.id == contact.id)}
                    onChange={() => processSelected(contact, 0)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-sky-700 focus:ring-sky-500"
                  />
                  <button type="button" onClick={() => processSelected(contact, 0)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-semibold text-slate-800">{contact.full_name || "No name"}</span>
                    <span className="mt-1 block break-words text-sm text-slate-600">{contact.phone_number}</span>
                    {contact.email && <span className="mt-0.5 block break-all text-xs text-slate-500">{contact.email}</span>}
                  </button>
                  {toGroup.activeGroup.id == "all" && (
                    <button type="button" onClick={() => processSelected(contact, 0, true)} className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6m3-3h-6" />
                </svg>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">No contacts in this view</h3>
              <p className="mt-1 text-sm text-slate-500">Add a contact above or choose another group.</p>
            </div>
          )}

          {selectedIS.multi[1][0].length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {toGroup.activeGroup.id == "all" ? (
                <button type="button" onClick={() => removeMulti(0)} className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                  Delete selected
                </button>
              ) : (
                <button type="button" onClick={() => sendToGroup("remove")} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Remove from group
                </button>
              )}
              <button type="button" onClick={() => sendToGroup("show", 0)} className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-800 hover:bg-sky-100">
                Add to group
              </button>
              <button type="button" onClick={() => prepareSMS(0)} className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800">
                Prepare SMS
              </button>
            </div>
          )}
        </div>
      </section>

      {toGroup.showAddToGroup && (
        <section className="rounded-2xl border border-sky-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Manage group membership</h2>
          <p className="mt-1 text-sm text-slate-500">Choose a group for the selected contacts.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              aria-label="Destination contact group"
              onChange={e => prepState("add-group", {group: data.phoneNumbersData.phone_number_groups.data[e.target.value], setAddToGrp: true})}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            >
              {data.phoneNumbersData.phone_number_groups.data.map((each, i) => toGroup.activeGroup.id != each.id && (
                <option key={i} value={i}>{each.group_name}</option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => prepState("active-group", {group: toGroup.activeGroup})} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={() => sendToGroup("add")} className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800">
                Add to group
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

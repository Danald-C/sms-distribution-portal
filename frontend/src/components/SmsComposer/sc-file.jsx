import React, { useRef, useState, useEffect, useReducer } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Contexts/auth.jsx';

export default function ComposeSMS({props}){
// export default function ComposeSMS(){
    // const { loading, contacts } = props;
    // const { sendSMSTo, sentState } = props;
    const { values: { data, functions, setStates } } = useAuth();
    const navigate = useNavigate();

    let setSendSMSToOS = [[], ""];
    const [sendSMSTo, setSendSMSTo] = useState(setSendSMSToOS);
    const defaultSMS = ["DC Group", "Hi, welcome to DC SMS Portal. Enjoy your experience!"];
    const [sender, senderID] = useState(defaultSMS[0]);
    // const [message, setMessage] = useState('');
    let setMessageOS = '';
    const [message, setMessage] = useState(defaultSMS[1]);
    // const [slider, setSlider] = useState({controls: false, rangePos: [[1, 1], false], spaceAfter: false});
    const [slider, setSlider] = useState({controls: [false, 0], rangePos: [[1, 1], false], spaceAfter: false});
    let setPayloadOS = sendSMSTo[0];
    const [payload, setPayload] = useState(sendSMSTo[0]);
      const [alerts, setAlerts] = useState([])
      const [sending, setSending] = useState(false)
    
    useEffect(() => {
        settingData();
    }, []);

    
    async function settingData(){
        try{
            // const response = await fetch(`http://localhost:4000/api/auth/sms-default?action=get`, {
            /* const response = await fetch(`${data.API_URL}/auth/sms-default?action=get`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${data.accessToken}`
                }
            }) */
            const response = await functions.authenticatedFetch(
                `${data.API_URL}/auth/sms-default?action=get`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            const responseData = await response.json();
            
            console.log("Check message", responseData);
            if(responseData.Success){
                setSendSMSToOS = functions.temporaryStore({name: 'sms-list'}, 0, true);
                if(!Object.keys(setSendSMSToOS[0]).length > 0) navigate("/dashboard");

                setSendSMSTo(setSendSMSToOS);
                // responseData.smsDefault.sender && senderID(responseData.smsDefault.sender);
                if(responseData.smsDefault.sender){
                    senderID(responseData.smsDefault.sender);
                }else{
                    senderID(setSendSMSToOS[1].slice(0, 11) || defaultSMS[0]);
                }
                if(responseData.smsDefault.message){
                    setMessage(responseData.smsDefault.message);
                }else{
                    setMessage(defaultSMS[1]);
                }
                if(responseData.smsDefault.message) setMessageOS = responseData.smsDefault.message;
                
                processSlider([false, 0, 0], 0);
            }
        }catch(error){
            console.log('An error happened. Saving default sms failed. ', error)
        }finally{
        }
    }

        // console.log(JSON.stringify(props));
    
    const handleSendSMS = async (e) => {
        e.preventDefault()
        
        const getNumbers = data.phoneNumbersData.phone_numbers.data.map(contact => contact.phone_number);

        const endpointUrl = `${import.meta.env.VITE_API_URL}/sms/send`; // Replace with your backend URL

        const regex = ["mtn", "mtngh", "mtn gh", "mtn-gh", "airteltigo", "airtel-tigo", "airtel tigo", "momo", "mobilemoney", "mobile money", "mobile-money", "vodafone", "vodafonecash", "vodafone cash", "vodafone-cash", "vodacash", "voda cash", "voda-cash", "vodacashghana", "vodafoneghana", "vodafoneghana.com", "vodafone.com", "vodafone.com.gh", "vodafone.com.gh.", "vodafone.com.gh/", "airteltigocash", "airteltigo-cash", "airteltigo cash", "airteltigocash.com", "airteltigocash.com.gh", "airteltigocash.com.gh/", "airteltigocash.com.gh.", "airteltigocash.com.gh/"];
        let reservedKeyWords = regex.map(each_1 => {
            let pattern = new RegExp(each_1, "i");
            if(pattern.test(sender)) return {found: true, keyword: each_1};
            payload.map(each_2 => {
                if(pattern.test(each_2.message)) return {found: true, keyword: each_1};
            });
        });

        if(sender.length > 12){
        // console.log(sender.length);
            setAlerts([{from: 2, type: "caution", message: "Sorry. Sender must be less or exactly Eleven characters."}, ...alerts]);
        }else if(reservedKeyWords.found){
            setAlerts([{from: 3, type: "caution", message: `${reservedKeyWords.keyword} is a reserved keyword and cannot be used or allowed.`}, ...alerts]);
        }else{
            setSending(true);

            try {
                // console.log('Success: ', JSON.stringify({sender, payload}));
                /* const response = await fetch(endpointUrl, {
                    // Set the method to POST
                    method: 'POST',
                    
                    // Define the type of content you are sending
                    headers: {
                        Authorization: `Bearer ${data.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    
                    // Convert the JavaScript array into a JSON string
                    // body: JSON.stringify({sender, message, "to": getNumbers}),
                    // body: JSON.stringify({sender, content: [{message, "to": getNumbers}, {message, "to": getNumbers}]}),
                    body: JSON.stringify({sender, payload}),
                }); */
                const response = await functions.authenticatedFetch(
                    endpointUrl,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({sender, payload}),
                    }
                );

                const result = await response.json();

                if (!result.Success) {
                    throw new Error(`HTTP error! status: ${response.Status}`);
                }

                if(result.unsentPayloads && result.unsentPayloads.length > 0){
                    setSending(false);
                    setPayload(result.unsentPayloads);
                    setAlerts([{from: 2, type: "caution", message: `Some messages were not sent. ${result.unsentPayloads.length} unsent message(s).`}, ...alerts]);
                }else{
                    setAlerts([{from: 2, type: "success", message: `All messages were sent successfully.`}, ...alerts]);

                    // if(functions.temporaryStore({name: 'sms-list', value: {}}), 3) navigate("/dashboard");
                    if(functions.temporaryStore({name: 'sms-list', value: []}), 2) navigate("/dashboard");
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }
    }

    const messageBox = value => {
        // let splitTxt = value.split(" "), newSlider = {controls: false, rangePos: [[slider.rangePos[0][0], 0], false], spaceAfter: false}, filterTxt = [-1, []];
        let splitTxt = value.split(" "), newSlider = slider, filterTxt = [-1, []];

        // Filter multiple spaces
        for(let i = 0; i < splitTxt.length; i++){
            if(splitTxt[i] === ""){
                if(i-1 != filterTxt[0]){
                    filterTxt[1].push(splitTxt[i]);
                    filterTxt[0] = i;
                }
            }else{
                filterTxt[1].push(splitTxt[i]);
            }
        }

        // Determine slider values
        if(filterTxt[1].length >= 2){
            var lastWord = filterTxt[1][filterTxt[1].length-1];
            if(filterTxt[1].length == 2 && lastWord.length >= 1) newSlider.controls[0] = true;
            if(filterTxt[1].length > 2) newSlider.controls[0] = true;
            if(lastWord.length >= 1 && newSlider.controls[0]) newSlider.rangePos[0][1] = filterTxt[1].length-1;
        }
        setSlider(newSlider);
        setMessage(value);
        
        // processSlider(newSlider[1], 1, newSlider);
        // return {...message, slider: newSlider};
        return {message, slider: newSlider};
    }

    const processSlider = (target, mode, newSlider=[]) => {
        setSendSMSToOS = setSendSMSToOS[0].length > 0 ? setSendSMSToOS : sendSMSTo;
        setMessageOS = setMessageOS || message;
        setPayloadOS = setPayloadOS || payload;
        if(mode == 0){
            // newSlider = messageBox(message).slider;
            newSlider = messageBox(setMessageOS).slider;
            // newSlider.rangePos[1] = (target[1] == 0) ? target[0] : slider.rangePos[1];
            // console.log("See message ", setSendSMSToOS, sendSMSTo);
            if(target[1] == 0){
                newSlider = {...newSlider, controls: target[0] ? newSlider.controls : [false, 0], rangePos: [[1, newSlider.rangePos[0][1]], target[0]], spaceAfter: false};
            }else{
                newSlider.rangePos[1] = slider.rangePos[1];
                newSlider.spaceAfter = target[0];
            }
            // newSlider.spaceAfter = (target[1] == 1) ? target[0] : slider.spaceAfter;
            
            setSlider(newSlider);
            processSlider([newSlider.rangePos[0][0], 0], 1, newSlider);
        }else{
            let newPayload = [];
            // if(slider[2]){
            if(newSlider.rangePos[1]){
                let newMessages = [];
                
                /* setSendSMSToOS.map((contact, index) => {
                    // let splitMsg = message.split(" ");
                    let splitMsg = (newSlider.controls[0] && newSlider.controls[1] == 1) ? payload[index].message.split(" ") : message.split(" ");
                    if(contact.full_name != ''){
                        if(newSlider.spaceAfter){
                            splitMsg.splice(target[0], 0, contact.full_name) // Inject name
                        }else{
                            splitMsg.splice(target[0], 1, contact.full_name+splitMsg[target[0]]) // Inject name
                        }
                        // newMessages.push([splitMsg.join(" "), index]);
                        newMessages.push([splitMsg.join(" "), contact.id]);
                    }
                    // return null;
                });
                
                // data.phoneNumbersData.phone_numbers.data.map((contact, index) => {
                setSendSMSToOS.map((contact, index) => {
                    let thisMessage = setMessageOS;
                    newMessages.map((msg) => {
                        // if(index == msg[1]) thisMessage = msg[0];
                        if(contact.id == msg[1]) thisMessage = msg[0];
                        // console.log(msg[0]);
                    });
                    
                    newPayload.push({
                        "message": thisMessage,
                        "to": [contact.phone_number]
                    });
                }); */

                let get_names = [];
                setSendSMSToOS[0].map((contact, index) => {
                    // let thisMessage = message;
                    let thisMessage = (newSlider.controls[0] && newSlider.controls[1] == 1) ? payload[index].message.replaceAll(contact.full_name, "") : message;
                    
                    newPayload.push({
                        "message": thisMessage,
                        "to": [contact.phone_number]
                    });
                    get_names.push(contact.full_name);
                });

                newPayload.map((each, index) => {
                    let splitMsg = each.message.split(" ").filter(word => word !== ""); // Remove empty strings
                    
                // console.log("Set it here ", get_names[index]);
                    if(get_names[index] != ''){
                        if(newSlider.spaceAfter){
                            splitMsg.splice(target[0], 0, get_names[index]) // Inject name
                        }else{
                            splitMsg.splice(target[0], 1, get_names[index]+splitMsg[target[0]]) // Inject name
                        }
                        newPayload[index].message = splitMsg.join(" ");
                    }
                });

                if(newSlider.controls[0] && newSlider.controls[1] == 0) newSlider = {...newSlider, controls: [true, 1]};
            }else{
                const getNumbers = setSendSMSToOS[0].map(contact => contact.phone_number);
                newPayload.push({
                    "message": setMessageOS,
                    "to": getNumbers
                });
            }
            setPayloadOS = newPayload;
            setPayload(setPayloadOS);
                // console.log("Check message here:", setPayloadOS);
            setSlider({...newSlider, rangePos: [[Number(target[0]), newSlider.rangePos[0][1]], newSlider.rangePos[1]]});
            // splitMsg.splice(target, 0, "Lemon");
        }
    }

    function changeMessage(e, index){
        // console.log("Check here..", e.target);
        !slider.controls[0] && setMessage(e.target.value);
        payload[index] = {...payload[index], message: e.target.value};
        setPayload([...payload]);
    }

    async function saveDefault(proceed=true){
        if(proceed){
            try{
                // const response = await fetch(`http://localhost:4000/api/auth/sms-default?user_id=${data.user.user_id}`, {
                // const response = await fetch(`http://localhost:4000/api/auth/sms-default?action=update`, {
                /* const response = await fetch(`${data.API_URL}/auth/sms-default?action=update`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${data.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({sender: sender || defaultSMS[0], message: message || defaultSMS[1]}),
                }) */
                const response = await functions.authenticatedFetch(
                    `${data.API_URL}/auth/sms-default?action=update`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({sender: sender || defaultSMS[0], message: message || defaultSMS[1]}),
                    }
                );
                const responseData = await response.json();
                
                // console.log(responseData, JSON.stringify({sender: sender || defaultSMS[0], message: message || defaultSMS[1]}));
                if(responseData.Success){
                    // senderID(responseData.smsDefault.sender);
                    senderID(sendSMSTo[1] || responseData.smsDefault.sender || defaultSMS[0]);
                    setMessage(responseData.smsDefault.message);
                }
            }catch(error){
                console.log("This process failed. ", error);
            }
        }else{
            // if(functions.temporaryStore({name: 'sms-list', value: {}}), 3) navigate("/dashboard");
            if(functions.temporaryStore({name: 'sms-list', value: []}), 2) navigate("/dashboard");
        }
    }


    return (
        <div className="mx-auto w-full max-w-6xl space-y-6 text-slate-800">
            {alerts.length > 0 && functions.displayError(alerts)}
            {/* {console.log(sendSMSTo)} */}

            <header className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                    <p className="mb-2 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
                        Communication workspace
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        Compose SMS
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Prepare your message, review the sender name, and send it to your selected contacts.
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
                        </svg>
                    </span>
                    <div>
                        <p className="text-xs font-medium text-slate-500">Recipients</p>
                        <p className="text-lg font-bold text-slate-900">{sendSMSTo[0] ? sendSMSTo[0].length : 0} contact{sendSMSTo[0].length > 1 ? "s" : ""}</p>
                    </div>
                </div>
            </header>

            <form className="space-y-6" onSubmit={handleSendSMS}>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5">
                        <h2 className="text-lg font-semibold text-slate-900">Message details</h2>
                        <p className="mt-1 text-sm text-slate-500">Choose the sender ID and write the message your contacts will receive.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                        <div className="space-y-2">
                            <label htmlFor="sms-sender" className="block text-sm font-medium text-slate-700">Sender name</label>
                            <input
                                id="sms-sender"
                                type="text"
                                value={sender}
                                onChange={e => senderID(e.target.value)}
                                maxLength={11}
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                placeholder="e.g. DC Group"
                            />
                            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                                <span>Must be no more than 11 characters.</span>
                                <span className={sender.length > 11 ? "font-semibold text-red-600" : ""}>{sender.length}/11</span>
                            </div>
                        </div>

                        {!slider.rangePos[1] && (
                            <div className="space-y-2">
                                <label htmlFor="sms-message" className="block text-sm font-medium text-slate-700">Message</label>
                                <textarea
                                    id="sms-message"
                                    rows={6}
                                    value={message}
                                    onChange={e => changeMessage(e, 0)}
                                    className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    placeholder="Write your SMS message here..."
                                />
                                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                                    <span>{message.length} characters</span>
                                    <button
                                        type="button"
                                        onClick={() => saveDefault()}
                                        className="font-semibold text-blue-700 transition hover:text-blue-900 hover:underline"
                                    >
                                        Save as default message
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">Personalize your message</h3>
                                <p className="mt-1 text-sm leading-5 text-slate-500">Insert each recipient's name into the message where appropriate.</p>
                            </div>
                            <label htmlFor="personalize" className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                                <input
                                    id="personalize"
                                    type="checkbox"
                                    checked={Boolean(slider.rangePos[1])}
                                    onChange={e => processSlider([e.target.checked, 0], 0)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                Personalize
                            </label>
                        </div>

                        {slider.rangePos[1] && (
                            <div className="mt-4 space-y-4 border-t border-blue-100 pt-4">
                                <label htmlFor="space-after" className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                                    <input
                                        id="space-after"
                                        type="checkbox"
                                        checked={Boolean(slider.spaceAfter)}
                                        onChange={e => processSlider([e.target.checked, 1], 0)}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    Add space after.
                                </label>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                        <label htmlFor="personalize-position" className="font-medium text-slate-700">Name insertion position</label>
                                        <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-blue-700">
                                            Word {slider.rangePos[0][0]}
                                        </span>
                                    </div>
                                    <input
                                        id="personalize-position"
                                        type="range"
                                        value={slider.rangePos[0][0]}
                                        onChange={e => processSlider([e.target.value, 0], 1, slider)}
                                        min="1"
                                        max={Math.max(1, slider.rangePos[0][1])}
                                        className="w-full accent-blue-700"
                                    />
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>Beginning</span>
                                        <span>End of message</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {!slider.rangePos[1] && (
                        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                            <button
                                type="button"
                                onClick={() => saveDefault(false)}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={sending}
                                className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {sending ? 'Sending…' : `Send SMS to ${sendSMSTo[0] ? sendSMSTo[0].length : 0} contact`+(sendSMSTo[0].length > 1 ? "s" : "")}
                            </button>
                        </div>
                    )}
                </section>

                {slider.controls[0] && slider.rangePos[1] && (
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Personalized message preview</h2>
                                <p className="mt-1 text-sm text-slate-500">Review or edit each recipient's message before sending.</p>
                            </div>
                            <span className="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                {Array.isArray(payload) ? payload.length : 0} messages
                            </span>
                        </div>

                        <div className="space-y-4">
                            {Array.isArray(payload) && payload.map((eachMess, index) => (
                                <div key={index} className="rounded-xl border border-slate-200 p-4">
                                    <label htmlFor={`personalized-message-${index}`} className="mb-2 block text-sm font-medium text-slate-700">
                                        Message {index + 1}{sendSMSTo[0][index]?.full_name ? ` · ${sendSMSTo[0][index].full_name}` : ''}
                                    </label>
                                    <textarea
                                        id={`personalized-message-${index}`}
                                        rows={3}
                                        value={eachMess.message}
                                        onChange={e => changeMessage(e, index)}
                                        className="w-full resize-y rounded-lg border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                            <button
                                type="button"
                                onClick={() => saveDefault(false)}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={sending}
                                className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {sending ? 'Sending…' : 'Send personalized SMS'}
                            </button>
                        </div>
                    </section>
                )}
            </form>
        </div>
    );
}

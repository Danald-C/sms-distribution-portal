import React, { useRef, useState, useEffect, useReducer } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Contexts/auth.jsx';

export default function ComposeSMS({props}){
// export default function ComposeSMS(){
    // const { loading, contacts } = props;
    // const { sendSMSTo, sentState } = props;
    const { values: { data, functions, setStates } } = useAuth();
    const navigate = useNavigate();
    let setSendSMSToOS = [];
    const [sendSMSTo, setSendSMSTo] = useState('');
    const [sender, senderID] = useState('');
    // const [message, setMessage] = useState('');
    let setMessageOS = '';
    const [message, setMessage] = useState('');
    // const [slider, setSlider] = useState({controls: false, rangePos: [[1, 1], false], spaceAfter: false});
    const [slider, setSlider] = useState({controls: [false, 0], rangePos: [[1, 1], false], spaceAfter: false});
    let setPayloadOS = sendSMSTo;
    const [payload, setPayload] = useState(sendSMSTo);
      const [alerts, setAlerts] = useState([])
    const defaultSMS = ["DC Group", "Hi, welcome to DC SMS Portal. Enjoy your experience!"];
    
    useEffect(() => {
        settingData();
    }, []);

    
    async function settingData(){
        try{
            const response = await fetch(`http://localhost:4000/api/auth/sms-default?action=get`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${data.accessToken}`
                }
            })
            const responseData = await response.json();
            
            if(responseData.Success){
                setSendSMSToOS = functions.temporaryStore({name: 'sms-list'}, 0);
            // console.log("Check message", setPayloadOS, setMessageOS, Object.keys(setSendSMSToOS).length);
                if(!Object.keys(setSendSMSToOS).length > 0) navigate("/dashboard");
                setSendSMSTo(setSendSMSToOS);
                responseData.smsDefault.sender && senderID(responseData.smsDefault.sender);
                responseData.smsDefault.message && setMessage(responseData.smsDefault.message);
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

        const endpointUrl = 'http://localhost:4000/api/sms/send'; // Replace with your backend URL

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
            try {
                // console.log('Success:', sender, sender.length);
                const response = await fetch(endpointUrl, {
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
                });

                const result = await response.json();

                if (!result.ok) {
                    throw new Error(`HTTP error! status: ${response.Status}`);
                }

                if(result.unsentPayloads && result.unsentPayloads.length > 0){
                    setAlerts([{from: 2, type: "caution", message: `Some messages were not sent. ${result.unsentPayloads.length} unsent message(s).`}, ...alerts]);
                }else{
                    setAlerts([{from: 2, type: "success", message: `All messages were sent successfully.`}, ...alerts]);
                    if(functions.temporaryStore({name: 'sms-list', value: {}}), 3) navigate("/dashboard");
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
        setSendSMSToOS = setSendSMSToOS.length > 0 ? setSendSMSToOS : sendSMSTo;
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
                setSendSMSToOS.map((contact, index) => {
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
                    
                    if(get_names[index] != ''){
                        if(newSlider.spaceAfter){
                            splitMsg.splice(target[0], 0, get_names[index]) // Inject name
                        }else{
                            splitMsg.splice(target[0], 1, get_names[index]+splitMsg[target[0]]) // Inject name
                        }
                        newPayload[index].message = splitMsg.join(" ");
                    }
                });
                // console.log("Set it here ", newPayload);

                if(newSlider.controls[0] && newSlider.controls[1] == 0) newSlider = {...newSlider, controls: [true, 1]};
            }else{
                // console.log("Check message here:", setSendSMSToOS);
                const getNumbers = setSendSMSToOS.map(contact => contact.phone_number);
                newPayload.push({
                    "message": setMessageOS,
                    "to": getNumbers
                });
            }
            setPayloadOS = newPayload;
            setPayload(setPayloadOS);
            setSlider({...newSlider, rangePos: [[Number(target[0]), newSlider.rangePos[0][1]], newSlider.rangePos[1]]});
            // splitMsg.splice(target, 0, "Lemon");
        }
    }

    function changeMessage(e, index){
        !slider.controls[0] && setMessage(e.target.value);
        payload[index] = {...payload[index], message: e.target.value};
        setPayload([...payload]);
    }

    async function saveDefault(proceed=true){
        if(proceed){
            try{
                // const response = await fetch(`http://localhost:4000/api/auth/sms-default?user_id=${data.user.user_id}`, {
                const response = await fetch(`http://localhost:4000/api/auth/sms-default?action=update`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${data.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({sender: sender || defaultSMS[0], message: message || defaultSMS[1]}),
                })
                const responseData = await response.json();
                
                // console.log(responseData, JSON.stringify({sender: sender || defaultSMS[0], message: message || defaultSMS[1]}));
                if(responseData.Success){
                    senderID(responseData.smsDefault.sender);
                    setMessage(responseData.smsDefault.message);
                }
            }catch(error){
                console.log("This process failed. ", error);
            }
        }else{
            if(functions.temporaryStore({name: 'sms-list', value: {}}), 3) navigate("/dashboard");
        }
    }


    return(
        <>
      {alerts.length > 0 && functions.displayError(alerts)}
            <h2>Sending SMS to {sendSMSTo.length} Contacts..</h2>
            <form className="bg-white rounded-xl p-6 shadow" onSubmit={handleSendSMS}>
                <>
                    <label htmlFor="personalize"><input id='personalize' type='checkbox' onChange={e => processSlider([e.target.checked, 0], 0)} /> Personalize</label>
                    {slider.rangePos[1] && <label htmlFor="space-after"><input id='space-after' type='checkbox' onChange={e => processSlider([e.target.checked, 1], 0)} /> Space after</label>}
                    {slider.rangePos[1] && <input type="range" value={slider.rangePos[0][0]} onChange={e => processSlider([e.target.value, 0], 1, slider)} min="1" max={slider.rangePos[0][1]} />}
                </>
                <div>
                    <em>Must be less or exactly Eleven characters long.</em>
                    <input type="text" value={sender} onChange={e => senderID(e.target.value)} className="flex-grow p-3 border rounded mb-3" placeholder="From" />
                </div>
                {!slider.rangePos[1] && <><textarea rows={4} value={message} onChange={e => changeMessage(e, 0)} className="flex-grow p-3 border rounded mb-3" placeholder="Enter your message here..." />
                <a href='#' onClick={() => saveDefault()}>Save</a>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded">Send SMS</button></>}
            </form>

            <form className="bg-white rounded-xl p-6 shadow" onSubmit={handleSendSMS}>
                {slider.controls[0] && 
                    <>
                        {
                            slider.rangePos[1] && 
                            
                            // console.log(payload)
                        //    functions.displayElements(1, [], payload)
                            payload.map((eachMess, index) => (
                                <textarea key={index} value={eachMess.message} onChange={e => changeMessage(e, index)} />
                            ))
                        }
                        {slider.rangePos[1] && <button className="px-4 py-2 bg-indigo-600 text-white rounded">Send SMS</button>}
                    </>
                }
            </form>
            <a href='#' onClick={() => saveDefault(false)}>Cancel</a>
        </>
    )
}
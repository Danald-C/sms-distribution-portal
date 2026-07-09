import React, { useRef, useState, useEffect, useReducer } from 'react';
import { useAuth } from '../../Contexts/auth.jsx';

export default function ComposeSMS({props}){
// export default function ComposeSMS(){
    // const { loading, contacts } = props;
    const { sendSMSTo, sentState } = props;
    const { values: { data, functions, setStates } } = useAuth();
    const [sender, senderID] = useState('DC Group');
    // const [message, setMessage] = useState('');
    const [message, setMessage] = useState('Hi, I just wanted to check up on you!');
    // const [slider, setSlider] = useState([false, 1, false]);
    const [slider, setSlider] = useState([true, [1, 1], false]);
    const sliderVal = useRef(null);
    const [payload, setPayload] = useState(sendSMSTo);
    const [doneSending, setDoneSending] = useState(sentState);
    // const [, forceUpdate] = useReducer(x => x + 1, 0);
    
    
    /* useEffect(() => {
        if(sliderVal.current){
            sliderVal.current.focus();
            // console.log(sliderVal.current.value)
            setSlider([slider[0], [sliderVal.current, slider[1][1]], slider[2]]);
            // processSlider(sliderVal.current, 1, slider);
        }
    }) */

        // console.log(JSON.stringify(props));
    
    const handleSendSMS = async (e) => {
        e.preventDefault()
        
        const getNumbers = data.phoneNumbersData.phone_numbers.data.map(contact => contact.phone_number);
        // console.log(JSON.stringify({payload}));

        const endpointUrl = 'http://localhost:4000/api/sms/send'; // Replace with your backend URL

        try {
            const response = await fetch(endpointUrl, {
                // Set the method to POST
                method: 'POST',
                
                // Define the type of content you are sending
                headers: {
                    'Content-Type': 'application/json',
                },
                
                // Convert the JavaScript array into a JSON string
                // body: JSON.stringify({sender, message, "to": getNumbers}),
                // body: JSON.stringify({sender, content: [{message, "to": getNumbers}, {message, "to": getNumbers}]}),
                body: JSON.stringify({sender, payload}),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Success:', result);
            setDoneSending(true);
            // setPayload([]);
        } catch (error) {
            console.error('Error:', error);
        }
    }

    const messageBox = value => {
        // let splitTxt = event.target.value.split(" "), newSlider = [false, 0, false], filterTxt = [-1, []];
        let splitTxt = value.split(" "), newSlider = [false, [slider[1][0], 0], false], filterTxt = [-1, []];

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
            if(filterTxt[1].length == 2 && lastWord.length >= 1) newSlider[0] = true;
            if(filterTxt[1].length > 2) newSlider[0] = true;
            if(lastWord.length >= 1 && newSlider[0]) newSlider[1][1] = filterTxt[1].length-1;
        }
        setSlider(newSlider);
        console.log("Check the Message: ", newSlider, filterTxt);
        
        // processSlider(newSlider[1], 1, newSlider);
        // return setMessage(filterTxt[1].join(" "));
        return {slider: newSlider, message: setMessage(filterTxt[1].join(" "))};
    }

    // const processSlider = (target, mode) => {
    const processSlider = (target, mode, newSlider=[]) => {
        if(mode == 0){
            newSlider = messageBox(message).slider;
            newSlider[2] = target;
            
            // setSlider([slider[0], slider[1], target]);
            setSlider(newSlider);
            processSlider(1, 1, newSlider);
        }else{
            let newPayload = [];
            // if(slider[2]){
            if(newSlider[2]){
                let newMessages = [];
                // data.phoneNumbersData.phone_numbers.data.map((contact, index) => {
                sendSMSTo.map((contact, index) => {
                    let splitMsg = message.split(" ");
                    if(contact.full_name != ''){
                        splitMsg.splice(target, 0, contact.full_name) // Inject name
                        newMessages.push([splitMsg.join(" "), index]);
                    }
                    // return null;
                });
                // console.log(newMessages);
                
                // data.phoneNumbersData.phone_numbers.data.map((contact, index) => {
                sendSMSTo.map((contact, index) => {
                    let thisMessage = message;
                    newMessages.map((msg) => {
                        if(index == msg[1]) thisMessage = msg[0];
                        // console.log(msg[0]);
                    });

                    newPayload.push({
                        "message": thisMessage,
                        "to": [contact.phone_number]
                    });
                });
            }else{
                // const getNumbers = data.phoneNumbersData.phone_numbers.data.map(contact => contact.phone_number);
                const getNumbers = sendSMSTo.map(contact => contact.phone_number);
                newPayload.push({
                    "message": message,
                    "to": getNumbers
                });
            }
            setPayload(newPayload);
        /* console.log("++++++++++");
        // console.log(JSON.stringify(payload));
        // console.log("-----------");
        // console.log(newPayload);
        console.log("-----------");
        console.log(slider); */
            // splitMsg.splice(target, 0, "Lemon");
        }
    }

    return(
        <>
            {/* {console.log("Where are you watching? ", sendSMSTo, doneSending)} */}
            {
                // sendSMSTo.length > 0 && !doneSending &&
                !doneSending &&
            
                <>
                    <form className="bg-white rounded-xl p-6 shadow" onSubmit={handleSendSMS}>
                        {slider[0] && (
                                <>
                                    <input type='checkbox' onChange={e => processSlider(e.target.checked, 0)} />
                                    {/* {slider[2] && <input type="range" ref={sliderVal} onChange={e => processSlider(e.target.value, 1, slider)} min="1" max={slider[1]} />} */}
                                    {slider[2] && <input type="range" defaultValue="1" onChange={e => processSlider(e.target.value, 1, slider)} min="1" max={slider[1][1]} />}
                                </>
                            )
                        }
                        <input type="text" onChange={e => senderID(e.target.value)} className="flex-grow p-3 border rounded mb-3" placeholder="Sender ID" />
                        {/* <textarea rows={4} value={message} onChange={e=>setMessage(e.target.value)} className="flex-grow p-3 border rounded mb-3" placeholder="Enter your message here..." /> */}
                        <textarea rows={4} value={message} onChange={e => messageBox(e.target.value).message} className="flex-grow p-3 border rounded mb-3" placeholder="Enter your message here..." />
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded">Send SMS</button>
                    </form>

                    <form className="bg-white rounded-xl p-6 shadow" onSubmit={handleSendSMS}>
                        {slider[0] && (
                            <>
                            {/* {console.log(slider[2], payload)} */}
                                {
                                    slider[2] && 
                                    
                                    // console.log(payload)
                                   functions.displayElements(1, [], payload)
                                }
                            </>
                            )
                        }
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded">Send SMS</button>
                    </form>
                </>
            }
        </>
    )
}
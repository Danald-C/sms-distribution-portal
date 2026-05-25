import React, { useRef, useState, useEffect, useReducer } from 'react';

export default function ComposeSMS({props}){
    // const {load, contacts} = props;
    const {load, contacts} = {"load":true,"contacts":[["Danald","0502653700",""],["Helena","0244246167",""],["David","0558244996",""]]};
    const [sender, senderID] = useState('DC Group');
    // const [message, setMessage] = useState('');
    const [message, setMessage] = useState('Hi, I just wanted to check up on you!');
    // const [slider, setSlider] = useState([false, 1, false]);
    const [slider, setSlider] = useState([true, [1, 1], false]);
    const sliderVal = useRef(null);
    const [payload, setPayload] = useState([]);
    // const [, forceUpdate] = useReducer(x => x + 1, 0);
    
    
    /* useEffect(() => {
        if(sliderVal.current){
            sliderVal.current.focus();
            // console.log(sliderVal.current.value)
            setSlider([slider[0], [sliderVal.current, slider[1][1]], slider[2]]);
            // processSlider(sliderVal.current, 1, slider);
        }
    }) */
    // const displayElements = () => {
    const displayElements = type => {
        /* return contacts.map((contact, index) => (
          <span key={index} className="mr-2">{contact[0]}: {contact[1]} {contact[2]}</span>
        )); */
        let elements = '';
        
        if(type == 0){
            elements = contacts.map((contact, index) => (
                <span key={index} className="mr-2">{contact[0]}: {contact[1]} {contact[2]}</span>
            ));
        }
        
        if(type == 1){
            elements = payload.map((eachMess, index) => (
                // <textarea key={index} defaultValue={eachMess.message} />
                <textarea key={index} value={eachMess.message} />
            ))
        }

        return elements;
    }

        // console.log(JSON.stringify(props));
    
    const handleSendSMS = async (e) => {
        e.preventDefault()
        
        const getNumbers = contacts.map(contact => contact[1]);
        console.log(JSON.stringify({sender, message, "to": getNumbers}));

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
                body: JSON.stringify({sender, content: payload}),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Success:', result);
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // const messageBox = event => {
    const messageBox = value => {
        // let splitTxt = event.target.value.split(" "), newSlider = [false, 0, false], filterTxt = [-1, []];
        let splitTxt = value.split(" "), newSlider = [false, [slider[1][0], 0], false], filterTxt = [-1, []];

        // Filter multiple spaces
        for(let i = 0; i < splitTxt.length; i++){
            if(splitTxt[i] === ""){
                if(i-1 != filterTxt[0])
                    filterTxt[1].push(splitTxt[i]);
                    filterTxt[0] = i;
            }else{
                filterTxt[1].push(splitTxt[i]);
            }
        }

        // Determine slider values
        if(filterTxt[1].length >= 2){
            var lastWord = filterTxt[1][filterTxt[1].length-1];
            if(filterTxt[1].length == 2 && lastWord.length >= 1)
                newSlider[0] = true;
            if(filterTxt[1].length > 2)
                newSlider[0] = true;
            if(filterTxt[1][filterTxt[1].length-1].length >= 1 && newSlider[0])
                newSlider[1][1] = filterTxt[1].length-1;
        }
        setSlider(newSlider)
        
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
                contacts.map((contact, index) => {
                    let splitMsg = message.split(" ");
                    if(contact[0] != ''){
                        splitMsg.splice(target, 0, contact[0])
                        newMessages.push([splitMsg.join(" "), index]);
                    }
                    // return null;
                });
                // console.log(sliderVal);
                
                contacts.map((contact, index) => {
                    let thisMessage = message;
                    newMessages.map((msg) => {
                        if(index == msg[1])
                            thisMessage = msg[0];
                        // console.log(msg[0]);
                    });

                    newPayload.push({
                        "message": thisMessage,
                        "to": [contact[1]]
                    });
                });
            }else{
                const getNumbers = contacts.map(contact => contact[1]);
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
            <div className="flex items-center gap-3">
                {load && <span className="text-green-600">Contact Added! { displayElements(0) }</span>}
                {load && <input type="button" value="Save Contacts" className="px-4 py-2 bg-green-600 text-white rounded cursor-pointer" />}
            </div>

            {
                (load) &&
            
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
                        {
                        //    console.log(slider)
                        }
                        <input type="text" className="flex-grow p-3 border rounded mb-3" placeholder="Sender ID" />
                        {/* <textarea rows={4} value={message} onChange={e=>setMessage(e.target.value)} className="flex-grow p-3 border rounded mb-3" placeholder="Enter your message here..." /> */}
                        <textarea rows={4} value={message} onChange={e => messageBox(e.target.value).message} className="flex-grow p-3 border rounded mb-3" placeholder="Enter your message here..." />
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded">Send SMS</button>
                    </form>

                    <form className="bg-white rounded-xl p-6 shadow" onSubmit={handleSendSMS}>
                        {slider[0] && (
                            <>
                                {
                                    slider[2] && 
                                    
                                    // console.log(payload)
                                   displayElements(1)
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
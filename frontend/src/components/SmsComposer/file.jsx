import React, { useState } from 'react';

export default function ComposeSMS({props}){
    const {load, contacts} = props;
    const [sender, senderID] = useState('DC Group');
    const [message, setMessage] = useState('');
    
    const displayContacts = () => {
        return contacts.map((contact, index) => (
          <span key={index} className="mr-2">{contact[0]}: {contact[1]} {contact[2]}</span>
        ));
    }
    
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
                body: JSON.stringify({sender, message, "to": getNumbers}),
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

    return(
        <>
            <div className="flex items-center gap-3">
                {load && <span className="text-green-600">Contact Added! { displayContacts() }</span>}
                {load && <input type="button" value="Save Contacts" className="px-4 py-2 bg-green-600 text-white rounded cursor-pointer" />}
            </div>
            <form className="bg-white rounded-xl p-6 shadow" onSubmit={handleSendSMS}>
                <input type="text" className="flex-grow p-3 border rounded mb-3" placeholder="Sender ID" />
                <textarea rows={4} value={message} onChange={e=>setMessage(e.target.value)} className="flex-grow p-3 border rounded mb-3" placeholder="Enter your message here..." />
                <button className="px-4 py-2 bg-indigo-600 text-white rounded">Send SMS</button>
            </form>
        </>
    )
}
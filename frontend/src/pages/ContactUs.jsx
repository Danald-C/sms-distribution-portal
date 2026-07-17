import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../Contexts/auth.jsx';

export default function ContactUsForm(){
    const { values: { data, functions, setStates } } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState(data.user.email);
    const [subject, setSbject] = useState('');
    const [company, setCompany] = useState('');
    const [message, setMessage] = useState('');
    const [alerts, setAlerts] = useState([]);

    async function submitForm(e){
        e.preventDefault();
        
        if(email == "" || message == ""){
            setAlerts([{from: 1, type: "caution", message: "Please check the form. Some required fields (email or message) were left empty."}, ...alerts])
        }else{
            const response = await fetch(`http://localhost:4000/api/auth/contact-us?user_id=${data.user.user_id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({name, email, subject, company, message}),
            } );
            
            const responseData = await response.json();
            
            console.log(responseData);
            if(responseData.Success){
                setAlerts([{from: 1, type: "success", message: "Successfully submitted."}, ...alerts])
            }
        }
    }

    return(
        <>
            <Link to="/dashboard" className="text-blue-500 hover:underline">Back &laquo;</Link>
            <h2>Fill the form below..</h2>
            {alerts.length > 0 && functions.displayError(alerts)}
            <form onSubmit={submitForm}>
                <ul>
                    <li>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="flex-grow p-3 border rounded mb-3" placeholder="Your name.." />
                    </li>
                    <li>
                        <input type="text" value={email} onChange={e => setEmail(e.target.value)} className="flex-grow p-3 border rounded mb-3" placeholder="Email address.." />
                    </li>
                    <li>
                        <input type="text" value={subject} onChange={e => setSbject(e.target.value)} className="flex-grow p-3 border rounded mb-3" placeholder="Subject here.." />
                    </li>
                    <li>
                        <input type="text" value={company} onChange={e => setCompany(e.target.value)} className="flex-grow p-3 border rounded mb-3" placeholder="Your Company.." />
                    </li>
                    <li>
                        <textarea rows={4} value={message} onChange={e=>setMessage(e.target.value)} className="flex-grow p-3 border rounded mb-3" placeholder="Type your message here..." />
                    </li>
                    <li>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded">Send now..</button>
                    </li>
                </ul>
            </form>
        </>
    )
}
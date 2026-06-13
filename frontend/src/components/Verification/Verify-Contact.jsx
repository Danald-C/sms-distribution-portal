import React, { useState } from 'react';
import { useAuth } from '../../Contexts/auth.jsx';
import PhoneInput from "react-phone-number-input";

export default function VerifyContactPage(){
    const { values: { data, functions, setStates } } = useAuth();
    const [number, setNumber] = useState('')
    const [getAlerts, setGetAlerts] = useState([])

    async function submit(e){
        e.preventDefault()
        
        try{
            let numberErrors = functions.validateNumber(number);
            if(numberErrors.length > 0){
                // console.log(functions.validateNumber(number).map(alert => alert.message).join("\n"))
                setGetAlerts(numberErrors);
                return
            }

            // console.log(data.accessToken)
            const response = await fetch('http://localhost:4000/api/auth/verify-number', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${data.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ number }),
            })
            const responseData = await response.json()
            console.log(responseData)
        }catch(err){
            alert(err.message || 'Verification failed');
        }
    }
    // **** READ THIS
    // For unfinished OTPs, first check if phone number already exists in db, then immediately send otp and display 'Enter OTP' page. Make sure 'Enter phone number' is not displayed.

    return (
        <>
            {getAlerts.length > 0 && getAlerts.map(each => (<p>{each.message}</p>))}
            <form className="bg-white rounded-xl p-6 shadow bg-white p-6 rounded-2xl shadow-lg w-full max-w-md" onSubmit={submit}>
                <PhoneInput international defaultCountry="GH" value={number} onChange={setNumber} className="border p-3 rounded-lg" />
                <button className="px-4 py-2 bg-indigo-600 text-white rounded">Verify now</button>
            </form>
        </>
    )
}
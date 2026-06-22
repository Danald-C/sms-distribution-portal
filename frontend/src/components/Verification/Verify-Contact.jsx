import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Contexts/auth.jsx';
import PhoneInput from "react-phone-number-input";

export default function VerifyContactPage(){
    const { values: { data, functions, setStates } } = useAuth();
    const navigate = useNavigate();
    const [number, setNumber] = useState('')
    const [getAlerts, setGetAlerts] = useState([])

    const [otp, setOtp] = useState("");

    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verified, setVerified] = useState(false);

    async function submit(e){
        e.preventDefault()
        
        try{
            setLoading(true);
            let numberErrors = functions.validateNumber(number);
            if(numberErrors.length > 0){
                // console.log(functions.validateNumber(number).map(alert => alert.message).join("\n"))
                setGetAlerts(numberErrors);
                return
            }

            // console.log(data.accessToken)
            let response = await fetch('http://localhost:4000/api/auth/verify-number', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${data.accessToken}`,
                    'Content-Type': 'application/json',
                },
                // body: JSON.stringify({ process: 'send-otp', number }),
                body: JSON.stringify({ number, otp }),
            })
            const responseData = await response.json()
            if (responseData.status.complete){
                navigate("/profile");
            }else{
                responseData.status.success && setOtpSent(true);
            }
        }catch(err){
            console.error(err.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    }

    /* const verifyOtp = async () => {
        try {
            setLoading(true);

            // const response = await axios.post("http://localhost:4000/api/auth/verify-number", { process: 'receive-otp', number, otp, });
            let response = fetch('http://localhost:4000/api/auth/verify-number', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${data.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ process: 'receive-otp', number, otp, }),
            })

            console.log(await response.json())
            const returnedData = await response
            // if (returnedData.ok){
            //     temporaryStore({name: 'gateway', value: {}}, 3) // Remove it 
            //     setVerified(true);
            //     navigate("/profile");
            // }
        } catch (err) {
            console.error(err.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    }; */

    return (
        <>
            {getAlerts.length > 0 && getAlerts.map(each => (<p>{each.message}</p>))}
            {verified && (<div>Phone Number Verified ✓</div>)}
            {/* {console.log(data.accessToken)} */}
            {
                !otpSent && 
                <form className="bg-white rounded-xl p-6 shadow bg-white p-6 rounded-2xl shadow-lg w-full max-w-md" onSubmit={submit}>
                    <PhoneInput international defaultCountry="GH" value={number} onChange={setNumber} className="border p-3 rounded-lg" />
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded">Verify now</button>
                </form>
            }
            {
                otpSent && (<><input type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" /><button onClick={submit}>Verify OTP</button></>)
            }
        </>
    )
}
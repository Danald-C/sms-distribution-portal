import React, { useState, useEffect } from 'react';
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
    const [storedToken, setStoredToken] = useState(localStorage.getItem("token"));

    useEffect(() => {
        defaultValidate();
    }, [])
    
    
    async function defaultValidate(){
        // console.log('Wait, are you the one? ', data.loadContent)
        try{
            const response = await fetch(`${data.API_URL}/auth/get-user`, {
                headers: {
                    Authorization: `Bearer ${storedToken}`,
                },
            });
            let storedUser = await response.json();
            console.log(storedToken)

            if(storedUser.Success && storedUser.user.phone_number){
                console.log("Phone number verified: ", storedUser.user.phone_number)
            processRequest(number, "");
            setNumber(storedUser.user.phone_number);
            }else{
                functions.logout();
                // setStoredToken(null);
              //   navigate("/");
            }
            }catch(error){
            }finally{
            setLoading(false)
          }
        }

    async function submit(e){
        e.preventDefault()
        
        try{
            setLoading(true);
            let numberErrors = functions.validateNumber(number);
            if(numberErrors.length > 0){
                setGetAlerts(numberErrors);
                return
            }

            console.log("Number")
            /* let response = await fetch(`${data.API_URL}/auth/verify-number`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${data.accessToken}`,
                    'Content-Type': 'application/json',
                },
                // body: JSON.stringify({ process: 'send-otp', number }),
                body: JSON.stringify({ number, otp }),
            })
            const responseData = await response.json()
            // console.log("Verify Contact: ", responseData)
            if (responseData.status.complete){
                navigate("/dashboard");
            }else{
                responseData.status.success && setOtpSent(true);
            } */
           processRequest(number, otp);
        }catch(err){
            console.error(err.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    }

    async function processRequest(number, otp){
        let response = await fetch(`${data.API_URL}/auth/verify-number`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${storedToken}`,
                'Content-Type': 'application/json',
            },
            // body: JSON.stringify({ process: 'send-otp', number }),
            body: JSON.stringify({ number, otp }),
        })
        const responseData = await response.json()
        // console.log("Verify Contact: ", responseData)
        if (responseData.status.complete){
            navigate("/dashboard");
        }else{
            responseData.status.success && setOtpSent(true);
        }
    }

    if(!storedToken){
        navigate("/");
    }

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
                otpSent && (<><h3>Enter OTP code sent to this number {number}</h3><input type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" autoFocus /><button onClick={submit}>Verify OTP</button></>)
            }
        </>
    )
}
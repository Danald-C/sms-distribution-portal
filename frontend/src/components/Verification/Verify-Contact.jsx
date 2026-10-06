import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Contexts/auth.jsx';
import PhoneInput from "react-phone-number-input";

export default function VerifyContactPage(){
    const { values: { data, functions, setStates } } = useAuth();
    const navigate = useNavigate();
    const [number, setNumber] = useState('')
    const [getAlerts, setGetAlerts] = useState([])

    // const [otp, setOtp] = useState("");
    const [otp, setOtp] = useState({code: "", resend: false});
    const [user, setUser] = useState(null);

    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verified, setVerified] = useState(false);
    const [storedToken, setStoredToken] = useState(localStorage.getItem("token"));

    const [countdown, setCountdown] = useState(60)
    const [isSending, setIsSending] = useState(false)
    const [error, setError] = useState('')
    const [resendAt, setResendAt] = useState(Date.now() + 60 * 1000) // 60 seconds from now

    useEffect(() => {
        defaultValidate();

        const RESEND_COOLDOWN = 60
        if (!resendAt) return
        if (countdown <= 0) return

        updateCountdown();
        const timer = setInterval(updateCountdown, 1000)

       /* const timer = setInterval(() => {
           setCountdown(prev => prev - 1)
       }, 1000) */

       return () => clearInterval(timer)
    }, [resendAt])
    
    const updateCountdown = () => {
      const remaining = Math.ceil(
        (resendAt - Date.now()) / 1000
      )

      let countDown = Math.max(remaining, 0);
      setCountdown(countDown);
        console.log("When do we come here?")
        countDown == 0 && setOtp({...otp, resend: false});
    }
    async function defaultValidate(){
        // console.log('Wait, are you the one? ', data.loadContent)
        try{
            const response = await fetch(`${data.API_URL}/auth/get-user`, {
                headers: {
                    Authorization: `Bearer ${storedToken}`,
                },
            });
            let storedUser = await response.json();
            // console.log(storedUser)

            setNumber(storedUser.user.phone_number);
            setUser(storedUser.user);
            if(storedUser.Success && storedUser.user.phone_number){
                // console.log("Phone number verified: ")
                processRequest(storedUser.user.phone_number, "");
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

            // console.log(number)
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

        if (!response.ok) {
            throw new Error(responseData.message || 'Process Failed');
        }

        // console.log("Verify Contact: ", responseData)
        if (responseData.status.complete){
            navigate("/dashboard");
        }else{
            responseData.status.success && setOtpSent(true);
        }
    }

    const handleResendOtp = async () => {
        if (countdown > 0 || isSending) return

        try {
            setError('')
            setIsSending(true)
            let otp = {code: "", resend: true};
        // console.log("Yes we just came here..")

            /* const response = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
            })
            const data = await response.json() */
           processRequest(number, otp);

            // Start a new 60-second countdown
            setResendAt(Date.now() + 60 * 1000)

            // Restart countdown
            setCountdown(60)
            setOtp(otp);

        } catch (error) {
            console.error('Resend OTP error:', error)
            setError(error.message)
        } finally {
            setIsSending(false)
        }
    }

    if(!storedToken){
        navigate("/");
    }

    return (
        <>
            <div className="max-w-md mx-auto">
            {getAlerts.length > 0 && getAlerts.map(each => (<p>{each.message}</p>))}
            {/* {verified && (<div>Phone Number Verified ✓</div>)} */}
            {/* {console.log(otpSent, otp.resend)} */}
            {
                !otpSent && 
                <form className="bg-white rounded-xl p-6 shadow bg-white p-6 rounded-2xl shadow-lg w-full max-w-md" onSubmit={submit}>
                    <h3 className="text-2xl font-bold">Add a phone number to {user?.full_name+', '+user?.email || 'your account'}</h3>
                    <PhoneInput international defaultCountry="GH" value={number} onChange={setNumber} className="border p-3 rounded-lg" />
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded">Verify now</button>
                </form>
            }
            {
                otpSent && (<>{otpSent && otp.resend && <h2>A new OTP code has been resent.</h2>}<h3 className="text-sm text-gray-500 mt-2">Enter OTP code sent to this number {number}</h3><input className="w-full border rounded-lg px-4 py-3 mt-6" type="text" maxLength={6} inputMode="numeric" value={otp.code} onChange={(e) => setOtp({...otp, code: e.target.value})} placeholder="Enter 6-digit OTP" autoFocus />{otp.code && <button className="w-full mt-4 bg-primary text-white py-3 rounded-lg" onClick={submit}>Verify OTP</button>}
                <div  className="text-center mt-5">
                    {countdown > 0 ? (
                        <p className="text-sm text-gray-500">
                            You can resend the OTP in{' '}
                            <span className="font-semibold">
                            {countdown}s
                            </span>
                        </p>
                        ) : (
                        <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={isSending}
                            className="text-primary font-semibold"
                        >
                            {isSending ? 'Sending...' : 'Resend OTP'}
                        </button>
                        )
                    }
                </div>
                {error && (
                    <p className="text-sm text-red-500 text-center mt-3">
                    {error}
                    </p>
                )}
                </>)
            }
            </div>
        </>
    )
}
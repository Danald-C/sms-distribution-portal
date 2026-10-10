import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../Contexts/auth.jsx';
import PhoneInput from "react-phone-number-input";

export default function VerifyContactPage(){
    const { values: { data, functions, setStates } } = useAuth();
    const navigate = useNavigate();
    const [number, setNumber] = useState('')
    let localAlerts = [];
    const [getAlerts, setGetAlerts] = useState(localAlerts)
    const [alerts, setAlerts] = useState(localAlerts);

    // const [otp, setOtp] = useState("");
    const [otp, setOtp] = useState({code: "", resend: false});
    const [user, setUser] = useState(null);

    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verified, setVerified] = useState(false);
    // const [storedToken, setStoredToken] = useState(localStorage.getItem("token"));
    const [storedToken, setStoredToken] = useState(functions.temporaryStore({name: "token"}));

    const [countdown, setCountdown] = useState(60)
    let localIsSending = false
    const [isSending, setIsSending] = useState(localIsSending)
    const [error, setError] = useState('')
    const [resendAt, setResendAt] = useState(Date.now() + 60 * 1000) // 60 seconds from now
    
    let localRedirect = {state: false, id: 0, in: 0, to: "/"}
    const [redirect, setRedirect] = useState(localRedirect)

    // CNAME @ vxnnyeyy.up.railway.app
    // TXT _railway-verify railway-verify=8fdba417310f1b70c2b732c6eb0198744be4d92c620281e2a25527ec66080516
    useEffect(() => {
        // localRedirect = {state: true, in: 10, to: "/signup"};
        // functions.temporaryStore({name: "redirect", value: localRedirect}, 1, true);
        if(otpSent){
            if(number || functions.temporaryStore({name: "uPhoneNumber"})){
                let thisNum = number || functions.temporaryStore({name: "uPhoneNumber"});
                functions.temporaryStore({name: "uPhoneNumber"}, 2);
                processRequest(thisNum, otp);
                console.log("OTP sent to found number");
            }else{
                /* redirect = {in: 10, to: "/signup"};
                setAlerts(functions.processError(localAlerts, {number: 1, type: "caution", message: `Sorry, something went wrong. Resetting in ${redirect.in} seconds... You can `+<Link to='/signup'>SignIn</Link>+` again with the same Email.`}, 1));
                functions.logout(); */
                console.log("OTP sent BUT no number");
                defaultValidate();
            }
        }else{
            console.log("Getting ready to redirect...");
            if(functions.temporaryStore({name: "redirect"}, 0, true)) localRedirect = functions.temporaryStore({name: "redirect"}, 0, true);
            if(!localRedirect.state) defaultValidate();
        }
        
        console.log("When do we come here?", localIsSending, localRedirect, otpSent);
        // const RESEND_COOLDOWN = 60
        // if (!resendAt) return
        // if (countdown <= 0) return
        
        let clearRedirect, clearResendOTP;
        
        if(localRedirect.in > 0 && localRedirect.state){
            redirectPage();
            clearRedirect = setInterval(redirectPage, 1000);
        }

        // if(localIsSending){
            updateCountdown();
            clearResendOTP = setInterval(updateCountdown, 1000)
        // }
       return () => {
        clearInterval(clearRedirect)
        clearInterval(clearResendOTP)
        }
    }, [resendAt])

    const redirectPage = () => {
    console.log("Redirecting in...", localRedirect);
        localRedirect.in >= 10 && functions.temporaryStore({name: "redirect"}, 2);
        localRedirect = {...localRedirect, in: localRedirect.in - 1};

    // let newAlerts = functions.processError(localAlerts, {number: 1, type: "caution", message: `Sorry, something went wrong. Resetting in ${localRedirect.in} seconds... You can `+<Link to='/signup'>SignIn</Link>+` again with the same Email.`}, 1);
    
    // setRedirect(prev => {({...prev, in: prev.in - 1})});
    /* localAlerts = newAlerts;
    setAlerts(localAlerts); */
        setRedirect(localRedirect);
        if(localRedirect.in == 0){
            functions.logout();
            navigate(redirect.to)
        }
    }
    
    const updateCountdown = () => {
      const remaining = Math.ceil(
        (resendAt - Date.now()) / 1000
      )

      let countDown = Math.max(remaining, 0);
      if(countDown == 0){
            setOtp({...otp, resend: false});
            setIsSending(false);
        }
        setCountdown(countDown);
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
            
            // setNumber(storedUser.user.phone_number);
            setUser(storedUser.user);
            console.log("Yes it's us", storedUser)
            if(storedUser.Success){
                console.log("User verified: ")
                if(storedUser.user.phone_number){
                    console.log("Number available: ")
                    setOtp({...otp, resend: true});
                    localIsSending = true;
                    setIsSending(localIsSending);
                    // processRequest(storedUser.user.phone_number, {...otp, resend: true});
                    processRequest(storedUser.user.phone_number, {code: "", resend: false});
                    // setOtpSent(true); // Collect OTP
                }else{
                    console.log("Number NOT available: ")
                    setOtpSent(false); // Still request for the number
                }
            }else{
                console.log("No User found")
                goHome();
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
            console.log("Sending OTP", number, numberErrors)
            if(numberErrors.length > 0){
                numberErrors.map(each => localAlerts.push({number: 0, type: each.type, message: each.message}));
                // setAlerts(numberErrors);
                return
            }

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
        if(otp.code) isSending = true;
        
                console.log("Get user data now..", JSON.stringify({ number, otp }))
        /* let response = await fetch(`${data.API_URL}/auth/verify-number`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${storedToken}`,
                'Content-Type': 'application/json',
            },
            // body: JSON.stringify({ process: 'send-otp', number }),
            body: JSON.stringify({ number, otp }),
        })
        const responseData = await response.json() */
        const responseData = {status: {complete: false, resent: true, error: {state: false}}, user: {phone_number: '+233558244996'}}

        /* if (!response.ok) {
            throw new Error(responseData.message || 'Process Failed');
        } */

       if (responseData.status.complete){
           navigate("/dashboard");
        }else{
            if(responseData.status.error.state){
                // setRedirect({in: 10, to: "/signup"});
                goHome();
            }else{
                console.log("OTP Sent: ", responseData, countdown, isSending)
                setNumber(responseData.user.phone_number);
                // setUser(storedUser.user);
                functions.temporaryStore({name: "uPhoneNumber", value: responseData.user.phone_number}, 1);
                // responseData.status.success && setOtpSent(true);
                setOtpSent(true);
                setOtp({...otp, resend: responseData.status.resent});
                // responseData.status.resent && setIsSending(false);
                
                /* setCountdown(60);
                localIsSending = false;
                setIsSending(localIsSending); */
                // handleResendOtp(false);
            }
        }
    }

    // const handleResendOtp = async () => {
    const handleResendOtp = async sendRequest => {
        if (countdown > 0 || isSending) return

        console.log("Yes we just came here..")
        try {
            setError('')
            // setIsSending(true)
            let otp = {code: "", resend: true};

            /* const response = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
            })
            const data = await response.json() */
        //    processRequest(number, otp);
           sendRequest && processRequest(number, otp);

            // Start a new 60-second countdown
            setResendAt(Date.now() + 60 * 1000)

            // Restart countdown
            setCountdown(60)
            setOtp(otp);
            // setResendOTPState();

            localIsSending = true;
            setIsSending(localIsSending);
        } catch (error) {
            console.error('Resend OTP error:', error)
            setError(error.message)
        } finally {
            // setIsSending(false)
            localIsSending = false;
            setIsSending(localIsSending);
        }
    }

    /* function setResendOTPState(){
        setResendAt(Date.now() + 60 * 1000)

        // Restart countdown
        setCountdown(60)
        setOtp(otp);
    } */

    function goHome(){
        localAlerts = {...localAlerts, state: true, in: 10};
        functions.temporaryStore({name: "redirect", value: localAlerts}, 1, true);
        setAlerts(localAlerts);
        // window.location.reload();
        navigate(0);
    }

    if(!storedToken){
        navigate("/");
    }

    return (
        <>
            <div className="max-w-md mx-auto">
            {getAlerts.length > 0 && getAlerts.map(each => (<p>{each.message}</p>))}
            {/* {verified && (<div>Phone Number Verified ✓</div>)} */}
            {console.log("Page reload", otpSent, countdown, redirect)}
            {redirect.state && <p>Sorry, something went wrong. Resetting in {redirect.in} seconds... You can <Link to='/signup'>SignIn</Link> again with the same Email.</p>}
            {
                !redirect.state && !otpSent && 
                <form className="bg-white rounded-xl p-6 shadow bg-white p-6 rounded-2xl shadow-lg w-full max-w-md" onSubmit={submit}>
                    <h3 className="text-2xl font-bold">Add a phone number to {user?.full_name+', '+user?.email || 'your account'}</h3>
                    <PhoneInput international defaultCountry="GH" value={number} onChange={setNumber} className="border p-3 rounded-lg" autoFocus />
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded">Verify now</button>
                </form>
            }
            {
                !redirect.state && otpSent && (<>{otp.resend && <h2>A new OTP code has been resent.</h2>}<h3 className="text-sm text-gray-500 mt-2">Enter OTP code sent to this number {number}</h3><input className="w-full border rounded-lg px-4 py-3 mt-6" type="text" maxLength={6} inputMode="numeric" value={otp.code} onChange={(e) => setOtp({...otp, code: e.target.value})} placeholder="Enter 6-digit OTP" autoFocus />{otp.code && <button className="w-full mt-4 bg-primary text-white py-3 rounded-lg" onClick={submit}>Verify OTP</button>}
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
                            onClick={handleResendOtp(true)}
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
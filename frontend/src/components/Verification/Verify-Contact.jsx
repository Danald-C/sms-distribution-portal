import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, requestRefreshToken } from '../../Contexts/auth.jsx';
import PhoneInput from "react-phone-number-input";

export default function VerifyContactPage(){
    const { values: { data, functions, setStates } } = useAuth();
    const navigate = useNavigate();
    
    const [number, setNumber] = useState('')
    let localAlerts = [[], 0];
    // const [getAlerts, setGetAlerts] = useState(localAlerts)
    const [alerts, setAlerts] = useState(localAlerts);

    // const [otp, setOtp] = useState("");
    const [otp, setOtp] = useState({code: "", resent: false, enter: false});
    const [user, setUser] = useState(null);

    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verified, setVerified] = useState(false);
    // const [storedToken, setStoredToken] = useState(functions.temporaryStore({name: "token"}));
    // const [storedToken, setStoredToken] = useState(data.accessToken);
    const accessToken = data.accessToken;

    let baseCountDown = 60;
    const [countdown, setCountdown] = useState(baseCountDown)
    let localIsSending = false;
    const [isSending, setIsSending] = useState(localIsSending);
    const [error, setError] = useState('')
    const [resendAt, setResendAt] = useState(Date.now() + baseCountDown * 1000) // 60 seconds from now
    
    let localRedirect = {state: false, id: 0, in: 10, to: "/"}
    const [redirect, setRedirect] = useState(localRedirect)
    
//   console.log("PLEASE CHECK FOR ME: ", accessToken)
// console.log("VerifyContactPage rendered");

    // CNAME @ vxnnyeyy.up.railway.app
    // TXT _railway-verify railway-verify=8fdba417310f1b70c2b732c6eb0198744be4d92c620281e2a25527ec66080516
    /* useEffect(async () => {
        console.log("VerifyContactPage mounted");
        // localRedirect = {state: true, in: 10, to: "/signup"};
        // functions.temporaryStore({name: "redirect", value: localRedirect}, 1, true);
        console.log("[DEBUG] Effect executed", {
            time: new Date().toISOString(),
            otpSent,
            resendAt,
            isSending
        });

        const controller = new AbortController();
        if(otpSent){
            if(number || functions.temporaryStore({name: "uPhoneNumber"})){
                let thisNum = number || functions.temporaryStore({name: "uPhoneNumber"});
                setNumber(thisNum);
                functions.temporaryStore({name: "uPhoneNumber"}, 2);
                console.log("OTP sent to found number", otp);
                // processRequest(thisNum, otp);
            }else{
                console.log("OTP sent BUT no number");
                await defaultValidate(controller);
            }
        }else{
            console.log("Getting ready to redirect...");
            console.log(functions.temporaryStore({name: "redirect"}, 0, true));
            if(functions.temporaryStore({name: "redirect"}, 0, true)){
                localRedirect = functions.temporaryStore({name: "redirect"}, 0, true);
                setRedirect(localRedirect);
            }
            if(!localRedirect.state || !redirect.state) await defaultValidate(controller);
        }
    //   setOtp({...otp, resent: false});
        
        console.log("When do we come here?", localIsSending, isSending, localRedirect, otpSent);
        // const RESEND_COOLDOWN = 60
        // if (!resendAt) return
        // if (countdown <= 0) return
        
        let clearRedirect, clearResendOTP;
        
        if(localRedirect.in > 0 && localRedirect.state){
            // redirectPage();
            // clearRedirect = setInterval(redirectPage, 1000);
        }

        // if(localIsSending || isSending){
        //     localIsSending = false;
        //     setIsSending(localIsSending);
        //     setOtp({...otp, resent: false});
        //     updateCountdown();
        //     clearResendOTP = setInterval(updateCountdown, 1000)
        // }
       return () => {
        console.log("VerifyContactPage unmounted");
        clearInterval(clearRedirect)
        // clearInterval(clearResendOTP)
        }
    // }, [resendAt]);
    }, []); */
   /*  useEffect(() => {
        const controller = new AbortController();

        async function initialize() {
            try {
                console.log("VerifyContactPage mounted");

                if (otpSent) {
                    const storedNumber = number || functions.temporaryStore({name: "uPhoneNumber"});

                    if (storedNumber) {
                        setNumber(storedNumber);

                        functions.temporaryStore({ name: "uPhoneNumber" }, 2);
                    } else {
                        await defaultValidate(controller);
                    }

                    return;
                }

                const storedRedirect = functions.temporaryStore({ name: "redirect" }, 0, true);
                console.log("Initial process", storedRedirect);

                // if (storedRedirect) setRedirect(storedRedirect);

                if (!storedRedirect?.state){
                    await defaultValidate(controller);
                }else{
                    setRedirect(storedRedirect);
                    
                    redirectPage();
                    const timer = setInterval(redirectPage, 1000);
                    return () => clearInterval(timer);
                }
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.error(
                        "Verification page initialization failed:",
                        error
                    );
                }
            }
        }

        initialize();

        return () => {
            controller.abort();
        };
    }, []); */
    useEffect(() => {

        // Authentication must finish restoring the session first.
        let clearRedirect = null;
        if (!data.authReady) {
            /* if(!redirect.state && !localRedirect.state){
                localRedirect = {...localRedirect, in: 10, to: "/signup"}
                redirectPage();
                clearRedirect = setInterval(redirectPage, 1000);
                localRedirect = {...localRedirect, id: clearRedirect};
            } */
        //    console.log("[VERIFY] Initializing verification page.", redirect, localRedirect, functions.temporaryStore({ name: "redirect" }));
            if(!redirect.state && !localRedirect.state && functions.temporaryStore({ name: "redirect" }, 0, true) && functions.temporaryStore({ name: "redirect" }, 0, true).state){
                localRedirect = functions.temporaryStore({ name: "redirect" }, 0, true);
                // setRedirect(localRedirect);
                redirectPage();
                clearRedirect = setInterval(redirectPage, 1000);
                localRedirect = {...localRedirect, id: clearRedirect}
                }

                    // clearInterval(timer);
            // return;
        }

        // Never call a protected endpoint with a missing token.
        if (!accessToken) {
            console.warn(
                "[VERIFY] No access token available. Skipping user request."
            );
            return;
        }

        const controller = new AbortController();
        let cancelled = false;


        async function initialize() {
            try {
                /* const storedRedirect =
                    functions.temporaryStore(
                        { name: "redirect" },
                        0,
                        true
                    );

                if (storedRedirect?.state && storedRedirect?.in) {
                }else{
                    // Retrieve the authenticated user's profile.
                } */
                await defaultValidate(controller, () => cancelled);
            } catch (error) {
                if (
                    !cancelled &&
                    error.name !== "AbortError"
                ) {
                    console.error(
                        "[VERIFY] Initialization failed:",
                        error
                    );
                }
            }
        }

        initialize();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [data.authReady, accessToken, data.API_URL]);

    useEffect(() => {
        if (!resendAt) return;

        let timer = null;
        const updateCountdown = () => {
            const remaining = Math.ceil(
                (resendAt - Date.now()) / 1000
            );
            const currNumber = Math.max(remaining, 0);

            // console.log("Countdown after: ", [isSending, localIsSending], redirect, localRedirect);
            setCountdown(currNumber);
            if(currNumber <= 0){
                console.log("Countdown has reset");
                localIsSending = false;
                setIsSending(localIsSending);
                setOtp(prev => ({...prev, resent: false}));
                
                clearInterval(timer);
            }
        };

        // console.log("Countdown before: ", [isSending, localIsSending], redirect);
        // if(isSending && !localRedirect?.state){
        // if(localIsSending){
            updateCountdown();
            timer = setInterval(updateCountdown, 1000);
            return () => clearInterval(timer);
        // }

    }, [resendAt, countdown, isSending]);

    useEffect(() => {
        if (!data.authReady) return;
        // if (!accessToken) navigate("/", { replace: true });
        // if (!accessToken) goHome();
    }, [data.authReady, accessToken, navigate]);





    // --------------------------------------------------------
    // --------------------- FUNCTIONS    ---------------------
    // --------------------------------------------------------
    
    /* const updateCountdown = () => {
      const remaining = Math.ceil((resendAt - Date.now()) / 1000);

      let countDown = Math.max(remaining, 0);
      if(countDown == 0){
        // console.log("Countdown is zero, resending OTP is now possible", countDown, isSending);
        
        localIsSending = false;
        setIsSending(localIsSending);
        setOtp(prev => ({...prev, resent: false}));
        }
        setCountdown(countDown);
    } */

    const redirectPage = () => {
        localRedirect = {...localRedirect, in: --localRedirect.in}
        // setRedirect(prev => ({...prev, in: redirect.in-1}));
        setRedirect(localRedirect);
        // console.log("Redirect taking place..", redirect, localRedirect);
        
        // let newAlerts = functions.processError(localAlerts, {number: 1, type: "caution", message: `Sorry, something went wrong. Resetting in ${localRedirect.in} seconds... You can `+<Link to='/signup'>SignIn</Link>+` again with the same Email.`}, 1);
    
    // setRedirect(prev => {({...prev, in: prev.in - 1})});
        if(localRedirect.in <= 0){
            console.log("Redirect has reset..");
            functions.temporaryStore({name: "redirect"}, 2);
            // functions.temporaryStore({name: "token"}, 2);
            functions.logout();
            clearInterval(localRedirect.id);
            let to = localRedirect.to;
            localRedirect = {...localRedirect, state: false, id: 0, to: "/", in: 0};
            setRedirect(localRedirect);
            navigate(to)
        }
    }

    // async function defaultValidate(abortController){    
    async function defaultValidate(abortController, isCancelled=()=>false) {
        /* console.log('Wait, are you the one? ')
        console.trace("[DEBUG] defaultValidate invoked", {
            time: new Date().toISOString(),
            otpSent,
            resendAt,
            accessToken
        }); */

        /* try{
            const response = await fetch(`${data.API_URL}/auth/get-user`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                signal: abortController.signal,
            });

            if (!response.ok) {
                throw new Error(
                    `User request failed with status ${response.status}`
                );
            }

            let storedUser = await response.json();
            
            // setNumber(storedUser.user.phone_number);
            setUser(storedUser.user);
            console.log("Yes it's us", storedUser)
            if(storedUser.Success){
                console.log("User Found: ")
                if(storedUser.user.phone_number){
                    console.log("Number available: ")
                    // setOtp({...otp, resent: true});
                    localIsSending = true;
                    setIsSending(localIsSending);
                    // processRequest(storedUser.user.phone_number, {...otp, resend: true});
                    await processRequest(storedUser.user.phone_number, {code: "", resend: false});
                    // setOtpSent(true); // Collect OTP
                }else{
                    console.log("Number NOT available: ")
                    setOtpSent(false); // Still request for the number
                }
            }else{
                console.log("No User found")
                // goHome();
            }
        }catch(error){
            console.log("Something went wrong! Error: ", error);
        }finally{
            setLoading(false)
            localIsSending = false;
            setIsSending(localIsSending);
        } */
        if (!data.authReady || !accessToken) {
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                `${data.API_URL}/auth/get-user`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    },
                    signal: abortController.signal
                }
            );

            if (!response.ok) {
                throw new Error(
                    `User request failed with status ${response.status}`
                );
            }

            const storedUser = await response.json();

            if (isCancelled()) {
                return;
            }

            // if (!storedUser.Success || !storedUser.user) throw new Error("The authenticated user could not be retrieved.");
            if (!storedUser.Success || !storedUser.user) goHome();

            setUser(storedUser.user);
            console.log("User Found: ")
            if(storedUser.user.phone_number){
                console.log("Number available: ");
                // localIsSending = true;
                // setIsSending(localIsSending);
                await processRequest(storedUser.user.phone_number, {code: "", resend: false});
            }else{
                console.log("Number NOT available: ")
                setOtpSent(false); // Still request for the number
            }

            // Don't automatically send an OTP here.
            // We'll connect the OTP request after inspecting
            // the backend endpoint and its expected payload.
        } catch (error) {
            if (!isCancelled() && error.name !== "AbortError") {
                console.error("[VERIFY] Failed to retrieve user:", error);
                setError(error.message);
            }
        } finally {
            if (!isCancelled()) {
                setLoading(false);
            }
        }
    }
    // }

    async function submit(e){
    // async function submit(){
        e.preventDefault()
        
        try{
            setLoading(true);
            let numberErrors = functions.validateNumber(number);
            if(numberErrors.length > 0){
                numberErrors.map(each => localAlerts[0].push({number: ++localAlerts[1], type: each.type, message: each.message}));
                setAlerts(localAlerts);
                // setAlerts(numberErrors);
                return
            }
            setOtp({...otp, resent: false});
            console.log("Sending OTP", number, numberErrors)
            
            /* let response = await fetch(`${data.API_URL}/auth/verify-number`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
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
           
            localIsSending = true;
            setIsSending(localIsSending);
           await processRequest(number, {...otp, resend: false});
        }catch(err){
            console.error(err.message || 'Verification failed');
        } finally {
            setLoading(false);
            localIsSending = true;
            setIsSending(localIsSending);
        }
    }

    // async function processRequest(number, otp){
    async function processRequest(number, paramOtp){
        // if(otp.code) isSending = true;
        
                // console.log("Get user data now..", JSON.stringify({ number, paramOtp }), Boolean(accessToken))
        let response = await fetch(`${data.API_URL}/auth/verify-number`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            // body: JSON.stringify({ process: 'send-otp', number }),
            body: JSON.stringify({ number, otp: paramOtp }),
        })
        const responseData = await response.json()
        // const responseData = {status: {complete: false, otp: {resent: false}, error: {state: false}}, user: {phone_number: '+233558244996'}}

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
                // responseData.status.resent && setIsSending(true);
                if(responseData.status.otp.sent){
                    console.log("Should we count down? ")
                    localIsSending = true;
                    setIsSending(localIsSending);
                    setResendAt(Date.now() + baseCountDown * 1000);
                    setCountdown(baseCountDown) // Restart countdown
                }else{
                    localIsSending = false;
                    setIsSending(localIsSending);
                    setResendAt(Date.now());
                    setCountdown(0) // Don't countdown
                }
                
                // setOtp({...otp, resent: responseData.status.otp.resent, enter: true});
                setOtp(prev => ({...prev, resent: responseData.status.otp.resent, enter: true}));
            }
        }
    }

    const handleResendOtp = async () => {
    // const handleResendOtp = async sendRequest => {
        if (countdown > 0 || isSending) return

        console.log("Yes we just came here..")
        try {
            setError('')
            setOtp({...otp, code: ''});
            // localIsSending = true;
            // setIsSending(localIsSending);
            let resendOTP = {...otp, code: "", resend: true};

            /* const response = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
            })
            const data = await response.json() */
           await processRequest(number, resendOTP);
        //    sendRequest && processRequest(number, otp);

            // Start a new 60-second countdown
            /* setResendAt(Date.now() + baseCountDown * 1000)

            // Restart countdown
            setCountdown(baseCountDown)
            resendOTP = {...resendOTP, resend: false};
            setOtp(resendOTP);
            // setResendOTPState();

            localIsSending = true;
            setIsSending(localIsSending); */
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

    function goHome(destination=""){
        localRedirect = {...redirect, to: destination || redirect.to, state: true, in: 10};
        functions.temporaryStore({name: "redirect", value: localRedirect}, 1, true);
        setRedirect(localRedirect);
        setOtpSent(false);

        // window.location.reload();
        navigate(0); // Call same page / Reload
    }

    async function handleUserRollback(){
        try{
            // functions.logout();

            const response = await fetch(`${data.API_URL}/auth/remove-user`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
            });
            
            const result = await response.json();

            console.log("You chose to cancel: ", result);
            if(result.Success){
                goHome('/signup');
            }
        }catch(err){
            console.error(err.message || 'Failed to clean user');
        }
    }


    return (
        <>
            <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4 py-12">
                <div className="max-w-md mx-auto">
                    {alerts[0].length > 0 && alerts[0].map(each => (<p>{each.message}</p>))}
                    {/* {verified && (<div>Phone Number Verified ✓</div>)} */}
                    {/* {console.log("Page reload", countdown)} */}
                    {redirect.state && <p>Sorry, something went wrong. Resetting in {redirect.in} seconds... You can <Link to='/signup'>SignIn</Link> again with the same Email.</p>}
                    <form className="bg-white rounded-xl p-6 shadow bg-white p-6 rounded-2xl shadow-lg w-full max-w-md" onSubmit={submit}>
                    {/* <div className="bg-white rounded-xl p-6 shadow bg-white p-6 rounded-2xl shadow-lg w-full max-w-md"> */}
                    {
                        !redirect.state && !otpSent && 
                            <>
                                <h3 className="text-2xl font-bold">Add a phone number to {user ? [user.full_name, user.email].filter(Boolean).join(", ") || "your account"
                                : "your account"}</h3>
                                <PhoneInput international defaultCountry="GH" value={number} onChange={setNumber} className="border p-3 rounded-lg" autoFocus />
                                {/* <button onClick={submit} className="px-4 py-2 bg-indigo-600 text-white rounded">Verify now</button> */}
                                <button className="px-4 py-2 bg-indigo-600 text-white rounded">Verify now</button>
                            </>
                    }
                    {
                        !redirect.state && otpSent &&
                        // otpSent &&
                        <>
                            {otp.resent && <h2>A new OTP code has been resent.</h2>}
                            <h3 className="text-sm text-gray-500 mt-2">Enter OTP code sent to this number {number}</h3>
                            <input className="w-full border rounded-lg px-4 py-3 mt-6" type="text" maxLength={6} inputMode="numeric" value={otp.code} onChange={(e) => setOtp({...otp, code: e.target.value})} placeholder="Enter 6-digit OTP" autoFocus />
                            {/* {otp.enter && otp.code && <button onClick={submit} className="w-full mt-4 bg-primary text-black py-3 rounded-lg">Verify OTP</button>} */}
                            {otp.enter && otp.code && <button className="w-full mt-4 bg-primary text-black py-3 rounded-lg">Verify OTP</button>}
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
                                        // onClick={() => handleResendOtp(true)}
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
                            <button
                                type="button"
                                onClick={handleUserRollback}
                            >
                                Cancel
                            </button>
                        </>
                    }
                    </form>
                    {/* </div> */}
                </div>
            </main>
        </>
    )
}
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
    
    useEffect(() => {

        // Authentication must finish restoring the session first.
        let clearRedirect = null;
        if (!data.authReady) {
        //    console.log("[VERIFY] Initializing verification page.", redirect, localRedirect, functions.temporaryStore({ name: "redirect" }));
            if(!redirect.state && !localRedirect.state && functions.temporaryStore({ name: "redirect" }, 0, true) && functions.temporaryStore({ name: "redirect" }, 0, true).state){
                localRedirect = functions.temporaryStore({ name: "redirect" }, 0, true);
                // setRedirect(localRedirect);
                redirectPage();
                // clearRedirect = setInterval(redirectPage, 1000);
                // localRedirect = {...localRedirect, id: clearRedirect}
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
        if (!accessToken) goHome();
    }, [data.authReady, accessToken, navigate]);





    // --------------------------------------------------------
    // --------------------- FUNCTIONS    ---------------------
    // --------------------------------------------------------

    const redirectPage = () => {
        /* localRedirect = {...localRedirect, in: --localRedirect.in}
        // setRedirect(prev => ({...prev, in: redirect.in-1}));
        setRedirect(localRedirect); */
        // console.log("Redirect taking place..", redirect, localRedirect);
        
        // let newAlerts = functions.processError(localAlerts, {number: 1, type: "caution", message: `Sorry, something went wrong. Resetting in ${localRedirect.in} seconds... You can `+<Link to='/signup'>SignIn</Link>+` again with the same Email.`}, 1);
    
    // setRedirect(prev => {({...prev, in: prev.in - 1})});
        // if(localRedirect.in <= 0){
            // console.log("Redirect has reset..");
            functions.temporaryStore({name: "redirect"}, 2);
            // functions.temporaryStore({name: "token"}, 2);
            functions.logout();
            clearInterval(localRedirect.id);
            let to = localRedirect.to;
            localRedirect = {...localRedirect, state: false, id: 0, to: "/", in: 0};
            setRedirect(localRedirect);
            navigate(to)
        // }
    }

    // async function defaultValidate(abortController){    
    async function defaultValidate(abortController, isCancelled=()=>false) {
        if (!data.authReady || !accessToken) {
            return;
        }

        try {
            setLoading(true);

            /* const response = await fetch(
                `${data.API_URL}/auth/get-user`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    },
                    signal: abortController.signal
                }
            ); */
            const response = await functions.authenticatedFetch(
                `${data.API_URL}/auth/get-user`,
                {
                    method: "GET",
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
        /* let response = await fetch(`${data.API_URL}/auth/verify-number`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            // body: JSON.stringify({ process: 'send-otp', number }),
            body: JSON.stringify({ number, otp: paramOtp }),
        }) */
        const response = await functions.authenticatedFetch(
            `${data.API_URL}/auth/verify-number`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ number, otp: paramOtp }),
            }
        );
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

           await processRequest(number, resendOTP);
        } catch (error) {
            console.error('Resend OTP error:', error)
            setError(error.message)
        } finally {
            // setIsSending(false)
            localIsSending = false;
            setIsSending(localIsSending);
        }
    }

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

            /* const response = await fetch(`${data.API_URL}/auth/remove-user`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
            }); */
            const response = await functions.authenticatedFetch(
                `${data.API_URL}/auth/remove-user`,
                {
                    method: "GET",
                }
            );
            
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
        <main className="flex min-h-screen items-center justify-center bg-[#f3f8fd] px-4 py-8 sm:px-6 sm:py-12">
            <div className="w-full max-w-lg">
                {alerts[0].length > 0 && (
                    <div className="mb-4 space-y-2" role="alert">
                        {alerts[0].map((each, index) => (
                            <p
                                key={each.number ?? index}
                                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                            >
                                {each.message}
                            </p>
                        ))}
                    </div>
                )}

                {redirect.state && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        Sorry, something went wrong. Resetting in {redirect.in} seconds. You can{' '}
                        <Link to="/signup" className="font-semibold underline">
                            sign in
                        </Link>{' '}
                        again with the same email.
                    </div>
                )}

                <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
                    <header className="bg-[#0b4f8a] px-5 py-6 text-white sm:px-8 sm:py-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">
                            Account security
                        </p>

                        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                            {otpSent ? 'Verify your phone' : 'Add your phone number'}
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-blue-100">
                            {otpSent
                                ? 'Enter the one-time code sent to your phone to complete verification.'
                                : 'Add a phone number to your account so we can verify it securely.'}
                        </p>
                    </header>

                    <div className="p-5 sm:p-8">
                        {loading && !otpSent ? (
                            <p className="mb-5 text-sm text-slate-500">
                                Loading your account…
                            </p>
                        ) : null}

                        {!redirect.state && !otpSent && (
                            <form onSubmit={submit} className="space-y-5">
                                <div>
                                    <label
                                        htmlFor="verify-phone"
                                        className="mb-2 block text-sm font-medium text-slate-700"
                                    >
                                        Phone number
                                    </label>

                                    <PhoneInput
                                        id="verify-phone"
                                        international
                                        defaultCountry="GH"
                                        value={number}
                                        onChange={setNumber}
                                        autoFocus
                                        className="phone-input w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100"
                                    />

                                    <p className="mt-2 text-xs leading-5 text-slate-500">
                                        Include your country code so we can send the verification code.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex w-full items-center justify-center rounded-xl bg-[#0b4f8a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#083f70] focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loading ? 'Please wait…' : 'Send verification code'}
                                </button>
                            </form>
                        )}

                        {!redirect.state && otpSent && (
                            <form onSubmit={submit} className="space-y-5">
                                {otp.resent && (
                                    <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                                        A new verification code has been sent.
                                    </p>
                                )}

                                <div>
                                    <p className="text-sm text-slate-600">
                                        Enter the 6-digit code sent to
                                    </p>
                                    <p className="mt-1 break-words font-semibold text-slate-900">
                                        {number}
                                    </p>
                                </div>

                                <div>
                                    <label
                                        htmlFor="verify-otp"
                                        className="mb-2 block text-sm font-medium text-slate-700"
                                    >
                                        Verification code
                                    </label>

                                    <input
                                        id="verify-otp"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        maxLength={6}
                                        value={otp.code}
                                        onChange={(e) =>
                                            setOtp((prev) => ({
                                                ...prev,
                                                code: e.target.value.replace(/\D/g, '').slice(0, 6),
                                            }))
                                        }
                                        placeholder="Enter 6-digit code"
                                        autoFocus
                                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-lg tracking-[0.35em] outline-none transition placeholder:tracking-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                </div>

                                {error && (
                                    <p
                                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                                        role="alert"
                                    >
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={!otp.enter || otp.code.length !== 6 || loading}
                                    className="w-full rounded-xl bg-[#0b4f8a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#083f70] focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {loading ? 'Verifying…' : 'Verify phone number'}
                                </button>

                                <div className="text-center">
                                    {countdown > 0 ? (
                                        <p className="text-sm text-slate-500">
                                            You can request another code in{' '}
                                            <span className="font-semibold text-slate-700">
                                                {countdown}s
                                            </span>
                                        </p>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleResendOtp}
                                            disabled={isSending}
                                            className="text-sm font-semibold text-blue-700 underline-offset-4 hover:underline disabled:opacity-50"
                                        >
                                            {isSending ? 'Sending code…' : 'Resend code'}
                                        </button>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={handleUserRollback}
                                    className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
                                >
                                    Cancel verification
                                </button>
                            </form>
                        )}
                    </div>
                </section>

                <p className="mt-5 text-center text-xs leading-5 text-slate-500">
                    Your phone number is used for account verification.
                </p>
            </div>
        </main>
    );
}
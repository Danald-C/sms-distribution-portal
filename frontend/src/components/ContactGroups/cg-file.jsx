import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../Contexts/auth.jsx';

export default function ContactGrouping(){
    const { values: { data, functions } } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [alerts, setAlerts] = useState([]);
    const [clear, setClear] = useState(false);
    const [phone_number_groups, setPhone_number_groups] = useState({data: [], pagination: {page: 1, limit: 10, total: 0}});
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState({});

    useEffect(() => {
        settingData()
    }, [])

    
    async function settingData(){
        try{
        // console.log('Wait, are you the one? ')
            if(data.phoneNumbersData.phone_number_groups) setPhone_number_groups(data.phoneNumbersData.phone_number_groups)
        }catch(error){
            //
        }finally{
            setLoading(false)
        }
    }

    async function submit(e){
        e.preventDefault();

        if(!name){
            setAlerts([{from: 2, type: "caution", message: "Enter a name for your group."}, ...alerts])

            return
        }
        
        try{
            setLoading(true)
            // console.log(data.accessToken)
            /* const response = await fetch('http://localhost:4000/api/auth/contact-grouping', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({name, description, user_id: data.user.user_id}),
            })
            const responseData = await response.json() */
            // const responseData = await ContactGroupRequest(1, selected ? "update" : "create");
            const responseData = await ContactGroupRequest(0, Object.keys(selected).length > 0 ? "update" : "create");

            if(responseData.success){
                functions.setLoadContent(true);
                // setStates.ContactsData({phone_number_groups: responseData.phone_number_groups, ...setStates.phoneNumbersData});
                setPhone_number_groups(responseData.phone_number_groups)
                /* setSelected({});
                setName('')
                setDescription('') */
                processSelected(Object.keys(selected).length > 0 ? selected : {id: 0}, true);
            }
            setClear(true);
            setAlerts([]);
        }catch(error){
            //
        }finally{
            setLoading(false)
        }
    }

    function getValues(e, type){
        type == 0 && setName(e.target.value)
        type == 1 && setDescription(e.target.value)

        setClear(false)
    }

    // async function ContactGroupRequest(mode, action="get", load=false, id=0){
    async function ContactGroupRequest(id, action="get", load=false){
        // let bodyData = { name: "", description: "" };

        if(Object.keys(selected).length > 0){
            id = selected.id;
        }
            let bodyData = { name, description }

        // const response = await fetch(`http://localhost:4000/api/auth/contact-grouping?id=${id}&user_id=${data.user.user_id}&action=${action}`, {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/contact-grouping?id=${id}&user_id=${data.user.user_id}&action=${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bodyData),
            } )
        
        if(load){
            try{
                setLoading(true)
                const responseData = await response.json();
                
                if(responseData.success){
                    functions.setLoadContent(true);
                    setPhone_number_groups(responseData.phone_number_groups)
                    setName('')
                    setDescription('')
                }
                // setClear(true);
                setAlerts([]);
                // console.log("And finally, loading is set to false.");
            }catch(error){
                //
            }finally{
                setLoading(false)
            }
        }else{
            return await response.json();
        }
    }

    function processSelected(thisData, clear=false){
        // console.log(thisData);
        if(selected && thisData.id == selected.id || clear){
            setSelected({});
            setName('')
            setDescription('')
            setClear(true);
        }else{
            setName(thisData.group_name)
            setDescription(thisData.group_description || "")
            setSelected(thisData);
            setClear(false);
        }
    }

    // if(loading) return <div>Loading...</div>

    return (
        <section className="w-full min-w-0 space-y-6 text-[#13243a]">
            {alerts.length > 0 && functions.displayError(alerts)}

            <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-2 inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">
                        Group Management
                    </p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        Organize your contacts into groups so you can manage recipients and prepare SMS messages more easily.
                    </p>
                </div>
                <div className="rounded-xl border border-sky-100 bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">Total groups</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{phone_number_groups.data.length}</p>
                </div>
            </header>

            <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5">
                        <h2 className="text-lg font-semibold text-slate-900">
                            {selected.group_name ? "Edit group" : "Create a group"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {selected.group_name
                                ? "Update the selected group's name or description."
                                : "Give your group a clear name and an optional description."}
                        </p>
                    </div>

                    <form className="space-y-5" onSubmit={submit}>
                        <div>
                            <label htmlFor="contact-group-name" className="mb-2 block text-sm font-medium text-slate-700">
                                Group name <span className="text-rose-600">*</span>
                            </label>
                            <input
                                id="contact-group-name"
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Weekend Updates"
                                required
                                className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                            />
                        </div>

                        <div>
                            <label htmlFor="contact-group-description" className="mb-2 block text-sm font-medium text-slate-700">
                                Description <span className="font-normal text-slate-400">(optional)</span>
                            </label>
                            <textarea
                                id="contact-group-description"
                                rows={4}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Describe who belongs in this group or what it is used for."
                                className="block w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                            />
                        </div>

                        <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b4f8a] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#083f70] focus:outline-none focus:ring-4 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? "Saving…" : selected.group_name ? "Save changes" : "Create group"}
                            </button>
                            {selected.group_name && (
                                <button
                                    type="button"
                                    onClick={() => processSelected(selected, true)}
                                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
                                >
                                    Cancel editing
                                </button>
                            )}
                        </div>
                    </form>
                </section>

                <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Your groups</h2>
                            <p className="mt-1 text-sm text-slate-500">Select a group to edit it, or remove a group you no longer need.</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                            {phone_number_groups.data.length} {phone_number_groups.data.length === 1 ? "group" : "groups"}
                        </span>
                    </div>

                    {phone_number_groups.data.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-[#0b4f8a]">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">No contact groups yet</h3>
                            <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-slate-500">
                                Create your first group using the form to start organizing contacts.
                            </p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {phone_number_groups.data.map(each => {
                                const isSelected = selected.id === each.id;
                                return (
                                    <li
                                        key={each.id}
                                        className={`rounded-xl border p-4 transition ${
                                            isSelected
                                                ? "border-sky-300 bg-sky-50 ring-2 ring-sky-100"
                                                : "border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50"
                                        }`}
                                    >
                                        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <button
                                                type="button"
                                                title={each.group_description || ""}
                                                onClick={() => processSelected(each)}
                                                className="min-w-0 flex-1 text-left focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 rounded-lg"
                                            >
                                                <span className="flex items-start gap-3">
                                                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[#0b4f8a]">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75A2.25 2.25 0 0 1 6 4.5h4.5a2.25 2.25 0 0 1 1.59.66l1.5 1.5a2.25 2.25 0 0 0 1.59.66H18a2.25 2.25 0 0 1 2.25 2.25v7.68A2.25 2.25 0 0 1 18 19.5H6a2.25 2.25 0 0 1-2.25-2.25V6.75Z" />
                                                        </svg>
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block break-words text-sm font-semibold text-slate-900">{each.group_name}</span>
                                                        <span className="mt-1 block break-words text-sm leading-5 text-slate-500">
                                                            {each.group_description || "No description provided."}
                                                        </span>
                                                    </span>
                                                </span>
                                            </button>
                                            <div className="flex shrink-0 gap-2 pl-13 sm:pl-0">
                                                <button
                                                    type="button"
                                                    onClick={() => processSelected(each)}
                                                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-[#0b4f8a]"
                                                >
                                                    {isSelected ? "Selected" : "Edit"}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={loading}
                                                    onClick={() => ContactGroupRequest(each.id, "remove", true)}
                                                    className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </section>
    );
}

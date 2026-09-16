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
        <>
            {/* {alerts.length > 0 && functions.displayError(alerts)} */}
            {/* {console.log("Okay whats's up? ", loading, phone_number_groups)} */}
            <div>
                <h2>Create Phone Number Groups</h2>
                <form className="bg-white rounded-xl p-6 shadow bg-white p-6 rounded-2xl shadow-lg w-full max-w-md" onSubmit={submit}>
                    {/* <input type="text" value={clear ? '' : selected.group_name || name} onChange={e=>getValues(e, 0)} className="flex-grow p-3 border rounded mb-3" placeholder="Group Name" /> */}
                    <input type="text" value={name} onChange={e=>setName(e.target.value)} className="flex-grow p-3 border rounded mb-3" placeholder="Group Name" />
                    <textarea rows={4} value={description} onChange={e=>setDescription(e.target.value)} className="flex-grow p-3 border rounded mb-3" placeholder="Description... Optional." />
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded">{selected.group_name ? "Chang" : "Creat"}{loading ? "ing" : "e"} Group</button>
                </form>
                <ul>
                    {/* {data.phoneNumbersData.phone_number_groups.data.map(each => { */}
                    {phone_number_groups.data.map(each => {
                        return (<li key={each.id}><a href='#' title={each.description} onClick={() => processSelected(each)}>{each.group_name}</a> | <a href='#' onClick={() => ContactGroupRequest(each.id, "remove", true)}>remove</a></li>)
                    })}
                </ul>
            </div>
        </>
    );
}
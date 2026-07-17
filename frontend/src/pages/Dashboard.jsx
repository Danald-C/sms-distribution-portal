import React from 'react'
import { Link } from 'react-router-dom';
import { useAuth } from '../Contexts/auth.jsx';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import ContactGrouping from '../components/ContactGroups/cg'

const demo = [{date:'2025-09-25',units:120},{date:'2025-09-26',units:240},{date:'2025-09-27',units:180}]

export default function Dashboard(){
  const { values: { data, functions } } = useAuth();

  let myArr = ["Orange", "Pineapple", "Watermelon", "Mango", "Banana", "Coconut"];
  // myArr = myArr.slice(-2, myArr.length)
  myArr = myArr.slice(myArr.length-2)
  console.log(myArr);

  return (
    <>
      <div>Available SMS: Free: {data.phoneNumbersData.user_info.unit_1} Others: {data.phoneNumbersData.user_info.unit_2}</div>
      <div>Attention: This site is under construction. For any info or enquiry, please <Link to="/contact-us" className="text-blue-500 hover:underline">Contact Us</Link></div>
      <Link to="/" onClick={functions.logout} className="text-blue-500 hover:underline">Logout</Link>
      <Link to="/contacts" className="text-blue-500 hover:underline">Contacts</Link>
      <Link to="/profile" className="text-blue-500 hover:underline">Profile</Link>
      <ContactGrouping />
      <div className="bg-white rounded-xl p-6 shadow">
        <h3 className="font-semibold">Dashboard</h3>
        <div className="h-48 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={demo}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Line type="monotone" dataKey="units" stroke="#4f46e5"/></LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )
}
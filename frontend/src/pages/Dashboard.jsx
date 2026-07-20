import React, {useState} from 'react'
import { Link } from 'react-router-dom';
import { useAuth } from '../Contexts/auth.jsx';
import GetContacts from '../components/GetContacts/gc-file.jsx';
import ContactGrouping from '../components/ContactGroups/cg-file.jsx'
import ProfilePage from '../components/ProfilePage/pp-file';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'

const demo = [{date:'2025-09-25',units:120},{date:'2025-09-26',units:240},{date:'2025-09-27',units:180}]

export default function Dashboard(){
  const { values: { data, functions } } = useAuth();
  const [displayComp, setDisplayComp] = useState(0);

  /* let myArr = ["Orange", "Pineapple", "Watermelon", "Mango", "Banana", "Coconut"];
  // myArr = myArr.slice(-2, myArr.length)
  myArr = myArr.slice(myArr.length-2)
  console.log(myArr); */
      
  // const text = "Beautiful Day";
  /* const text = "MTNGH MTN-GH AirtelTigo Momo MobileMoney Vodafone VodafoneCash VodaCash VodaCashGhana VodafoneGhana VodafoneGhana.com Vodafone.com Vodafone.com.gh Vodafone.com.gh. Vodafone.com.gh/ AirtelTigoCash AirtelTigoCash.com AirtelTigoCash.com.gh AirtelTigoCash.com.gh/ AirtelTigoCash.com.gh. AirtelTigoCash.com.gh/";
  const regex = ["mtn", "mtngh", "mtn gh", "mtn-gh", "airteltigo", "airtel-tigo", "airtel tigo", "momo", "mobilemoney", "mobile money", "mobile-money", "vodafone", "vodafonecash", "vodafone cash", "vodafone-cash", "vodacash", "voda cash", "voda-cash", "vodacashghana", "vodafoneghana", "vodafoneghana.com", "vodafone.com", "vodafone.com.gh", "vodafone.com.gh.", "vodafone.com.gh/", "airteltigocash", "airteltigo-cash", "airteltigo cash", "airteltigocash.com", "airteltigocash.com.gh", "airteltigocash.com.gh/", "airteltigocash.com.gh.", "airteltigocash.com.gh/"];
  // const pattern = /beautiful/i;
  // console.log("Check pattern", pattern.test(text)); // true
  regex.map(each => {
    let pattern = new RegExp(each, "i");
    if(pattern.test(text)) console.log("Found a match for", each)
  }); */

  return (
    <>
      {/* {console.log("Are you the one I'm seeing?", data)} */}
      {!data.loading &&
      <>
        <div>Available SMS: Free: {data.phoneNumbersData.user_info.unit_1} Others: {data.phoneNumbersData.user_info.unit_2}</div>
        <div>Attention: This site is under construction. For any info or enquiry, please <Link to="/contact-us" className="text-blue-500 hover:underline">Contact Us</Link></div>
        <Link to="/" onClick={functions.logout} className="text-blue-500 hover:underline">Logout</Link>
        {/* <Link to="/contacts" className="text-blue-500 hover:underline">Contacts</Link>
        <Link to="/profile" className="text-blue-500 hover:underline">Profile</Link> */}
        <ul>
          <li><a href="#" onClick={() => setDisplayComp(0)}>Home</a></li>
          <li><a href="#" onClick={() => setDisplayComp(1)}>Profile Page</a></li>
          <li><a href="#" onClick={() => setDisplayComp(2)}>Manage Contacts</a></li>
          <li><a href="#" onClick={() => setDisplayComp(3)}>Manage Groups</a></li>
        </ul>
        {displayComp === 0 &&
        <div>
          <h3>Dashboard</h3>
          <div>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demo}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Line type="monotone" dataKey="units" stroke="#4f46e5"/></LineChart>
            </ResponsiveContainer>
          </div>
        </div>}
        {displayComp === 1 && <ProfilePage />}
        {displayComp === 2 && <GetContacts />}
        {displayComp === 3 && <ContactGrouping />}
      </>
      }
    </>
  )
}
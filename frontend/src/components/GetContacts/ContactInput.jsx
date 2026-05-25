import { useState } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

export default function ContactInput() {
    const [phone, setPhone] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!phone) {
      alert("Enter phone number");
      return;
    }

    console.log("Formatted Number:", phone);

    // Send to backend
    const response = await fetch("http://localhost:5000/auth/request-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone }),
    });

    const data = await response.json();

    console.log(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Verify Your Phone Number</h1>

        <PhoneInput international defaultCountry="GH" value={phone} onChange={setPhone} className="border p-3 rounded-lg" />

        <button type="submit" className="w-full bg-black text-white p-3 rounded-lg mt-4">Send OTP</button>
      </form>
    </div>
  );
}
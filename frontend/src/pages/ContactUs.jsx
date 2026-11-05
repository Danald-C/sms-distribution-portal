import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../Contexts/auth.jsx';

export default function ContactUsForm() {
    const {
        values: { data, functions },
    } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState(data.user.email || '');
    const [subject, setSubject] = useState('');
    const [company, setCompany] = useState('');
    const [message, setMessage] = useState('');
    const [alerts, setAlerts] = useState([]);
    const [sending, setSending] = useState(false);

    async function submitForm(e) {
        e.preventDefault();

        if (email.trim() === '' || message.trim() === '') {
            setAlerts([
                {
                    from: 1,
                    type: 'caution',
                    message: 'Please enter your email address and message.',
                },
            ]);
            return;
        }

        setSending(true);

        try {
            const response = await functions.authenticatedFetch(
                `${data.API_URL}/auth/contact-us`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name,
                        email,
                        subject,
                        company,
                        message,
                    }),
                }
            );

            const responseData = await response.json();

            if (responseData.Success) {
                setAlerts([
                    {
                        from: 1,
                        type: 'success',
                        message: 'Your message was submitted successfully.',
                    },
                ]);
            } else {
                setAlerts([
                    {
                        from: 1,
                        type: 'caution',
                        message:
                            responseData.message ||
                            'We could not submit your message. Please try again.',
                    },
                ]);
            }
        } catch (error) {
            console.error('Contact form submission failed:', error);
            setAlerts([
                {
                    from: 1,
                    type: 'caution',
                    message: 'Something went wrong. Please try again.',
                },
            ]);
        } finally {
            setSending(false);
        }
    }

    const inputClassName =
        'w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

    const labelClassName =
        'mb-2 block text-sm font-medium text-slate-700';

    return (
        <main className="min-h-screen bg-[#f3f8fd] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto w-full max-w-5xl">
                <Link
                    to="/dashboard"
                    className="mb-5 inline-flex items-center gap-2 rounded-lg text-sm font-medium text-blue-700 transition hover:text-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                    <span aria-hidden="true">←</span>
                    Back to dashboard
                </Link>

                <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
                    <div className="bg-[#0b4f8a] px-5 py-6 text-white sm:px-8 sm:py-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">
                            Support
                        </p>
                        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                            Contact us
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                            Have a question, need help with your SMS workspace or have any suggestions?
                            Send us a message and our team will get back to you.
                        </p>
                    </div>

                    <div className="p-5 sm:p-8">
                        {alerts.length > 0 && (
                            <div className="mb-6" role="status" aria-live="polite">
                                {functions.displayError(alerts)}
                            </div>
                        )}

                        <form onSubmit={submitForm} className="space-y-5">
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="contact-name" className={labelClassName}>
                                        Your name
                                        <span className="ml-1 font-normal text-slate-400">
                                            (optional)
                                        </span>
                                    </label>
                                    <input
                                        id="contact-name"
                                        type="text"
                                        autoComplete="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className={inputClassName}
                                        placeholder="Enter your name"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="contact-email" className={labelClassName}>
                                        Email address <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="contact-email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={inputClassName}
                                        placeholder="you@example.com"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="contact-subject" className={labelClassName}>
                                        Subject
                                        <span className="ml-1 font-normal text-slate-400">
                                            (optional)
                                        </span>
                                    </label>
                                    <input
                                        id="contact-subject"
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className={inputClassName}
                                        placeholder="What can we help with?"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="contact-company" className={labelClassName}>
                                        Company
                                        <span className="ml-1 font-normal text-slate-400">
                                            (optional)
                                        </span>
                                    </label>
                                    <input
                                        id="contact-company"
                                        type="text"
                                        autoComplete="organization"
                                        value={company}
                                        onChange={(e) => setCompany(e.target.value)}
                                        className={inputClassName}
                                        placeholder="Your company name"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="contact-message" className={labelClassName}>
                                    Message <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="contact-message"
                                    rows={6}
                                    required
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className={`${inputClassName} resize-y`}
                                    placeholder="Tell us how we can help..."
                                />
                            </div>

                            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs leading-5 text-slate-500">
                                    Fields marked with <span className="text-red-500">*</span> are required.
                                </p>

                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="inline-flex w-full items-center justify-center rounded-xl bg-[#0b4f8a] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#083f70] focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                >
                                    {sending ? 'Sending message…' : 'Send message'}
                                </button>
                            </div>
                        </form>
                    </div>
                </section>
            </div>
        </main>
    );
}
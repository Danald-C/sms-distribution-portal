import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard,
  UserCircle,
  Users,
  FolderTree,
  LogOut,
  MessageSquare,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Send,
  WalletCards,
} from 'lucide-react'
import { useAuth } from '../Contexts/auth.jsx'
import GetContacts from '../components/GetContacts/gc-file.jsx'
import ContactGrouping from '../components/ContactGroups/cg-file.jsx'
import ProfilePage from '../components/ProfilePage/pp-file'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'

const demo = [
  { date: '2025-09-25', units: 120 },
  { date: '2025-09-26', units: 240 },
  { date: '2025-09-27', units: 180 },
]

const navigation = [
  {
    id: 0,
    label: 'Dashboard',
    shortLabel: 'Home',
    icon: LayoutDashboard,
  },
  {
    id: 1,
    label: 'Profile',
    shortLabel: 'Profile',
    icon: UserCircle,
  },
  {
    id: 2,
    label: 'Contacts',
    shortLabel: 'Contacts',
    icon: Users,
  },
  {
    id: 3,
    label: 'Contact Groups',
    shortLabel: 'Groups',
    icon: FolderTree,
  },
]

export default function Dashboard() {
  const { values: { data, functions } } = useAuth()
  const [displayComp, setDisplayComp] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const selectComponent = (id) => {
    setDisplayComp(id)
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#f5f9fd] text-[#13243a]">
      {!data.loading && (
        <div className="min-h-screen">
          {/* Desktop sidebar */}
          <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[#0b4f8a] text-white shadow-[8px_0_30px_rgba(7,92,69,0.08)] lg:flex">
            <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                <MessageSquare size={20} strokeWidth={2.2} />
              </div>
              <div>
                <div className="text-base font-bold tracking-tight">DC SMS</div>
                <div className="text-[11px] text-white/60">Communication Portal</div>
              </div>
            </div>

            <div className="flex flex-1 flex-col px-3 py-6">
              <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                Workspace
              </div>

              <nav className="space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const active = displayComp === item.id

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectComponent(item.id)}
                      className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'bg-[#147fd1] text-white shadow-lg shadow-black/10'
                          : 'text-white/72 hover:bg-white/8 hover:text-white'
                      }`}
                    >
                      <Icon
                        size={18}
                        strokeWidth={active ? 2.3 : 1.9}
                        className={active ? 'text-white' : 'text-white/65'}
                      />
                      <span className="flex-1">{item.label}</span>
                      {active && <ChevronRight size={15} className="text-white/60" />}
                    </button>
                  )
                })}
              </nav>

              <div className="mt-auto space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/7 p-4">
                  <div className="mb-2 flex items-center gap-2 text-white/80">
                    <WalletCards size={16} />
                    <span className="text-xs font-semibold">SMS balance</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {data.phoneNumbersData?.user_info?.unit_1 ?? 0}
                  </div>
                  <div className="mt-1 text-[11px] text-white/50">
                    Free units available
                  </div>
                </div>

                <button
                  type="button"
                  onClick={functions.logout}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-white/65 transition-colors hover:bg-white/8 hover:text-white"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            </div>
          </aside>

          {/* Mobile header */}
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#d9e6f0] bg-white/95 px-4 backdrop-blur lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b4f8a] text-white">
                <MessageSquare size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-[#13243a]">DC SMS</div>
                <div className="text-[10px] text-[#627487]">Communication Portal</div>
              </div>
            </div>

            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d9e6f0] text-[#0b4f8a] transition-colors hover:bg-[#eaf5fc]"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </header>

          {/* Mobile navigation drawer */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-30 lg:hidden">
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileMenuOpen(false)}
                className="absolute inset-0 bg-[#092f52]/30"
              />

              <div className="absolute left-0 top-16 w-[min(88vw,320px)] rounded-br-3xl border-b border-r border-[#d9e6f0] bg-white p-3 shadow-2xl">
                <div className="mb-3 rounded-2xl bg-[#0b4f8a] p-4 text-white">
                  <div className="text-sm font-semibold">SMS Distribution Portal</div>
                  <div className="mt-1 text-xs text-white/65">
                    Manage your communication workspace
                  </div>
                </div>

                <nav className="space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon
                    const active = displayComp === item.id

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectComponent(item.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium ${
                          active
                            ? 'bg-[#eaf5fc] text-[#0b4f8a]'
                            : 'text-[#52677d] hover:bg-[#f3f8fc]'
                        }`}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </nav>

                <button
                  type="button"
                  onClick={functions.logout}
                  className="mt-3 flex w-full items-center gap-3 rounded-xl border-t border-[#e8efec] px-3.5 py-3 pt-4 text-sm font-medium text-[#627487]"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            </div>
          )}

          {/* Main content */}
          <main className="lg:pl-64">
            {/* Desktop top bar */}
            <div className="hidden h-20 items-center justify-between border-b border-[#d9e6f0] bg-white/90 px-8 backdrop-blur lg:flex xl:px-10">
              <div>
                <div className="text-xs font-medium text-[#8191a2]">Workspace</div>
                <div className="mt-0.5 text-sm font-semibold text-[#13243a]">
                  SMS Distribution Portal
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-full border border-[#d9e6f0] bg-[#f7fbfe] px-3 py-2 text-xs text-[#627487] xl:flex">
                  <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
                  Services online
                </div>

                <div className="flex items-center gap-2 rounded-full border border-[#d9e6f0] bg-white px-3 py-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eaf5fc] text-[#0b4f8a]">
                    <UserCircle size={17} />
                  </div>
                  <span className="text-xs font-semibold text-[#34485d]">Account</span>
                </div>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-7 md:px-8 lg:px-10 lg:py-9">
              {/* Page heading */}
              <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#c9e1ef] bg-[#eaf5fc] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.13em] text-[#0b68ad]">
                    <Sparkles size={12} />
                    Communication workspace
                  </div>

                  <h1 className="text-2xl font-bold tracking-tight text-[#13243a] sm:text-3xl lg:text-[34px]">
                    {displayComp === 0 && 'Dashboard'}
                    {displayComp === 1 && 'Profile'}
                    {displayComp === 2 && 'Contacts'}
                    {displayComp === 3 && 'Contact Groups'}
                  </h1>

                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#627487] sm:text-[15px]">
                    {displayComp === 0 && "Welcome back. Here's an overview of your SMS workspace."}
                    {displayComp === 1 && 'Manage your account information and communication preferences.'}
                    {displayComp === 2 && 'View and manage the contacts available for your messages.'}
                    {displayComp === 3 && 'Organize contacts into groups for easier messaging.'}
                  </p>
                </div>

                {displayComp === 0 && (
                  <Link
                    to="/contact-us"
                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#c9e1ef] bg-white px-4 py-2.5 text-xs font-semibold text-[#0b4f8a] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#9fcce4] hover:shadow-md"
                  >
                    Need help?
                    <ChevronRight size={15} />
                  </Link>
                )}
              </div>

              {/* Dashboard */}
              {displayComp === 0 && (
                <div className="space-y-5 sm:space-y-6">
                  {/* Balance / quick action cards */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-2xl border border-[#d9e6f0] bg-white p-5 shadow-[0_8px_30px_rgba(16,70,55,0.05)]">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium text-[#748598]">Free SMS units</p>
                          <p className="mt-2 text-2xl font-bold tracking-tight text-[#13243a]">
                            {data.phoneNumbersData?.user_info?.unit_1 ?? 0}
                          </p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf5fc] text-[#0b75c2]">
                          <MessageSquare size={19} />
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-[#748598]">
                        Available for your SMS activity
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#d9e6f0] bg-white p-5 shadow-[0_8px_30px_rgba(16,70,55,0.05)]">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium text-[#748598]">Other SMS units</p>
                          <p className="mt-2 text-2xl font-bold tracking-tight text-[#13243a]">
                            {data.phoneNumbersData?.user_info?.unit_2 ?? 0}
                          </p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef7fc] text-[#0b4f8a]">
                          <Send size={18} />
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-[#748598]">
                        Additional available units
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#d9e6f0] bg-[#0b4f8a] p-5 text-white shadow-[0_8px_30px_rgba(7,92,69,0.16)] sm:col-span-2 xl:col-span-1">
                      <p className="text-xs font-medium text-white/60">Workspace status</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#39b86b]" />
                        <span className="text-lg font-bold">Ready to communicate</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-white/65">
                        Your messaging workspace is available for managing contacts and SMS activity.
                      </p>
                    </div>
                  </div>

                  {/* Existing chart — data and chart behavior preserved */}
                  <section className="rounded-2xl border border-[#d9e6f0] bg-white p-4 shadow-[0_8px_30px_rgba(16,70,55,0.05)] sm:p-6">
                    <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h2 className="text-base font-bold text-[#13243a] sm:text-lg">
                          SMS Activity
                        </h2>
                        <p className="mt-1 text-xs text-[#748598]">
                          Recent message-unit activity
                        </p>
                      </div>

                      <div className="text-xs font-medium text-[#147fd1]">
                        Activity overview
                      </div>
                    </div>

                    <div className="h-[260px] w-full sm:h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={demo}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e1ebf3" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: '#748598' }}
                            axisLine={{ stroke: '#d9e6f0' }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#748598' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              border: '1px solid #d9e6f0',
                              borderRadius: '12px',
                              boxShadow: '0 8px 24px rgba(16,70,55,0.10)',
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="units"
                            stroke="#147fd1"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: '#147fd1', strokeWidth: 0 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  {/* Existing notice, retained as functionality/content */}
                  <div className="rounded-2xl border border-[#c9e1ef] bg-[#eaf5fc] p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#0b4f8a]">
                          Need information or assistance?
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#536a80]">
                          This portal is under active development. Contact us if you have any enquiry.
                        </p>
                      </div>
                      <Link
                        to="/contact-us"
                        className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-[#0b4f8a] px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#083d6b]"
                      >
                        Contact Us
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Existing functional child components — unchanged */}
              {displayComp === 1 && <ProfilePage />}
              {displayComp === 2 && <GetContacts />}
              {displayComp === 3 && <ContactGrouping />}
            </div>
          </main>

          {/* Mobile bottom navigation */}
          <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[#d9e6f0] bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
            <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const active = displayComp === item.id

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectComponent(item.id)}
                    className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition-colors ${
                      active
                        ? 'bg-[#eaf5fc] text-[#0b4f8a]'
                        : 'text-[#748598]'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.shortLabel}</span>
                  </button>
                )
              })}
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}

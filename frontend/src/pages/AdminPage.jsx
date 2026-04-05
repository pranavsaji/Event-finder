import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { UserPlus, Trash2, Shield, Mail, Lock, User, ArrowLeft } from 'lucide-react'

export default function AdminPage({ onBack }) {
  const { user, adminListUsers, adminAddUser, adminDeleteUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ email: '', password: '', displayName: '' })
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await adminListUsers()
      setUsers(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setAdding(true)
    try {
      await adminAddUser(form.email, form.password, form.displayName)
      setForm({ email: '', password: '', displayName: '' })
      setSuccess(`User ${form.email} added successfully.`)
      await loadUsers()
    } catch (e) {
      setError(e.message)
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete ${u.email}?`)) return
    setError('')
    try {
      await adminDeleteUser(u.id)
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-orange-400" />
              <h1 className="text-xl font-bold">Admin Portal</h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Manage platform users</p>
          </div>
        </div>

        {/* Add user form */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300">Add New User</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={set('email')}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-all"
                />
              </div>
              <div className="relative">
                <User size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Display name (optional)"
                  value={form.displayName}
                  onChange={set('displayName')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>
            <div className="relative">
              <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Temporary password (min 8 chars)"
                value={form.password}
                onChange={set('password')}
                required
                minLength={8}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-all"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">{success}</p>
            )}

            <button
              type="submit"
              disabled={adding}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-md shadow-orange-500/20 active:scale-95"
            >
              {adding ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><UserPlus size={14} /> Add User</>
              )}
            </button>
          </form>
        </div>

        {/* User list */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-sm font-semibold text-slate-300">
              All Users <span className="text-slate-500 font-normal">({users.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-white/10 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-12">No users yet.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {users.map((u) => (
                <li key={u.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-white/[0.02] transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{u.display_name || u.email}</p>
                      {u.is_admin && (
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full px-2 py-0.5 shrink-0">
                          admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>
                  {u.id !== user?.id && (
                    <button
                      onClick={() => handleDelete(u)}
                      className="ml-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
                      title="Delete user"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

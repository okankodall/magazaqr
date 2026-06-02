'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  function handleLogin() {
    if (username === 'okankodall' && password === 'Okan.kodal1') {
      localStorage.setItem('auth', 'true')
      router.push('/dashboard')
    } else {
      setError('Kullanici adi veya sifre yanlis!')
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <svg width="160" height="40" viewBox="0 0 145 38" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
            <rect width="145" height="38" fill="black"/>
            <text x="72" y="26" textAnchor="middle" fill="white" fontSize="17" fontFamily="Georgia, serif" fontWeight="bold" letterSpacing="7">SEPHORA</text>
          </svg>
          <p className="text-[#555] text-xs tracking-[4px] uppercase mt-2">Nisantasi Admin</p>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs text-[#555] uppercase tracking-wider mb-2 block">Kullanici Adi</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="kullanici adi"
              className="w-full bg-black border border-[#333] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-white transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-[#555] uppercase tracking-wider mb-2 block">Sifre</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full bg-black border border-[#333] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-white transition-colors"
            />
          </div>
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full py-3 rounded-xl font-bold text-black text-sm bg-white hover:bg-[#ddd] transition-colors mt-2"
          >
            Giris Yap
          </button>
        </div>
        <p className="text-center text-[#333] text-[10px] tracking-widest mt-6">DESIGNED BY OKAN KODAL</p>
      </div>
    </div>
  )
}

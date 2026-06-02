'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { STAFF as DEFAULT_STAFF } from '@/lib/staff'
import QRCode from 'qrcode'

type StaffMember = { id: string; name: string; emoji: string; color: string }
type DayStats = { date: string; counts: Record<string, number> }

const EMOJIS = ['🌟','💎','🔥','⚡','🎯','🌸','🦋','🏆','💫','🎪']

const SephoraLogo = ({ size = 28 }: { size?: number }) => (
  <svg width={size * 3.8} height={size} viewBox="0 0 145 38" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="145" height="38" fill="black"/>
    <text x="72" y="26" textAnchor="middle" fill="white" fontSize="17" fontFamily="Georgia, serif" fontWeight="bold" letterSpacing="7">SEPHORA</text>
  </svg>
)

function getTodayTurkey() {
  const now = new Date()
  const turkeyTime = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  return turkeyTime.toISOString().split('T')[0]
}

function formatDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}`
}

export default function Dashboard() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [todayCounts, setTodayCounts] = useState<Record<string, number>>({})
  const [dayStats, setDayStats] = useState<DayStats[]>([])
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<'bugun' | 'gecmis' | 'qr' | 'ekle'>('bugun')
  const [loading, setLoading] = useState(true)
  const [baseUrl, setBaseUrl] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🌟')
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (localStorage.getItem('auth') !== 'true') {
      window.location.href = '/login'
      return
    }
    setBaseUrl(window.location.origin)
    loadAll()
    const interval = setInterval(loadCounts, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!baseUrl || staff.length === 0) return
    generateQRCodes(staff)
  }, [baseUrl, staff])

  async function loadAll() {
    await loadStaff()
    await loadCounts()
    setLoading(false)
  }

  async function loadStaff() {
    const { data } = await supabase.from('staff').select('*').order('created_at', { ascending: true })
    if (data && data.length > 0) {
      setStaff(data)
    } else {
      for (const s of DEFAULT_STAFF) {
        await supabase.from('staff').upsert({ id: s.id, name: s.name, emoji: s.emoji, color: s.color })
      }
      setStaff(DEFAULT_STAFF)
    }
  }

  async function loadCounts() {
    const today = getTodayTurkey()
    const { data } = await supabase.from('clicks').select('staff_id, date')
    if (!data) return
    const tc: Record<string, number> = {}
    data.filter((r: { staff_id: string; date: string }) => r.date === today).forEach((r: { staff_id: string; date: string }) => {
      tc[r.staff_id] = (tc[r.staff_id] || 0) + 1
    })
    setTodayCounts(tc)
    const byDate: Record<string, Record<string, number>> = {}
    data.forEach((r: { staff_id: string; date: string }) => {
      if (!r.date) return
      if (!byDate[r.date]) byDate[r.date] = {}
      byDate[r.date][r.staff_id] = (byDate[r.date][r.staff_id] || 0) + 1
    })
    const stats = Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, counts]) => ({ date, counts }))
    setDayStats(stats)
  }

  async function generateQRCodes(staffList: StaffMember[]) {
    const urls: Record<string, string> = {}
    for (const s of staffList) {
      const url = `${baseUrl}/r/${s.id}`
      const qrDataUrl = await QRCode.toDataURL(url, { width: 360, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      const canvas = document.createElement('canvas')
      const W = 400, H = 520
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, 60)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 22px Georgia, serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('SEPHORA', W / 2, 30)
      ctx.fillStyle = '#aaaaaa'; ctx.font = '10px Arial'
      ctx.fillText('NISANTASI', W / 2, 50)
      ctx.fillStyle = '#000000'; ctx.font = 'bold 20px Arial'
      ctx.fillText(s.name, W / 2, 90)
      const img = new Image()
      await new Promise<void>(resolve => {
        img.onload = () => { ctx.drawImage(img, 20, 105, 360, 360); resolve() }
        img.src = qrDataUrl
      })
      const cx = W / 2, cy = 285
      const bw = s.name.length * 13 + 28, bh = 36
      ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - bw/2, cy - bh/2, bw, bh)
      ctx.strokeStyle = '#000000'; ctx.lineWidth = 2
      ctx.strokeRect(cx - bw/2, cy - bh/2, bw, bh)
      ctx.fillStyle = '#000000'; ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(s.name, cx, cy)
      ctx.fillStyle = '#000000'; ctx.fillRect(0, 468, W, 52)
      ctx.fillStyle = '#ffffff'; ctx.font = '11px Arial'
      ctx.fillText('Google yorum icin tara', W / 2, 484)
      ctx.fillStyle = '#aaaaaa'; ctx.font = 'bold 10px Arial'
      ctx.fillText('NISANTASI SEPHORA', W / 2, 502)
      urls[s.id] = canvas.toDataURL('image/png')
    }
    setQrUrls(urls)
  }

  async function addStaff() {
    if (!newName.trim()) return
    const id = newName.toLowerCase()
      .replace(/\u011f/g,'g').replace(/\u00fc/g,'u').replace(/\u015f/g,'s')
      .replace(/\u0131/g,'i').replace(/\u00f6/g,'o').replace(/\u00e7/g,'c')
      .replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')
    if (staff.find(s => s.id === id)) { showToast('Bu isim zaten var!'); return }
    const m = { id, name: newName.trim(), emoji: newEmoji, color: '#ffffff' }
    await supabase.from('staff').insert(m)
    setStaff([...staff, m])
    setNewName('')
    setTab('bugun')
    showToast(newName + ' eklendi!')
  }

  async function removeStaff(id: string) {
    if (!confirm('Silmek istediginize emin misiniz?')) return
    await supabase.from('staff').delete().eq('id', id)
    setStaff(staff.filter(s => s.id !== id))
  }

  function downloadQR(staffId: string, name: string) {
    const a = document.createElement('a')
    a.href = qrUrls[staffId]
    a.download = 'QR_' + name + '_Sephora.png'
    a.click()
  }

  function logout() {
    localStorage.removeItem('auth')
    window.location.href = '/login'
  }

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 2500)
  }

  const todayTotal = Object.values(todayCounts).reduce((a, b) => a + b, 0)
  const sortedToday = [...staff].sort((a, b) => (todayCounts[b.id] || 0) - (todayCounts[a.id] || 0))

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <SephoraLogo size={32} />
      <p className="text-white tracking-widest text-xs mt-2">YUKLENIYOR...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <div className="bg-black border-b border-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <SephoraLogo size={28} />
            <div className="border-l border-[#333] pl-4">
              <p className="text-[#888] text-[10px] tracking-[4px] uppercase">Nisantasi</p>
              <p className="text-white text-sm font-bold tracking-widest">YORUM TAKIP SISTEMI</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg px-4 py-2 text-center">
              <div className="text-2xl font-bold text-black">{todayTotal}</div>
              <div className="text-[9px] text-black/60 tracking-[2px] uppercase">Bugun</div>
            </div>
            <button onClick={logout} className="text-[#555] hover:text-white text-xs border border-[#333] hover:border-white rounded-lg px-3 py-2 transition-colors">
              Cikis
            </button>
          </div>
        </div>
      </div>

      <div className="bg-black border-b border-[#222]">
        <div className="max-w-5xl mx-auto flex overflow-x-auto">
          {[
            { id: 'bugun', label: 'Bugun' },
            { id: 'gecmis', label: 'Gecmis' },
            { id: 'qr', label: 'QR Kodlar' },
            { id: 'ekle', label: 'Kisi Ekle' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`px-5 py-3 text-sm font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${
                tab === t.id ? 'border-white text-white' : 'border-transparent text-[#555] hover:text-white'
              }`}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-6">

        {tab === 'bugun' && (
          <div className="space-y-3">
            <p className="text-[#555] text-xs tracking-widest uppercase mb-4">{formatDate(getTodayTurkey())} — Bugunun Siralamas</p>
            {sortedToday.map((s, i) => {
              const count = todayCounts[s.id] || 0
              const pct = todayTotal > 0 ? (count / todayTotal) * 100 : 0
              const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣']
              return (
                <div key={s.id} className="rounded-xl p-5 flex items-center gap-4 border border-[#222] hover:border-white transition-colors bg-[#111]">
                  <div className="text-2xl w-8 text-center">{medals[i] || s.emoji}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-base">{s.name}</span>
                      <span className="text-2xl font-bold text-white">{count}</span>
                    </div>
                    <div className="bg-[#222] rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700 bg-white" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-[#555] mt-1">%{pct.toFixed(1)} pay</p>
                  </div>
                  <button onClick={() => removeStaff(s.id)} className="text-[#444] hover:text-white text-lg transition-colors ml-2">x</button>
                </div>
              )
            })}
            <div className="mt-4 p-4 bg-[#111] border border-[#222] rounded-xl text-xs text-[#555]">
              Her gun saat 00:00 Turkiye saatinde sayaclar sifirlanir.
            </div>
            <p className="text-center text-[#333] text-[10px] tracking-widest mt-8">DESIGNED BY OKAN KODAL</p>
          </div>
        )}

        {tab === 'gecmis' && (
          <div className="space-y-4">
            <p className="text-[#555] text-xs tracking-widest uppercase mb-4">Gunluk Gecmis Istatistikler</p>
            {dayStats.length === 0 && <div className="text-center text-[#444] py-16">Henuz veri yok</div>}
            {dayStats.map(({ date, counts }) => {
              const dayTotal = Object.values(counts).reduce((a, b) => a + b, 0)
              const isToday = date === getTodayTurkey()
              return (
                <div key={date} className={`rounded-xl border ${isToday ? 'border-white' : 'border-[#222]'} bg-[#111] overflow-hidden`}>
                  <div className={`px-5 py-3 flex justify-between items-center ${isToday ? 'bg-white' : 'bg-[#1a1a1a]'}`}>
                    <span className={`font-bold text-sm ${isToday ? 'text-black' : 'text-white'}`}>{formatDate(date)}{isToday ? ' — Bugun' : ''}</span>
                    <span className={`font-bold text-lg ${isToday ? 'text-black' : 'text-white'}`}>{dayTotal} toplam</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {[...staff].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0)).map(s => {
                      const c = counts[s.id] || 0
                      const pct = dayTotal > 0 ? (c / dayTotal) * 100 : 0
                      return (
                        <div key={s.id} className="flex items-center gap-3">
                          <span className="text-[#888] text-sm w-24 truncate">{s.name}</span>
                          <div className="flex-1 bg-[#222] rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-white font-bold text-sm w-6 text-right">{c}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'qr' && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {staff.map(s => (
              <div key={s.id} className="bg-white rounded-xl overflow-hidden border-2 border-black shadow-lg">
                <div className="bg-black px-3 py-2 text-center">
                  <p className="text-white text-[10px] tracking-[4px] font-bold">SEPHORA</p>
                </div>
                <div className="p-3 text-center">
                  <p className="text-black font-bold text-sm mb-2">{s.name}</p>
                  {qrUrls[s.id] ? (
                    <img src={qrUrls[s.id]} alt={'QR ' + s.name} className="w-full rounded mb-2" />
                  ) : (
                    <div className="w-full aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center text-gray-300 text-xs">Yukleniyor...</div>
                  )}
                  <button onClick={() => downloadQR(s.id, s.name)} className="w-full text-white text-xs font-bold py-2 rounded mb-2 bg-black hover:bg-[#333] transition-colors">Indir</button>
                  <div className="rounded py-1.5 text-sm font-bold bg-black text-white">{todayCounts[s.id] || 0} bugun</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'ekle' && (
          <div className="max-w-md">
            <div className="bg-[#111] border border-[#222] rounded-2xl p-6 space-y-5">
              <h2 className="text-white font-bold text-lg">Yeni Calisan Ekle</h2>
              <div>
                <label className="text-xs text-[#555] uppercase tracking-wider mb-2 block">Isim</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addStaff()}
                  placeholder="Calisan adi..."
                  className="w-full bg-black border border-[#333] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-white transition-colors" />
              </div>
              <div>
                <label className="text-xs text-[#555] uppercase tracking-wider mb-2 block">Emoji</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => setNewEmoji(e)}
                      className={`text-xl w-10 h-10 rounded-lg transition-all ${newEmoji === e ? 'bg-white/20 ring-2 ring-white' : 'bg-black border border-[#333]'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              {newName && (
                <div className="rounded-xl p-4 flex items-center gap-3 bg-black border border-[#333]">
                  <span className="text-2xl">{newEmoji}</span>
                  <span className="font-bold text-white">{newName}</span>
                </div>
              )}
              <button onClick={addStaff} className="w-full py-3 rounded-xl font-bold text-black text-sm bg-white hover:bg-[#ddd] transition-colors">
                Ekle ve QR Olustur
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full font-bold text-sm shadow-xl z-50">{toast}</div>
      )}
    </div>
  )
}

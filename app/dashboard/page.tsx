'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { STAFF as DEFAULT_STAFF } from '@/lib/staff'
import QRCode from 'qrcode'

type StaffMember = { id: string; name: string; emoji: string; color: string }

const COLORS = ['#E8175D','#ffffff','#1a1a1a','#C9A96E','#E8A0BF','#7EB8C9','#A0C98B','#9E7EB8']
const EMOJIS = ['🌟','💎','🔥','⚡','🎯','🌸','🦋','🏆','💫','🎪']

// Sephora SVG Logo (simplified wordmark style)
const SephoraLogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size * 3.5} height={size} viewBox="0 0 140 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="140" height="40" fill="black"/>
    <text x="70" y="27" textAnchor="middle" fill="white" fontSize="18" fontFamily="Georgia, serif" fontWeight="bold" letterSpacing="6">SEPHORA</text>
  </svg>
)

export default function Dashboard() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<'dashboard' | 'qr' | 'ekle'>('dashboard')
  const [loading, setLoading] = useState(true)
  const [baseUrl, setBaseUrl] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🌟')
  const [newColor, setNewColor] = useState('#E8175D')
  const [toast, setToast] = useState('')

  useEffect(() => {
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
    const { data } = await supabase.from('clicks').select('staff_id')
    if (data) {
      const c: Record<string, number> = {}
      data.forEach((row: { staff_id: string }) => { c[row.staff_id] = (c[row.staff_id] || 0) + 1 })
      setCounts(c)
    }
  }

  async function generateQRCodes(staffList: StaffMember[]) {
    const urls: Record<string, string> = {}
    for (const s of staffList) {
      const url = `${baseUrl}/r/${s.id}`
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 360, margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      })

      const canvas = document.createElement('canvas')
      const W = 400, H = 520
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!

      // White background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, W, H)

      // Top black header bar
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, W, 60)

      // SEPHORA text in header
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 22px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.letterSpacing = '8px'
      ctx.fillText('SEPHORA', W / 2, 38)

      // Red accent line
      ctx.fillStyle = '#E8175D'
      ctx.fillRect(0, 60, W, 4)

      // Staff name below header
      ctx.fillStyle = '#1a1a1a'
      ctx.font = 'bold 20px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(s.name, W / 2, 90)

      // QR code image
      const img = new Image()
      await new Promise<void>(resolve => {
        img.onload = () => { ctx.drawImage(img, 20, 100, 360, 360); resolve() }
        img.src = qrDataUrl
      })

      // Name overlay in CENTER of QR
      const cx = W / 2, cy = 280
      const bw = s.name.length * 12 + 24, bh = 34
      // White rounded box
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(cx - bw/2, cy - bh/2, bw, bh, 6)
      ctx.fill()
      // Red border
      ctx.strokeStyle = '#E8175D'
      ctx.lineWidth = 2
      ctx.stroke()
      // Name text
      ctx.fillStyle = '#000000'
      ctx.font = 'bold 16px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(s.name, cx, cy)

      // Bottom black bar
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 464, W, 56)

      // Bottom red accent
      ctx.fillStyle = '#E8175D'
      ctx.fillRect(0, 460, W, 4)

      // Bottom text
      ctx.fillStyle = '#ffffff'
      ctx.font = '11px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Google\'da yorum bırakmak için tara', W / 2, 482)
      ctx.fillStyle = '#E8175D'
      ctx.font = 'bold 11px Arial, sans-serif'
      ctx.fillText('Nişantaşı Sephora', W / 2, 500)

      urls[s.id] = canvas.toDataURL('image/png')
    }
    setQrUrls(urls)
  }

  async function addStaff() {
    if (!newName.trim()) return
    const id = newName.toLowerCase()
      .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
      .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
      .replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')
    if (staff.find(s => s.id === id)) { showToast('Bu isim zaten var!'); return }
    const m = { id, name: newName.trim(), emoji: newEmoji, color: newColor }
    await supabase.from('staff').insert(m)
    const updated = [...staff, m]
    setStaff(updated)
    setNewName('')
    setTab('dashboard')
    showToast(`${newName} eklendi! ✓`)
  }

  async function removeStaff(id: string) {
    if (!confirm('Bu çalışanı silmek istediğine emin misin?')) return
    await supabase.from('staff').delete().eq('id', id)
    setStaff(staff.filter(s => s.id !== id))
  }

  function downloadQR(staffId: string, name: string) {
    const a = document.createElement('a')
    a.href = qrUrls[staffId]
    a.download = `QR_${name}_Sephora_Nisantasi.png`
    a.click()
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const sorted = [...staff].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <SephoraLogo size={36} />
      <p className="text-white tracking-widest text-xs mt-2">YÜKLENİYOR...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-16">

      {/* Header */}
      <div className="bg-black border-b-4 border-[#E8175D] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <SephoraLogo size={28} />
            <div className="border-l border-[#333] pl-4">
              <p className="text-[#E8175D] text-[10px] tracking-[4px] uppercase">Nişantaşı</p>
              <p className="text-white text-sm font-bold tracking-widest">YORUM TAKİP SİSTEMİ</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-[#E8175D] rounded-lg px-4 py-2 text-center">
              <div className="text-2xl font-bold text-white">{total}</div>
              <div className="text-[9px] text-white/70 tracking-[2px] uppercase">Toplam</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-black border-b border-[#222]">
        <div className="max-w-5xl mx-auto flex">
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'qr', label: '📱 QR Kodlar' },
            { id: 'ekle', label: '➕ Kişi Ekle' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`px-6 py-3 text-sm font-bold tracking-wide transition-all border-b-2 ${
                tab === t.id
                  ? 'border-[#E8175D] text-white'
                  : 'border-transparent text-[#666] hover:text-white'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-6">

        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <div className="space-y-3">
            {sorted.map((s, i) => {
              const count = counts[s.id] || 0
              const pct = total > 0 ? (count / total) * 100 : 0
              const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']
              return (
                <div key={s.id} className="rounded-xl p-5 flex items-center gap-4 border border-[#222] hover:border-[#E8175D44] transition-colors"
                  style={{ background: '#111' }}>
                  <div className="text-2xl w-8 text-center">{medals[i] || '⭐'}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-base text-white">{s.name}</span>
                      <span className="text-2xl font-bold text-[#E8175D]">{count}</span>
                    </div>
                    <div className="bg-[#222] rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700 bg-[#E8175D]"
                        style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-[#555] mt-1">%{pct.toFixed(1)} pay</p>
                  </div>
                  <button onClick={() => removeStaff(s.id)}
                    className="text-[#333] hover:text-red-500 text-lg transition-colors ml-2" title="Sil">✕</button>
                </div>
              )
            })}
            <div className="mt-6 p-4 bg-[#111] border border-[#222] rounded-xl text-xs text-[#555] leading-relaxed">
              💡 <span className="text-[#888]">Otomatik takip aktif.</span> Müşteri QR'ı okutunca sayaç otomatik artar. Her 30 saniyede güncellenir.
            </div>
            <p className="text-center text-[#333] text-[10px] tracking-widest mt-8">DESIGNED BY OKAN KODAL</p>
          </div>
        )}

        {/* QR CODES */}
        {tab === 'qr' && (
          <div>
            <div className="text-xs text-[#666] mb-4 bg-[#111] border border-[#222] rounded-lg px-4 py-3">
              📱 Her QR kodda çalışan ismi yazıyor. İndir → yazdır → masaya koy.
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {staff.map(s => (
                <div key={s.id} className="bg-white rounded-xl overflow-hidden border-2 border-black shadow-lg">
                  {/* Mini header */}
                  <div className="bg-black px-3 py-2 text-center">
                    <p className="text-white text-[10px] tracking-[4px] font-bold">SEPHORA</p>
                  </div>
                  <div className="h-0.5 bg-[#E8175D]" />
                  <div className="p-3 text-center">
                    <p className="text-black font-bold text-sm mb-2">{s.name}</p>
                    {qrUrls[s.id] ? (
                      <img src={qrUrls[s.id]} alt={`QR ${s.name}`} className="w-full rounded mb-2" />
                    ) : (
                      <div className="w-full aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center text-gray-300 text-xs">Yükleniyor...</div>
                    )}
                    <button onClick={() => downloadQR(s.id, s.name)}
                      className="w-full text-white text-xs font-bold py-2 rounded mb-2 bg-black hover:bg-[#E8175D] transition-colors">
                      ⬇️ İndir
                    </button>
                    <div className="rounded py-1.5 text-sm font-bold bg-[#E8175D] text-white">
                      {counts[s.id] || 0} tıklama
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* YENİ KİŞİ EKLE */}
        {tab === 'ekle' && (
          <div className="max-w-md">
            <div className="bg-[#111] border border-[#222] rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-6 bg-[#E8175D] rounded" />
                <h2 className="text-white font-bold text-lg">Yeni Çalışan Ekle</h2>
              </div>
              <div>
                <label className="text-xs text-[#666] uppercase tracking-wider mb-2 block">İsim</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addStaff()}
                  placeholder="Çalışan adı..."
                  className="w-full bg-black border border-[#333] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-[#E8175D] transition-colors" />
              </div>
              <div>
                <label className="text-xs text-[#666] uppercase tracking-wider mb-2 block">Emoji</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => setNewEmoji(e)}
                      className={`text-xl w-10 h-10 rounded-lg transition-all ${newEmoji === e ? 'bg-[#E8175D22] ring-2 ring-[#E8175D]' : 'bg-black border border-[#333]'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[#666] uppercase tracking-wider mb-2 block">Renk</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setNewColor(c)}
                      className={`w-9 h-9 rounded-full border-2 transition-all ${newColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              {newName && (
                <div className="rounded-xl p-4 flex items-center gap-3 bg-black border border-[#E8175D44]">
                  <span className="text-2xl">{newEmoji}</span>
                  <span className="font-bold text-white">{newName}</span>
                  <span className="ml-auto text-[10px] text-[#E8175D] tracking-widest">ÖNİZLEME</span>
                </div>
              )}
              <button onClick={addStaff}
                className="w-full py-3 rounded-xl font-bold text-white text-sm bg-[#E8175D] hover:bg-[#c01048] transition-colors">
                ✅ Ekle ve QR Oluştur
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#E8175D] text-white px-6 py-3 rounded-full font-bold text-sm shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  )
}

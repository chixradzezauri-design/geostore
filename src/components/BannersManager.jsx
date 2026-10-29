// src/components/BannersManager.jsx - 100% Full Code with Supabase Banners Sync
import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, Image as ImageIcon, Sparkles } from 'lucide-react';

const SUPABASE_URL = "https://xmtnszxtnfxnrojionoa.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdG5zenh0bmZ4bnJvamlvbm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MzQ0NDksImV4cCI6MjEwODMxMDQ0OX0.RtYgfVKkzW2KHNR6r9snMhTKIm16kyyDLJXr5BoVAJM"; 

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

export default function BannersManager() {
  const [banners, setBanners] = useState([]);
  const [bannerForm, setBannerForm] = useState({ title: '', subtitle: '', image: '', link: '' });
  const [loading, setLoading] = useState(false);

  // 🔄 ბანერების წამოღება Supabase ბაზიდან
  const fetchBanners = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/banners?select=*&order=created_at.desc`, { headers });
      if (res.ok) {
        const data = await res.json();
        setBanners(data.map(b => ({
          id: b.id,
          title: b.title,
          subtitle: b.subtitle,
          image: b.image,
          link: b.link
        })));
      }
    } catch {}
  };

  useEffect(() => {
    fetchBanners();
    const interval = setInterval(fetchBanners, 5000);
    return () => clearInterval(interval);
  }, []);

  // 💾 ახალი ბანერის შენახვა Supabase ბაზაში
  const handleAddBanner = async (e) => {
    e.preventDefault();
    if (!bannerForm.title) return;

    setLoading(true);
    const newBannerPayload = {
      title: bannerForm.title.trim(),
      subtitle: bannerForm.subtitle.trim(),
      image: bannerForm.image.trim() || 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&q=80&w=1200',
      link: bannerForm.link.trim()
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/banners`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newBannerPayload)
      });

      if (res.ok) {
        setBannerForm({ title: '', subtitle: '', image: '', link: '' });
        fetchBanners();
        alert('✅ სარეკლამო ბანერი წარმატებით შეინახა ბაზაში!');
      } else {
        const err = await res.text();
        alert('შეცდომა ბანერის შენახვისას: ' + err);
      }
    } catch {
      alert('ქსელის შეცდომა სერვერთან მიერთებისას');
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ ბანერის წაშლა Supabase ბაზიდან
  const handleDeleteBanner = async (id) => {
    if (window.confirm('ნამდვილად გსურთ ამ ბანერის წაშლა?')) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/banners?id=eq.${id}`, {
          method: 'DELETE',
          headers
        });

        if (res.ok) {
          setBanners(prev => prev.filter(b => b.id !== id));
          alert('✅ ბანერი წარმატებით წაიშალა ბაზიდან!');
        } else {
          alert('შეცდომა ბაზიდან წაშლისას');
        }
      } catch {
        alert('ქსელის შეცდომა');
      }
    }
  };

  return (
    <div className="space-y-6 w-full text-xs">
      <div className="bg-[#0d0d10] border border-emerald-500/30 p-6 sm:p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
        <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
          <Megaphone className="w-5 h-5 text-emerald-400" /> ბანერების დინამიური მართვა (Supabase Sync)
        </h3>
        
        <form onSubmit={handleAddBanner} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <input 
              type="text" 
              placeholder="სათაური (მაგ: ზაფხულის დიდი ფასდაკლება!)" 
              required 
              value={bannerForm.title} 
              onChange={e => setBannerForm({...bannerForm, title: e.target.value})} 
              className="bg-[#08080a] border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" 
            />
            <input 
              type="text" 
              placeholder="ქვესათაური / აღწერა" 
              value={bannerForm.subtitle} 
              onChange={e => setBannerForm({...bannerForm, subtitle: e.target.value})} 
              className="bg-[#08080a] border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <input 
              type="text" 
              placeholder="ბანერის ფოტოს URL (სურვილისამებრ)" 
              value={bannerForm.image} 
              onChange={e => setBannerForm({...bannerForm, image: e.target.value})} 
              className="bg-[#08080a] border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" 
            />
            <input 
              type="text" 
              placeholder="ბმული / ლინკი (სურვილისამებრ)" 
              value={bannerForm.link} 
              onChange={e => setBannerForm({...bannerForm, link: e.target.value})} 
              className="bg-[#08080a] border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> {loading ? 'იგზავნება...' : 'ბანერის ბაზაში შენახვა 🚀'}
          </button>
        </form>
      </div>

      <div className="bg-[#0d0d10] border border-emerald-500/30 p-6 sm:p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
        <h3 className="font-black text-white text-base">ბაზაში არსებული აქტიური ბანერები ({banners.length})</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {banners.length === 0 ? (
            <p className="text-slate-500 text-xs py-6 text-center col-span-full">აქტიური ბანერები არ მოიძებნა.</p>
          ) : (
            banners.map(b => (
              <div key={b.id} className="bg-[#08080a] p-4 rounded-3xl border border-emerald-500/20 flex justify-between items-center text-xs gap-3 shadow-inner">
                <div className="flex items-center gap-3.5">
                  <img src={b.image} alt="" className="w-16 h-12 object-cover rounded-2xl border border-emerald-500/20 shrink-0" />
                  <div>
                    <h4 className="font-black text-white text-sm">{b.title}</h4>
                    <p className="text-slate-400 text-[11px] mt-0.5">{b.subtitle}</p>
                  </div>
                </div>
                <button onClick={() => handleDeleteBanner(b.id)} className="text-rose-400 hover:text-rose-300 p-2.5 bg-rose-500/10 rounded-2xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

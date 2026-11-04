import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ImagePlus, Search, RefreshCw, Copy, Trash2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const BUCKET = 'storefront-media';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function StorefrontMediaLibrary() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState('all');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [altText, setAltText] = useState('');
  const [targetFolder, setTargetFolder] = useState('general');
  const fileInput = useRef(null);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: readError } = await supabase
        .from('storefront_media')
        .select('id,storage_path,public_url,file_name,mime_type,size_bytes,alt_text,folder,is_public,created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (readError) throw readError;
      setItems(data || []);
    } catch (e) {
      setError(e?.message || 'მედიაფაილების ჩატვირთვა ვერ მოხერხდა. გადაამოწმეთ ადმინისტრატორის წვდომა.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMedia(); }, [loadMedia]);

  const folders = useMemo(() => ['all', ...new Set(items.map(item => item.folder || 'general'))], [items]);
  const visibleItems = useMemo(() => items.filter(item => {
    const matchesFolder = folder === 'all' || (item.folder || 'general') === folder;
    const term = search.trim().toLowerCase();
    return matchesFolder && (!term || item.file_name.toLowerCase().includes(term) || (item.alt_text || '').toLowerCase().includes(term));
  }), [items, folder, search]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setError(''); setMessage('');
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError('აირჩიეთ JPG, PNG, WEBP ან GIF სურათი.');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('ფაილის მაქსიმალური ზომაა 5 MB.');
      return;
    }
    setUploading(true);
    let uploadedPath = null;
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData?.user) throw new Error('ატვირთვისთვის საჭიროა ადმინისტრატორის ანგარიშით შესვლა.');
      const safeName = selectedFile.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-90) || 'image';
      const path = `${targetFolder}/${Date.now()}-${safeName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from(BUCKET).upload(path, selectedFile, {
        cacheControl: '3600', upsert: false, contentType: selectedFile.type
      });
      if (uploadError) throw uploadError;
      uploadedPath = uploadData.path;
      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);
      const { error: metadataError } = await supabase.from('storefront_media').insert({
        storage_path: uploadData.path, public_url: publicData.publicUrl,
        file_name: selectedFile.name, mime_type: selectedFile.type,
        size_bytes: selectedFile.size, alt_text: altText.trim() || null,
        folder: targetFolder, is_public: true, created_by: authData.user.id
      });
      if (metadataError) throw metadataError;
      setSelectedFile(null); setAltText('');
      if (fileInput.current) fileInput.current.value = '';
      setMessage('სურათი წარმატებით აიტვირთა მედიაბიბლიოთეკაში.');
      await loadMedia();
    } catch (e) {
      if (uploadedPath) {
        await supabase.storage.from(BUCKET).remove([uploadedPath]).catch(() => {});
      }
      setError(e?.message || 'სურათის ატვირთვა ვერ მოხერხდა. გადაამოწმეთ Storage bucket და წვდომის წესები.');
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage('სურათის ბმული დაკოპირდა.');
    } catch {
      setError('ბმულის კოპირება ვერ მოხერხდა ამ მოწყობილობაზე.');
    }
  };

  const deleteMedia = async (item) => {
    if (!window.confirm('წაიშალოს ეს სურათი მედიაბიბლიოთეკიდან?')) return;
    setError(''); setMessage('');
    try {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([item.storage_path]);
      if (storageError) throw new Error(`Storage-ში წაშლა ვერ დასრულდა; ჩანაწერი შენარჩუნებულია და ხელახლა ცდა შეგიძლიათ. ${storageError.message || ''}`);
      const { error: rowError } = await supabase.from('storefront_media').delete().eq('id', item.id);
      if (rowError) {
        setError(`ფაილი Storage-იდან წაიშალა, მაგრამ მედიაბიბლიოთეკის ჩანაწერი ვერ წაიშალა. განაახლეთ სია და გადაამოწმეთ ჩანაწერი. ${rowError.message || ''}`);
        await loadMedia();
        return;
      }
      setMessage('სურათი და მედიაბიბლიოთეკის ჩანაწერი წაიშალა.');
      await loadMedia();
    } catch (e) {
      setError(e?.message || 'სურათის წაშლა ვერ მოხერხდა. გადაამოწმეთ Storage-ის წვდომის წესები.');
    }
  };

  return (
    <div className="space-y-5 text-slate-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="text-lg font-black">მედიაბიბლიოთეკა</h3><p className="text-sm text-stone-500">ცენტრალური სურათების საცავი ბანერებისა და კატეგორიებისთვის</p></div>
        <button onClick={loadMedia} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm font-bold"><RefreshCw size={15}/> განახლება</button>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3">
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>setSelectedFile(e.target.files?.[0]||null)} className="block w-full text-sm"/>
        {selectedFile && <p className="text-xs text-stone-600">{selectedFile.name} · {(selectedFile.size/1024/1024).toFixed(2)} MB</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input value={altText} onChange={e=>setAltText(e.target.value)} placeholder="სურათის აღწერა (Alt text)" className="rounded-xl border border-stone-200 bg-white p-3 text-sm"/>
          <select value={targetFolder} onChange={e=>setTargetFolder(e.target.value)} className="rounded-xl border border-stone-200 bg-white p-3 text-sm"><option value="general">ზოგადი</option><option value="banners">ბანერები</option><option value="categories">კატეგორიები</option><option value="products">პროდუქტები</option></select>
        </div>
        <button onClick={handleUpload} disabled={!selectedFile||uploading} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"><ImagePlus size={16}/>{uploading?'იტვირთება...':'სურათის ატვირთვა'}</button>
        <p className="text-xs text-stone-500">JPG, PNG, WEBP ან GIF · მაქსიმუმ 5 MB. ატვირთვა მოითხოვს ადმინისტრატორის Storage წვდომას.</p>
      </div>
      {message && <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 size={16}/>{message}</p>}
      {error && <p className="flex items-center gap-2 text-sm text-rose-700"><AlertCircle size={16}/>{error}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ფაილის ძებნა..." className="w-full rounded-xl border border-stone-200 py-3 pl-9 pr-3 text-sm"/></label>
        <select value={folder} onChange={e=>setFolder(e.target.value)} className="rounded-xl border border-stone-200 px-3 py-3 text-sm">{folders.map(value=><option key={value} value={value}>{value==='all'?'ყველა საქაღალდე':value}</option>)}</select>
      </div>
      {loading ? <div className="flex items-center gap-2 p-8 text-sm text-stone-500"><Loader2 className="animate-spin"/> იტვირთება...</div> : visibleItems.length===0 ? <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">მედიაფაილები ჯერ არ არის.</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{visibleItems.map(item=><article key={item.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white"><img src={item.public_url} alt={item.alt_text||item.file_name} loading="lazy" className="aspect-square w-full object-cover bg-stone-100"/><div className="space-y-2 p-3"><p className="truncate text-xs font-bold" title={item.file_name}>{item.file_name}</p><p className="text-[10px] text-stone-500">{item.folder} · {item.size_bytes?Math.round(item.size_bytes/1024)+' KB':''}</p><div className="flex gap-2"><button onClick={()=>copyUrl(item.public_url)} className="flex-1 rounded-lg bg-stone-100 px-2 py-2 text-xs font-bold"><Copy size={13} className="inline mr-1"/>ბმული</button><button onClick={()=>deleteMedia(item)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700" aria-label="სურათის წაშლა"><Trash2 size={13}/></button></div></div></article>)}</div>}
    </div>
  );
}

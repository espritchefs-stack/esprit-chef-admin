"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, CheckCircle, Loader2, Camera, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type ClassSession = {
  id: string;
  class_type: string;
  cohort_label: string;
  session_date: string;
  week_label: string | null;
  note: string | null;
};

// "오늘 수업" 페이지 — 수업 직후 3분 안에 회차 선택 → 사진 업로드 → (선택) 셰프 노트
export default function SessionPhotoPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [note, setNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [photoCount, setPhotoCount] = useState<number | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
        setIsAdmin(!!data?.is_admin);
      } else {
        setIsAdmin(false);
      }
      setAuthChecked(true);
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadSessions = useCallback(async () => {
    const { data } = await supabase
      .from('class_sessions')
      .select('id, class_type, cohort_label, session_date, week_label, note')
      .order('session_date', { ascending: false })
      .limit(30);
    const rows = data || [];
    setSessions(rows);
    if (rows.length > 0 && !selectedId) {
      // 기본 선택: 오늘과 가장 가까운 지난/당일 회차
      const today = new Date().toISOString().slice(0, 10);
      const recent = rows.find(r => r.session_date <= today) || rows[rows.length - 1];
      setSelectedId(recent.id);
      setNote(recent.note || '');
    }
  }, [selectedId]);

  useEffect(() => { if (isAdmin) loadSessions(); }, [isAdmin, loadSessions]);

  useEffect(() => {
    const fetchCount = async () => {
      if (!selectedId) { setPhotoCount(null); return; }
      const { count } = await supabase
        .from('session_photos')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', selectedId);
      setPhotoCount(count ?? 0);
      const s = sessions.find(x => x.id === selectedId);
      setNote(s?.note || '');
    };
    fetchCount();
  }, [selectedId, sessions]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) { setMessage('회차를 선택해주세요.'); return; }
    if ((!files || files.length === 0) && !note.trim()) {
      setMessage('사진을 선택하거나 노트를 입력해주세요.');
      return;
    }
    setIsUploading(true);
    setMessage('');
    try {
      let uploaded = 0;
      if (files) {
        const startOrder = photoCount ?? 0;
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const ext = f.name.split('.').pop() || 'jpg';
          const path = `${selectedId}/${Date.now()}_${i}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('session-photos')
            .upload(path, f, { cacheControl: '3600', upsert: false });
          if (upErr) throw upErr;
          const { error: dbErr } = await supabase
            .from('session_photos')
            .insert({ session_id: selectedId, image_url: path, sort_order: startOrder + i });
          if (dbErr) throw dbErr;
          uploaded++;
        }
      }
      const s = sessions.find(x => x.id === selectedId);
      if (note.trim() !== (s?.note || '')) {
        const { error: noteErr } = await supabase
          .from('class_sessions')
          .update({ note: note.trim() || null })
          .eq('id', selectedId);
        if (noteErr) throw noteErr;
      }
      setMessage(`✅ 완료 — 사진 ${uploaded}장 업로드${note.trim() ? ' + 노트 저장' : ''}. 수강생 앱에 바로 반영됩니다.`);
      setFiles(null);
      setPhotoCount((photoCount ?? 0) + uploaded);
      loadSessions();
    } catch (err: any) {
      setMessage(`[오류] ${err.message || '업로드 실패'}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-[#D4AF37]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-gray-600">관리자 로그인이 필요합니다.</p>
        <Link href="/" className="text-[#D4AF37] underline text-sm">메인 페이지에서 로그인</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-900 font-sans pb-20">
      <header className="px-8 py-6 border-b border-gray-200 bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-xl tracking-[0.2em] font-medium text-gray-800 uppercase">오늘 수업</h1>
        </div>
        <div className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold border border-[#D4AF37] px-3 py-1 rounded-full">
          Session Photos
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-gray-500 font-light mb-10 text-center">
          수업 끝나고 3분 — 회차 선택, 사진 올리기, 끝. 수강생 앱의 &ldquo;내 수업&rdquo;에 바로 나타납니다.
        </p>

        <form onSubmit={handleUpload} className="bg-white p-8 md:p-10 shadow-sm border border-gray-100 rounded-2xl space-y-8">
          {message && (
            <div className={`p-4 rounded-lg text-sm ${message.includes('오류') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {message}
            </div>
          )}

          {/* 회차 선택 */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-3 font-semibold">
              수업 회차
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-[#D4AF37] block px-4 py-3 outline-none"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.session_date} · {s.cohort_label} · {s.week_label || ''}
                </option>
              ))}
            </select>
            {photoCount !== null && (
              <p className="text-xs text-gray-400 mt-2">현재 등록된 사진 {photoCount}장</p>
            )}
          </div>

          {/* 사진 다중 업로드 */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-3 font-semibold">
              수업 사진 (여러 장 선택 가능)
            </label>
            <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${files?.length ? 'border-[#D4AF37] bg-yellow-50/30' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'}`}>
              <div className="flex flex-col items-center justify-center py-6">
                {files?.length ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-[#D4AF37] mb-2" />
                    <p className="text-sm text-gray-700 font-medium">{files.length}장 선택됨</p>
                  </>
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold text-[#D4AF37]">클릭해서 사진 선택</span> (JPG/PNG, 다중 선택)
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(e.target.files)}
              />
            </label>
          </div>

          {/* 셰프 노트 */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-3 font-semibold">
              셰프 노트 (선택)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="예: 오늘 제육볶음 불 조절 다들 좋았습니다. 집에서는 팬을 충분히 달군 뒤 시작하세요."
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-[#D4AF37] block px-4 py-3 outline-none placeholder-gray-400"
            />
          </div>

          <button
            type="submit"
            disabled={isUploading}
            className="w-full flex justify-center items-center py-4 px-6 rounded-lg shadow-md text-white bg-[#D4AF37] hover:bg-[#C5A028] transition-colors disabled:opacity-70 font-medium uppercase tracking-widest text-sm"
          >
            {isUploading ? (
              <><Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />업로드 중...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" />수강생 앱에 올리기</>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}

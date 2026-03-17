"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, FileText, CheckCircle, Loader2 } from 'lucide-react';

export default function AdminUploadPage() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Foundation');
  const [file, setFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !file || !imageFile) {
      setMessage('Please provide a Title, Cover Image, and a PDF Document.');
      return;
    }

    setIsUploading(true);
    setMessage('');
    setProgress(10);

    setIsUploading(true);
    setMessage('');
    setProgress(10);

    let pdfPublicUrl = '';
    let imagePublicUrl = '';

    // Step 1: Storage Uploads (PDF + Image)
    try {
      // PDF
      const pdfExt = file.name.split('.').pop();
      const pdfFileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${pdfExt}`;
      const pdfPath = `${category.toLowerCase()}/${pdfFileName}`;

      const { error: pdfError } = await supabase.storage
        .from('recipe-pdfs')
        .upload(pdfPath, file, { cacheControl: '3600', upsert: false });

      if (pdfError) throw pdfError;
      setProgress(40);

      const { data: pdfData } = supabase.storage.from('recipe-pdfs').getPublicUrl(pdfPath);
      pdfPublicUrl = pdfData.publicUrl;

      // Image
      const imgExt = imageFile.name.split('.').pop();
      const imgFileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${imgExt}`;
      const imgPath = `${category.toLowerCase()}/${imgFileName}`;

      const { error: imgError } = await supabase.storage
        .from('recipe-photos')
        .upload(imgPath, imageFile, { cacheControl: '3600', upsert: false });

      if (imgError) throw imgError;
      setProgress(80);

      const { data: imgData } = supabase.storage.from('recipe-photos').getPublicUrl(imgPath);
      imagePublicUrl = imgData.publicUrl;

    } catch (storageError: any) {
      console.error('Storage Error Detail:', JSON.stringify(storageError, Object.getOwnPropertyNames(storageError)));
      setMessage(`[Storage Error] RLS or File issue. Code: ${storageError.statusCode || 'N/A'}`);
      setIsUploading(false);
      setProgress(0);
      return;
    }

    // Step 2: Database Insert
    try {
      const { error: dbError } = await supabase
        .from('recipes')
        .insert([{ 
          title_en: title, 
          title_ko: title, 
          category, 
          pdf_url: pdfPublicUrl,
          image_url: imagePublicUrl
        }]);

      if (dbError) throw dbError;

      setProgress(100);
      setMessage('Recipe Document & Cover successfully published to Esprit!');
      setTitle('');
      setFile(null);
      setImageFile(null);
    } catch (dbError: any) {
      console.error('Database Error Detail:', dbError);
      
      const details = dbError.details ? ` | Details: ${dbError.details}` : '';
      const hint = dbError.hint ? ` | Hint: ${dbError.hint}` : '';
      const message = dbError.message || JSON.stringify(dbError);
      
      setMessage(`[Database Error] ${message}${details}${hint}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-900 font-sans selection:bg-[#D4AF37] selection:text-white pb-20">
      <header className="px-8 py-6 border-b border-gray-200 bg-white flex items-center justify-between shadow-sm">
        <h1 className="text-xl tracking-[0.2em] font-medium text-gray-800 uppercase">
          Esprit Admin Web
        </h1>
        <div className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold border border-[#D4AF37] px-3 py-1 rounded-full">
          Chef Portal
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12 text-center">
          <h2 className="text-3xl lg:text-4xl font-serif text-gray-900 mb-4 transition-all">
            Upload Recipe Document
          </h2>
          <p className="text-gray-500 tracking-wide font-light">
            Distribute premium culinary knowledge to the Esprit App seamlessly via PDF.
          </p>
        </div>

        <form onSubmit={handleUpload} className="bg-white p-8 md:p-12 shadow-sm border border-gray-100 rounded-2xl">
          {message && (
            <div className={`mb-8 p-4 rounded-lg flex items-center gap-3 ${message.includes('failed') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
              {message.includes('failed') ? <FileText className="w-5 h-5 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 flex-shrink-0" />}
              <span className="text-sm font-medium">{message}</span>
            </div>
          )}

          <div className="space-y-8">
            {/* Title */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-3 font-semibold">
                Recipe Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Traditional Beef Wellington"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent block px-4 py-3 placeholder-gray-400 transition-all outline-none"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-3 font-semibold">
                Vault Category
              </label>
              <div className="flex flex-wrap gap-3">
                {['Foundation', 'Intermediate', 'Professional'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 border ${
                      category === cat
                        ? 'bg-[#D4AF37] text-white border-[#D4AF37] shadow-md shadow-[#D4AF37]/20 relative overflow-hidden'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-3 font-semibold">
                Cover Image (JPG/PNG)
              </label>
              <div className="flex items-center justify-center w-full relative">
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${imageFile ? 'border-[#D4AF37] bg-yellow-50/30' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'}`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {imageFile ? (
                      <>
                        <CheckCircle className="w-8 h-8 text-[#D4AF37] mb-2" />
                        <p className="text-sm text-gray-700 font-medium">{imageFile.name}</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold text-[#D4AF37]">Click to upload</span> photo
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
            </div>

            {/* PDF Upload */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-3 font-semibold">
                Classroom PDF Document
              </label>
              <div className="flex items-center justify-center w-full relative">
                <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${file ? 'border-[#D4AF37] bg-yellow-50/30' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'}`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {file ? (
                      <>
                        <FileText className="w-10 h-10 text-[#D4AF37] mb-3" />
                        <p className="mb-2 text-sm text-gray-700 font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-400 mb-4" />
                        <p className="mb-2 text-sm text-gray-600">
                          <span className="font-semibold text-[#D4AF37]">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-400">PDF documents only (Max. 20MB)</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    required={!file} // Only required if no file selected yet
                  />
                </label>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isUploading}
                className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-lg shadow-md focus:ring-4 focus:ring-[#D4AF37]/20 text-white bg-[#D4AF37] hover:bg-[#C5A028] transition-colors disabled:opacity-70 disabled:cursor-not-allowed font-medium uppercase tracking-widest text-sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    Uploading... {progress}%
                  </>
                ) : (
                  'Publish to Application'
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

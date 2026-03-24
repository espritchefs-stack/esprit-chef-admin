"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, FileText, CheckCircle, Loader2 } from 'lucide-react';

export default function AdminUploadPage() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Foundation');
  const [purchaseUrl, setPurchaseUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  // Schedule Image Upload State
  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [isScheduleUploading, setIsScheduleUploading] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState('');

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

  const handleScheduleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScheduleFile(e.target.files[0]);
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
          image_url: imagePublicUrl,
          purchase_url: purchaseUrl || null,
          is_featured: isFeatured
        }]);

      if (dbError) throw dbError;

      setProgress(100);
      setMessage('Recipe Document & Cover successfully published to Esprit!');
      setTitle('');
      setPurchaseUrl('');
      setIsFeatured(false);
      setFile(null);
      setImageFile(null);
    } catch (dbError: any) {
      console.error('Database Error Detail:', dbError);
      
      let errorMessage = 'An unknown database error occurred.';
      if (typeof dbError === 'string') {
        errorMessage = dbError;
      } else if (dbError?.message) {
        errorMessage = dbError.message;
      } else if (dbError?.error_description) {
        errorMessage = dbError.error_description;
      } else if (Object.keys(dbError).length > 0) {
        errorMessage = JSON.stringify(dbError);
      }
      
      const details = dbError?.details ? ` | Details: ${dbError.details}` : '';
      const hint = dbError?.hint ? ` | Hint: ${dbError.hint}` : '';
      
      setMessage(`[Database Error] ${errorMessage}${details}${hint}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 3000);
    }
  };

  const handleScheduleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleFile) {
      setScheduleMessage('Please select a Schedule Image.');
      return;
    }

    setIsScheduleUploading(true);
    setScheduleMessage('');

    try {
      // 1. Upload to Storage
      const ext = scheduleFile.name.split('.').pop();
      const fileName = `schedule_${Date.now()}.${ext}`;
      
      const { error: storageError } = await supabase.storage
        .from('recipe-photos') // Reusing photo bucket for simplicity
        .upload(`settings/${fileName}`, scheduleFile, { cacheControl: '3600', upsert: true });

      if (storageError) throw storageError;

      const { data: imgData } = supabase.storage.from('recipe-photos').getPublicUrl(`settings/${fileName}`);
      const publicUrl = imgData.publicUrl;

      // 2. Update app_settings table
      const { error: dbError } = await supabase
        .from('app_settings')
        .upsert({ id: 'global', schedule_image_url: publicUrl });

      if (dbError) throw dbError;

      setScheduleMessage('✅ Schedule Image updated successfully!');
      setScheduleFile(null);
    } catch (err: any) {
      console.error(err);
      setScheduleMessage(`[Error] ${err.message || 'Failed to update schedule.'}`);
    } finally {
      setIsScheduleUploading(false);
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
                {['Foundation', 'Intermediate', 'Professional', 'Competition Class'].map((cat) => (
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

            {/* Purchase URL Link */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-3 font-semibold">
                Chef's Pick: Purchase Link
              </label>
              <input
                type="url"
                value={purchaseUrl}
                onChange={(e) => setPurchaseUrl(e.target.value)}
                placeholder="https://link-to-tools-or-ingredients.com"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent block px-4 py-3 placeholder-gray-400 transition-all outline-none"
              />
            </div>

            {/* Is Featured Toggle */}
            <div className="flex items-center p-4 bg-yellow-50/50 border border-yellow-100/50 rounded-lg">
              <input
                id="isFeatured"
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-5 h-5 text-[#D4AF37] bg-white border-gray-300 rounded focus:ring-[#D4AF37] focus:ring-2 cursor-pointer"
              />
              <label htmlFor="isFeatured" className="ml-3 block text-sm font-medium text-gray-900 cursor-pointer">
                ✨ Set as Esprit Signature (Home Screen Hero)
              </label>
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

        {/* Schedule Image Settings Section */}
        <div className="mt-16 mb-12 text-center">
          <h2 className="text-3xl lg:text-4xl font-serif text-gray-900 mb-4 transition-all">
            App Settings
          </h2>
          <p className="text-gray-500 tracking-wide font-light">
            Manage global configuration for the Esprit App.
          </p>
        </div>

        <form onSubmit={handleScheduleUpload} className="bg-white p-8 md:p-12 shadow-sm border border-gray-100 rounded-2xl mb-20">
          <div className="space-y-8">
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#D4AF37] mb-3 font-semibold">
                Class Schedule Image (Profile &gt; Schedule)
              </label>
              <p className="text-xs text-gray-500 mb-4 font-light">
                Replace the webview with a stunning visual poster of your monthly class schedule.
              </p>
              
              {scheduleMessage && (
                <div className={`mb-6 p-4 rounded-lg text-sm ${scheduleMessage.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {scheduleMessage}
                </div>
              )}

              <div className="flex items-center justify-center w-full relative">
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${scheduleFile ? 'border-[#D4AF37] bg-yellow-50/30' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'}`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {scheduleFile ? (
                      <>
                        <CheckCircle className="w-8 h-8 text-[#D4AF37] mb-2" />
                        <p className="text-sm text-gray-700 font-medium">{scheduleFile.name}</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold text-[#D4AF37]">Click to upload</span> schedule poster
                        </p>
                      </>
                    )}
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleScheduleChange} />
                </label>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isScheduleUploading || !scheduleFile}
              className="w-full flex justify-center items-center py-4 px-6 border border-gray-200 rounded-lg shadow-sm focus:ring-4 focus:ring-gray-100 text-gray-900 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium uppercase tracking-widest text-sm"
            >
              {isScheduleUploading ? <Loader2 className="animate-spin mr-3 h-5 w-5" /> : 'Update Schedule Image'}
            </button>
          </div>
        </form>

      </main>
    </div>
  );
}

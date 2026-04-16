'use client';

import React, { useState } from 'react';
import imageCompression from 'browser-image-compression';
import useSWR from 'swr';
import { motion } from 'motion/react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MistakeUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Poll every 3 seconds if taskId exists and status is not completed/failed
  const { data, error } = useSWR(
    taskId ? `/api/webhooks/process-image?taskId=${taskId}` : null,
    fetcher,
    { refreshInterval: (data) => (data?.status === 'completed' || data?.status === 'failed' ? 0 : 3000) }
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setIsCompressing(true);
    setTaskId(null); // Reset previous task
    try {
      // 1. Compress image on client side
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: 0.8,
      };
      
      const compressedFile = await imageCompression(selectedFile, options);
      setFile(compressedFile);
      
      // Convert to base64 for upload
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = async () => {
        const base64data = reader.result;
        
        // 2. Upload to backend
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: base64data })
        });
        
        const data = await res.json();
        if (data.taskId) {
          setTaskId(data.taskId);
        }
      };
    } catch (error) {
      console.error('Error compressing or uploading image:', error);
    } finally {
      setIsCompressing(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Upload Mistake</h2>
      
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleFileChange} 
        disabled={isCompressing || (taskId && data?.status !== 'completed' && data?.status !== 'failed')}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />

      {isCompressing && <p className="text-sm text-gray-500">Compressing image...</p>}

      {taskId && (!data || data?.status === 'processing') && (
        <div className="space-y-3">
          <p className="text-sm text-blue-600 font-medium">AI is analyzing your mistake...</p>
          {/* Skeleton Animation */}
          <motion.div 
            className="h-32 w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg"
            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            style={{ backgroundSize: '200% 100%' }}
          />
        </div>
      )}

      {data?.status === 'completed' && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="text-green-800 font-bold mb-2">Analysis Complete!</h3>
          <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-60">
            {JSON.stringify(data.result, null, 2)}
          </pre>
        </div>
      )}

      {data?.status === 'failed' && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <h3 className="text-red-800 font-bold mb-2">Analysis Failed</h3>
          <p className="text-sm text-red-600">{data.error}</p>
        </div>
      )}
    </div>
  );
}

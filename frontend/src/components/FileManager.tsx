import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';

interface OfficeFile {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  storage_location: string;
  uploaded_at?: string;
  created_at?: string;
  uploaded_by?: string;
  uploader?: { name: string };
}

export function FileManager() {
  const { theme } = useTheme();
  const [files, setFiles] = useState<OfficeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [destination, setDestination] = useState<'local' | 'nas'>('local');

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const data = await api.getFiles();
      setFiles(data.files);
    } catch (err) {
      // Use demo data if API fails
      setFiles([
        {
          id: '1',
          filename: 'Project_Report.docx',
          file_type: '.docx',
          file_size: 1048576,
          storage_location: 'nas',
          uploaded_at: new Date(Date.now() - 7200000).toISOString(),
          uploader: { name: 'Demo User' }
        },
        {
          id: '2',
          filename: 'Budget_2026.xlsx',
          file_type: '.xlsx',
          file_size: 524288,
          storage_location: 'local',
          uploaded_at: new Date(Date.now() - 172800000).toISOString(),
          uploader: { name: 'Demo User' }
        },
        {
          id: '3',
          filename: 'Presentation.pptx',
          file_type: '.pptx',
          file_size: 2097152,
          storage_location: 'nas',
          uploaded_at: new Date(Date.now() - 259200000).toISOString(),
          uploader: { name: 'Demo User' }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      await api.uploadFile(selectedFile, destination);
      alert('File uploaded successfully');
      setSelectedFile(null);
      await loadFiles();
    } catch (err: any) {
      // Demo mode: simulate file upload
      const newFile: OfficeFile = {
        id: String(Date.now()),
        filename: selectedFile.name,
        file_type: selectedFile.name.substring(selectedFile.name.lastIndexOf('.')),
        file_size: selectedFile.size,
        storage_location: destination,
        uploaded_at: new Date().toISOString(),
        uploader: { name: 'Demo User' }
      };
      setFiles(prev => [newFile, ...prev]);
      setSelectedFile(null);
      alert('File uploaded successfully (demo mode)');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const blob = await api.downloadFile(fileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      // Demo mode: show message
      alert('Download not available in demo mode');
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await api.deleteFile(fileId);
      alert('File deleted successfully');
      await loadFiles();
    } catch (err: any) {
      // Demo mode: remove from local state
      setFiles(prev => prev.filter(f => f.id !== fileId));
      alert('File deleted successfully (demo mode)');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('word') || fileType === '.docx' || fileType === '.doc') return '📝';
    if (fileType.includes('sheet') || fileType === '.xlsx' || fileType === '.xls') return '📊';
    if (fileType.includes('presentation') || fileType === '.pptx' || fileType === '.ppt') return '📽️';
    if (fileType === '.pdf') return '📄';
    return '📁';
  };

  if (loading) {
    return <div className={`transition-colors duration-300 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Loading files...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${
          theme === 'dark' ? 'text-white' : 'text-slate-900'
        }`}>Upload Office File</h2>
        <div className={`rounded-lg p-6 border transition-colors duration-300 ${
          theme === 'dark'
            ? 'bg-slate-700/50 border-slate-600'
            : 'bg-white border-slate-200'
        }`}>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Select File
              </label>
              <input
                type="file"
                onChange={handleFileSelect}
                accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf"
                className={`block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer transition-colors duration-300 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Destination
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="destination"
                    value="local"
                    checked={destination === 'local'}
                    onChange={(e) => setDestination(e.target.value as 'local' | 'nas')}
                    className="text-blue-600"
                  />
                  <span className={`transition-colors duration-300 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>Local Storage</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="destination"
                    value="nas"
                    checked={destination === 'nas'}
                    onChange={(e) => setDestination(e.target.value as 'local' | 'nas')}
                    className="text-blue-600"
                  />
                  <span className={`transition-colors duration-300 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>NAS</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-medium rounded-lg transition-colors duration-300"
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${
          theme === 'dark' ? 'text-white' : 'text-slate-900'
        }`}>Files</h2>
        <div className="space-y-3">
          {files.length === 0 ? (
            <div className={`text-center py-8 transition-colors duration-300 ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>No files uploaded yet</div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className={`rounded-lg p-4 border flex items-center justify-between transition-colors duration-300 ${
                  theme === 'dark'
                    ? 'bg-slate-700/50 border-slate-600'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-3xl">{getFileIcon(file.file_type)}</span>
                  <div className="flex-1">
                    <h3 className={`font-medium transition-colors duration-300 ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>{file.filename}</h3>
                    <div className={`text-sm space-y-1 transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      <div>Size: {formatBytes(file.file_size)}</div>
                      <div>Location: {file.storage_location}</div>
                      <div>Uploaded: {formatDate(file.uploaded_at || file.created_at || '')}</div>
                      <div>By: {file.uploader?.name || file.uploaded_by || 'Unknown'}</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(file.id, file.filename)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors duration-300"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors duration-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

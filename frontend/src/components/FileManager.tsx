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
      setFiles(data.files || []);
    } catch (err) {
      console.error('Error loading files:', err);
      setFiles([]);
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
      console.error('Upload error:', err);
      alert('Error uploading file: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const blob = await api.downloadFile(fileId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      // Append to body, click, and cleanup
      document.body.appendChild(link);
      link.click();
      
      // Cleanup after a delay to ensure download starts
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
    } catch (err: any) {
      console.error('Download error:', err);
      alert('Error downloading file: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      await api.deleteFile(fileId);
      alert('File deleted successfully');
      await loadFiles();
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Error deleting file: ' + (err.message || 'Unknown error'));
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case '.docx':
      case '.doc':
        return '📄';
      case '.xlsx':
      case '.xls':
        return '📊';
      case '.pptx':
      case '.ppt':
        return '📽️';
      case '.pdf':
        return '📕';
      default:
        return '📁';
    }
  };

  const cardBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
  const mutedText = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className={`${cardBg} rounded-xl p-6 border ${borderColor}`}>
        <h3 className={`text-lg font-semibold ${textColor} mb-4`}>Upload Office File</h3>
        
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${mutedText} mb-2`}>
              Select File
            </label>
            <input
              type="file"
              accept=".docx,.xlsx,.pptx,.doc,.xls,.ppt,.pdf"
              onChange={handleFileSelect}
              className={`block w-full text-sm ${mutedText} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer`}
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium ${mutedText} mb-2`}>
              Destination
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="destination"
                  value="local"
                  checked={destination === 'local'}
                  onChange={() => setDestination('local')}
                  className="mr-2"
                />
                <span className={mutedText}>Local Storage</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="destination"
                  value="nas"
                  checked={destination === 'nas'}
                  onChange={() => setDestination('nas')}
                  className="mr-2"
                />
                <span className={mutedText}>NAS</span>
              </label>
            </div>
          </div>
          
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className={`w-full py-3 rounded-lg font-medium transition-colors duration-300 ${
              selectedFile && !uploading
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>

      {/* Files List */}
      <div className={`${cardBg} rounded-xl p-6 border ${borderColor}`}>
        <h3 className={`text-lg font-semibold ${textColor} mb-4`}>Files</h3>
        
        {loading ? (
          <div className={`text-center py-8 ${mutedText}`}>Loading files...</div>
        ) : files.length === 0 ? (
          <div className={`text-center py-8 ${mutedText}`}>No files uploaded yet</div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${borderColor} hover:border-blue-500 transition-colors duration-300`}
              >
                <div className="flex items-center space-x-4">
                  <span className="text-3xl">{getFileIcon(file.file_type)}</span>
                  <div>
                    <div className={`font-medium ${textColor}`}>{file.filename}</div>
                    <div className={`text-sm ${mutedText}`}>
                      Size: {formatBytes(file.file_size)} | Location: {file.storage_location}
                    </div>
                    <div className={`text-xs ${mutedText}`}>
                      <div>Uploaded: {formatDate(file.uploaded_at || file.created_at || '')}</div>
                      <div>By: {file.uploader?.name || file.uploaded_by || 'Unknown'}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

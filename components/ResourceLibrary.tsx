'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useAppContext } from '@/lib/store';
import { Database, UploadCloud, FileText, Image as ImageIcon, File, Trash2, Download, Search, HardDrive, Folder, ChevronRight, FolderPlus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Resource } from '@/lib/types';
import { clsx } from 'clsx';

export function ResourceLibrary() {
  const { state, dispatch } = useAppContext();
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
          await traverseFileTree(item, currentFolderId);
        }
      }
    }
  };

  const traverseFileTree = async (item: any, parentId: string | null) => {
    if (item.isFile) {
      item.file((file: File) => {
        processFile(file, parentId);
      });
    } else if (item.isDirectory) {
      const folderId = uuidv4();
      const newFolder: Resource = {
        id: folderId,
        name: item.name,
        type: 'folder',
        size: 0,
        createdAt: Date.now(),
        subject: state.currentSubject,
        isFolder: true,
        parentId: parentId
      };
      dispatch({ type: 'ADD_RESOURCE', payload: newFolder });

      const dirReader = item.createReader();
      dirReader.readEntries(async (entries: any[]) => {
        for (let i = 0; i < entries.length; i++) {
          await traverseFileTree(entries[i], folderId);
        }
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      for (const file of files) {
        await processFile(file, currentFolderId);
      }
    }
  };

  const processFile = async (file: File, parentId: string | null) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const newResource: Resource = {
        id: uuidv4(),
        name: file.name,
        type: file.type || 'unknown',
        size: file.size,
        createdAt: Date.now(),
        data: reader.result as string,
        subject: state.currentSubject,
        isFolder: false,
        parentId: parentId
      };
      dispatch({ type: 'ADD_RESOURCE', payload: newResource });
    };
    reader.readAsDataURL(file);
  };

  const handleCreateFolder = () => {
    const name = prompt('请输入文件夹名称：');
    if (name) {
      const newFolder: Resource = {
        id: uuidv4(),
        name: name,
        type: 'folder',
        size: 0,
        createdAt: Date.now(),
        subject: state.currentSubject,
        isFolder: true,
        parentId: currentFolderId
      };
      dispatch({ type: 'ADD_RESOURCE', payload: newFolder });
    }
  };

  const handleDelete = (id: string, isFolder?: boolean) => {
    if (confirm(`确定要删除这个${isFolder ? '文件夹及其所有内容' : '文件'}吗？`)) {
      if (isFolder) {
        // Recursively delete children
        const deleteRecursively = (parentId: string) => {
          const children = state.resources.filter(r => r.parentId === parentId);
          children.forEach(child => {
            if (child.isFolder) deleteRecursively(child.id);
            dispatch({ type: 'DELETE_RESOURCE', payload: child.id });
          });
        };
        deleteRecursively(id);
      }
      dispatch({ type: 'DELETE_RESOURCE', payload: id });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string, isFolder?: boolean) => {
    if (isFolder) return <Folder className="w-10 h-10 text-amber-400" fill="currentColor" fillOpacity={0.2} />;
    if (type.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-emerald-400" />;
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-rose-400" />;
    return <File className="w-8 h-8 text-indigo-400" />;
  };

  const currentResources = useMemo(() => {
    let filtered = (state.resources || []).filter(r => r.subject === state.currentSubject);
    
    if (searchQuery) {
      return filtered.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    return filtered.filter(r => r.parentId === currentFolderId || (!r.parentId && !currentFolderId));
  }, [state.resources, state.currentSubject, currentFolderId, searchQuery]);

  const breadcrumbs = useMemo(() => {
    const crumbs = [];
    let currentId = currentFolderId;
    while (currentId) {
      const folder = state.resources.find(r => r.id === currentId);
      if (folder) {
        crumbs.unshift(folder);
        currentId = folder.parentId || null;
      } else {
        break;
      }
    }
    return crumbs;
  }, [currentFolderId, state.resources]);

  return (
    <div className="flex h-full bg-[#1e1e1e] text-slate-200">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-800 flex flex-col bg-[#1e1e1e]">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="搜索资源..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#252526] border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button 
            onClick={() => { setCurrentFolderId(null); setSearchQuery(''); }}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              !currentFolderId && !searchQuery ? "bg-teal-500/20 text-teal-400" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
            )}
          >
            <Database className="w-4 h-4" />
            全部文件
          </button>
          {/* Add more sidebar items here if needed (e.g., Recent, Favorites) */}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 py-4 border-b border-slate-800 flex items-center justify-between bg-[#1e1e1e]">
          <div className="flex items-center gap-2 text-sm font-medium">
            <button 
              onClick={() => setCurrentFolderId(null)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              根目录
            </button>
            {breadcrumbs.map(crumb => (
              <React.Fragment key={crumb.id}>
                <ChevronRight className="w-4 h-4 text-slate-600" />
                <button 
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleCreateFolder}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#252526] hover:bg-slate-800 text-slate-300 rounded-lg text-sm transition-colors border border-slate-800"
            >
              <FolderPlus className="w-4 h-4" />
              新建文件夹
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-teal-900/20"
            >
              <UploadCloud className="w-4 h-4" />
              上传文件
            </button>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={clsx(
            "flex-1 p-8 overflow-y-auto custom-scrollbar transition-colors",
            isDragging ? "bg-teal-500/5" : "bg-[#1e1e1e]"
          )}
        >
          {currentResources.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
              <div className="w-16 h-16 bg-[#252526] rounded-full flex items-center justify-center border border-slate-800">
                <HardDrive className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-sm">此文件夹为空，拖拽文件或文件夹到此处上传</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {currentResources.map(resource => (
                <div 
                  key={resource.id} 
                  className="group relative flex flex-col items-center p-4 rounded-xl hover:bg-[#252526] transition-colors cursor-pointer"
                  onDoubleClick={() => resource.isFolder && setCurrentFolderId(resource.id)}
                >
                  <div className="mb-3 relative">
                    {getFileIcon(resource.type, resource.isFolder)}
                  </div>
                  <h3 className="text-xs font-medium text-slate-300 text-center w-full truncate px-2" title={resource.name}>
                    {resource.name}
                  </h3>
                  {!resource.isFolder && (
                    <span className="text-[10px] text-slate-500 mt-1">{formatSize(resource.size)}</span>
                  )}
                  
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                    {resource.data && !resource.isFolder && (
                      <a 
                        href={resource.data} 
                        download={resource.name}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 bg-slate-800 text-slate-400 hover:text-teal-400 rounded-md hover:bg-slate-700 transition-colors shadow-lg"
                        title="下载"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(resource.id, resource.isFolder); }}
                      className="p-1.5 bg-slate-800 text-slate-400 hover:text-rose-400 rounded-md hover:bg-slate-700 transition-colors shadow-lg"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

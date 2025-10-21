import React, { useState, useEffect } from 'react';
import { Settings, ChevronRight, ChevronDown, Server, Database, Globe, User, LogOut, Eye, EyeOff, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'https://gis.eizes.com/api';

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/user/profile`, { credentials: 'include' })
    .then(async (response) => {
      if (response.ok) {
        setUser(await response.json());
      } else {
        window.location.href = `${API_BASE_URL}/auth/login`;
      }
      setLoading(false);
    })
    .catch((err) => {
      setError('Verbindung fehlgeschlagen');
      setLoading(false);
    });
  }, []);

  const logout = () => {
    fetch(`${API_BASE_URL}/auth/logout`, { credentials: 'include' }).then(() => window.location.href = '/');
  };

  return { user, loading, logout, error };
};

const apiService = {
  async fetchSettings() {
    const response = await fetch(`${API_BASE_URL}/settings`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed');
    return await response.json();
  },
  async updateSettings(service, data) {
    const response = await fetch(`${API_BASE_URL}/settings/${service}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed');
    return await response.json();
  }
};

const MenuItem = ({ label, icon: Icon, level, isOpen, onClick, hasChildren, isActive }) => {
  const indent = level * 24;
  
  // Level 0: Hauptmenü "Einstellungen"
  if (level === 0) {
    return (
      <div onClick={onClick} className="flex items-center px-6 py-4 cursor-pointer transition-all hover:bg-blue-50 border-l-4 border-transparent hover:border-blue-500">
        {hasChildren && <span className="mr-3 text-gray-600 transition-transform" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}><ChevronRight size={18} /></span>}
        {Icon && <Icon size={22} className="mr-3 text-blue-600" />}
        <span className="font-semibold text-gray-800 text-base">{label}</span>
      </div>
    );
  }
  
  // Level 1: Services (Geoserver, uMap, Traccar) - DIREKT ANKLICKBAR
  return (
    <div onClick={onClick} className={`flex items-center py-3 cursor-pointer transition-all ${isActive ? 'bg-gradient-to-r from-blue-100 to-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50 border-l-4 border-transparent hover:border-gray-300'}`} style={{ paddingLeft: `${indent + 24}px` }}>
      {Icon && <Icon size={20} className={`mr-3 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />}
      <span className={`font-medium ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>{label}</span>
    </div>
  );
};

const PasswordField = ({ label, value, disabled, onChange }) => {
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value || ''}
          disabled={disabled}
          onChange={onChange}
          className={`w-full px-4 py-3 pr-12 border-2 rounded-lg text-base transition-all focus:outline-none focus:ring-2 ${disabled ? 'border-gray-200 bg-gray-50 text-gray-600' : 'border-blue-200 bg-white hover:border-blue-300 focus:border-blue-400 focus:ring-blue-100'}`}
        />
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1">
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );
};

const SettingsContent = ({ service, data, onSave }) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(data);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { setFormData(data); }, [data]);

  const handleFieldChange = (path, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      let current = newData;
      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newData;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(service, formData);
      setEditMode(false);
    } catch (err) {
      setError('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (key, value, path = []) => {
    const currentPath = [...path, key];
    
    if (typeof value === 'object' && value !== null) {
      return (
        <div key={key} className="mb-8 pb-6 border-b-2 border-gray-100 last:border-0">
          <h4 className="font-bold text-gray-800 mb-4 capitalize text-lg flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            {key}
          </h4>
          <div className="ml-5 space-y-4">
            {Object.entries(value).map(([k, v]) => renderField(k, v, currentPath))}
          </div>
        </div>
      );
    }
    
    const isPassword = key.toLowerCase().includes('password');
    
    if (isPassword) {
      return <PasswordField key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={value} disabled={!editMode} onChange={(e) => handleFieldChange(currentPath, e.target.value)} />;
    }
    
    return (
      <div key={key} className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2 capitalize">{key}</label>
        <input
          type="text"
          value={value || ''}
          disabled={!editMode}
          onChange={(e) => handleFieldChange(currentPath, e.target.value)}
          className={`w-full px-4 py-3 border-2 rounded-lg text-base transition-all focus:outline-none focus:ring-2 ${editMode ? 'border-blue-200 bg-white hover:border-blue-300 focus:border-blue-400 focus:ring-blue-100' : 'border-gray-200 bg-gray-50 text-gray-600'}`}
        />
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-6">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-white capitalize flex items-center">
              <Server className="mr-3" size={32} />
              {service}
            </h2>
            <div className="flex gap-3">
              {editMode ? (
                <>
                  <button onClick={() => { setEditMode(false); setFormData(data); setError(null); }} className="px-6 py-2.5 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all font-medium" disabled={saving}>Abbrechen</button>
                  <button onClick={handleSave} className="px-6 py-2.5 bg-white text-blue-600 rounded-lg hover:bg-gray-50 transition-all font-semibold disabled:opacity-50 shadow-lg" disabled={saving}>
                    {saving ? 'Speichert...' : 'Speichern'}
                  </button>
                </>
              ) : (
                <button onClick={() => setEditMode(true)} className="px-6 py-2.5 bg-white text-blue-600 rounded-lg hover:bg-gray-50 transition-all font-semibold shadow-lg">Bearbeiten</button>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <AlertCircle size={20} />
              <span className="font-medium">{error}</span>
            </div>
          )}
          
          <div className="space-y-2">
            {Object.entries(formData).map(([key, value]) => renderField(key, value))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const { user, loading, logout, error: authError } = useAuth();
  const [openMenus, setOpenMenus] = useState({ einstellungen: true });
  const [selectedService, setSelectedService] = useState(null);
  const [settingsData, setSettingsData] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setSettingsLoading(true);
      apiService.fetchSettings().then(data => {
        setSettingsData(data);
        setSettingsLoading(false);
      });
    }
  }, [user]);

  const toggleMenu = (key) => setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  
  const selectService = (service) => {
    setSelectedService(service);
  };

  const handleSaveSettings = async (service, data) => {
    const result = await apiService.updateSettings(service, data);
    setSettingsData(prev => ({ ...prev, [service]: result.data }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-xl text-gray-700 font-medium">Authentifizierung...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-md">
          <div className="flex items-center gap-4 mb-6 text-red-600">
            <AlertCircle size={40} />
            <h1 className="text-3xl font-bold">Fehler</h1>
          </div>
          <p className="text-gray-700 mb-6">{authError}</p>
          <button onClick={() => window.location.reload()} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Erneut versuchen</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-md border-b-2 border-gray-200">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Settings size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">GIS Management</h1>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 bg-gray-50 rounded-xl px-5 py-3 border border-gray-200">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-md">
                  <User size={22} className="text-white" />
                </div>
                <div className="text-right">
                  <span className="font-semibold text-gray-800 block">{user?.username}</span>
                  <span className="text-sm text-gray-500">{user?.email}</span>
                </div>
              </div>
              <button onClick={logout} className="p-3 hover:bg-red-50 rounded-xl transition-all border-2 border-transparent hover:border-red-200 group" title="Abmelden">
                <LogOut size={22} className="text-gray-600 group-hover:text-red-600 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 bg-white border-r-2 border-gray-200 overflow-y-auto shadow-lg">
          <nav className="py-4">
            <MenuItem 
              label="Einstellungen" 
              icon={Settings} 
              level={0} 
              isOpen={openMenus.einstellungen} 
              onClick={() => toggleMenu('einstellungen')} 
              hasChildren={true} 
            />
            {openMenus.einstellungen && (
              <>
                <MenuItem 
                  label="Geoserver" 
                  icon={Server} 
                  level={1} 
                  isActive={selectedService === 'geoserver'}
                  onClick={() => selectService('geoserver')} 
                  hasChildren={false} 
                />
                <MenuItem 
                  label="uMap" 
                  icon={Server} 
                  level={1} 
                  isActive={selectedService === 'umap'}
                  onClick={() => selectService('umap')} 
                  hasChildren={false} 
                />
                <MenuItem 
                  label="Traccar" 
                  icon={Server} 
                  level={1} 
                  isActive={selectedService === 'traccar'}
                  onClick={() => selectService('traccar')} 
                  hasChildren={false} 
                />
              </>
            )}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-10 bg-gradient-to-br from-gray-50 to-gray-100">
          {settingsLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-gray-700 font-medium text-lg">Lade Einstellungen...</p>
              </div>
            </div>
          ) : selectedService && settingsData[selectedService] ? (
            <SettingsContent service={selectedService} data={settingsData[selectedService]} onSave={handleSaveSettings} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center bg-white rounded-2xl p-12 shadow-lg border border-gray-200">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Settings size={40} className="text-blue-600" />
                </div>
                <p className="text-xl text-gray-700 font-semibold">Wählen Sie eine Einstellung</p>
                <p className="text-gray-500 mt-2">Klicken Sie links auf einen Service</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

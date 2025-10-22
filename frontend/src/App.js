import React, { useState, useEffect } from 'react';
import { Settings, ChevronRight, Server, User, LogOut, Eye, EyeOff, AlertCircle, Map as MapIcon, ExternalLink, Calendar, Globe, Lock, Link2, CheckCircle, Key } from 'lucide-react';

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
        setLoading(false);
      } else if (response.status === 401 || response.status === 403) {
        window.location.href = `${API_BASE_URL}/auth/login`;
      } else {
        setError('Authentifizierung fehlgeschlagen');
        setLoading(false);
      }
    })
    .catch(() => {
      window.location.href = `${API_BASE_URL}/auth/login`;
    });
  }, []);

  const logout = () => {
    fetch(`${API_BASE_URL}/auth/logout`, { credentials: 'include' })
      .then(() => {
        window.location.href = `${API_BASE_URL}/auth/login`;
      });
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
    if (!response.ok) {
      const errorData = await response.json();
      throw errorData;
    }
    return await response.json();
  },
  // NEUE FUNKTION: Workspace-Validierung
  async validateWorkspace(workspaceData) {
    const response = await fetch(`${API_BASE_URL}/settings/geoserver/validate-workspace`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workspaceData)
    });
    if (!response.ok) throw new Error('Validierung fehlgeschlagen');
    return await response.json();
  },
  async fetchUMapMaps() {
    const response = await fetch(`${API_BASE_URL}/umap/maps`, { credentials: 'include' });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to load maps: ${response.status} - ${errorText}`);
    }
    return await response.json();
  },
  async saveToGeoserver(mapId) {
    const response = await fetch(`${API_BASE_URL}/umap/maps/${mapId}/save-to-geoserver`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed');
    return await response.json();
  }
};

const MenuItem = ({ label, icon: Icon, level, isOpen, onClick, hasChildren, isActive }) => {
  const indent = level * 24;
  
  if (level === 0) {
    return (
      <div onClick={onClick} className="flex items-center px-6 py-4 cursor-pointer transition-all hover:bg-blue-50 border-l-4 border-transparent hover:border-blue-500">
        {hasChildren && <span className="mr-3 text-gray-600 transition-transform" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}><ChevronRight size={18} /></span>}
        {Icon && <Icon size={22} className={`mr-3 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />}
        <span className={`font-semibold text-gray-800 text-base ${isActive ? 'text-blue-600' : ''}`}>{label}</span>
      </div>
    );
  }
  
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

// NEUE KOMPONENTE: Token-Feld für Traccar
const TokenField = ({ label, value, disabled, onChange }) => {
  const [showToken, setShowToken] = useState(false);
  
  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
        <Key size={16} />
        {label}
      </label>
      <div className="relative">
        <input
          type={showToken ? 'text' : 'password'}
          value={value || ''}
          disabled={disabled}
          onChange={onChange}
          placeholder={disabled ? '' : 'API-Token eingeben...'}
          className={`w-full px-4 py-3 pr-12 border-2 rounded-lg text-base font-mono transition-all focus:outline-none focus:ring-2 ${disabled ? 'border-gray-200 bg-gray-50 text-gray-600' : 'border-blue-200 bg-white hover:border-blue-300 focus:border-blue-400 focus:ring-blue-100'}`}
        />
        <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1">
          {showToken ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500">Das API-Token für die Traccar-Authentifizierung</p>
    </div>
  );
};

const UMapMapsView = () => {
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMaps();
  }, []);

  const loadMaps = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.fetchUMapMaps();
      setMaps(data.maps || []);
    } catch (err) {
      console.error('uMap loading error:', err);
      setError(err.message || 'Fehler beim Laden der Karten');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToGeoserver = async (mapId, mapName) => {
    // TODO: Diese Funktion wird später die uMap-Karte über Geoserver nach Traccar als Server Overlay pushen
    if (!window.confirm(`Karte "${mapName}" über Geoserver nach Traccar pushen?`)) return;
    try {
      await apiService.saveToGeoserver(mapId);
      alert('Funktion wird noch implementiert: Karte wird über Geoserver nach Traccar als Server Overlay übertragen');
    } catch (err) {
      alert('Fehler beim Pushen nach Traccar');
    }
  };

  const getShareStatusIcon = (status) => {
    switch (status) {
      case 'Öffentlich': return <Globe size={18} className="text-green-600" />;
      case 'Privat': return <Lock size={18} className="text-red-600" />;
      case 'Mit Link': return <Link2 size={18} className="text-yellow-600" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-gray-700 font-medium text-lg">Lade Karten...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 max-w-2xl">
          <AlertCircle size={48} className="text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-red-800 text-center mb-3">Fehler beim Laden der Karten</h3>
          <p className="text-red-700 text-center mb-4">{error}</p>
          <div className="bg-white p-4 rounded-lg mb-4 text-left">
            <p className="font-semibold text-gray-800 mb-2">Mögliche Ursachen:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>uMap Datenbank-Credentials nicht konfiguriert</li>
              <li>Datenbankverbindung fehlgeschlagen</li>
              <li>Keine Berechtigung auf uMap-Datenbank</li>
            </ul>
          </div>
          <div className="flex gap-3">
            <button onClick={loadMaps} className="flex-1 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">
              Erneut versuchen
            </button>
            <a href="https://gis.eizes.com/admin/settings_app/settings/" target="_blank" rel="noopener noreferrer" className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-center">
              Settings prüfen
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (maps.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center bg-white rounded-2xl p-12 shadow-lg border border-gray-200 max-w-md">
          <MapIcon size={64} className="text-gray-400 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-gray-800 mb-3">Keine Karten gefunden</h3>
          <p className="text-gray-600 mb-4">Sie haben noch keine uMap-Karten erstellt.</p>
          <a href="https://map.eizes.com" target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
            uMap öffnen
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Meine uMap-Karten</h2>
        <p className="text-gray-600">{maps.length} {maps.length === 1 ? 'Karte' : 'Karten'} gefunden</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {maps.map((map) => (
          <div key={map.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-bold text-white pr-4 line-clamp-2">{map.name}</h3>
                <div className="flex-shrink-0 bg-white bg-opacity-20 rounded-lg p-2">
                  <MapIcon size={24} className="text-white" />
                </div>
              </div>
            </div>

            <div className="p-5">
              {map.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{map.description}</p>
              )}

              <div className="space-y-3 mb-5">
                <div className="flex items-center gap-2 text-sm">
                  {getShareStatusIcon(map.share_status)}
                  <span className="text-gray-700 font-medium">{map.share_status}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Server size={16} />
                  <span>{map.feature_count} Feature{map.feature_count !== 1 ? 's' : ''}</span>
                </div>

                {map.modified_at && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={16} />
                    <span>Zuletzt: {new Date(map.modified_at).toLocaleDateString('de-DE')}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <a
                  href={map.view_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Eye size={18} />
                  Ansehen
                </a>
                <button
                  onClick={() => handleSaveToGeoserver(map.id, map.name)}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  title="Über Geoserver nach Traccar pushen"
                >
                  → Traccar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SettingsContent = ({ service, data, onSave }) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(data);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [validatingWorkspace, setValidatingWorkspace] = useState(false);
  const [workspaceValidation, setWorkspaceValidation] = useState(null);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleFieldChange = (path, value) => {
    setFormData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      let current = newData;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newData;
    });
    
    const fieldKey = path.join('.');
    if (fieldErrors[fieldKey]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  const handleValidateWorkspace = async () => {
    const dbData = formData.database || {};
    if (!dbData.workspace || !dbData.database || !dbData.user) {
      alert('Bitte füllen Sie zuerst alle Datenbankfelder aus');
      return;
    }

    setValidatingWorkspace(true);
    setWorkspaceValidation(null);
    
    try {
      const result = await apiService.validateWorkspace({
        workspace: dbData.workspace,
        db_host: dbData.host || 'localhost',
        db_port: parseInt(dbData.port) || 5432,
        db_name: dbData.database,
        db_user: dbData.user,
        db_password: dbData.password || ''
      });
      
      setWorkspaceValidation(result);
      
      if (!result.exists) {
        setFieldErrors(prev => ({
          ...prev,
          'database.workspace': result.message
        }));
      } else {
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors['database.workspace'];
          return newErrors;
        });
      }
    } catch (err) {
      setWorkspaceValidation({
        exists: false,
        message: 'Fehler bei der Validierung: ' + err.message,
        workspace: dbData.workspace
      });
    } finally {
      setValidatingWorkspace(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setFieldErrors({});
    
    try {
      await onSave(service, formData);
      setEditMode(false);
      setWorkspaceValidation(null);
    } catch (err) {
      console.error('Save error:', err);
      
      // Behandle Workspace-spezifische Fehler
      if (err.detail && err.detail.field === 'workspace') {
        setFieldErrors({ 'database.workspace': err.detail.message });
        setError('Workspace-Validierung fehlgeschlagen');
      } else {
        setError(err.detail?.message || err.message || 'Fehler beim Speichern');
      }
    } finally {
      setSaving(false);
    }
  };

  const renderField = (key, value, path = []) => {
    const currentPath = [...path, key];
    const fieldKey = currentPath.join('.');
    const hasError = fieldErrors[fieldKey];
    
    if (typeof value === 'object' && value !== null) {
      return (
        <div key={key} className="mb-8 pb-6 border-b-2 border-gray-100 last:border-0">
          <h4 className="font-bold text-gray-800 mb-4 capitalize text-lg flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            {key === 'auth' ? 'Authentifizierung' : key}
          </h4>
          <div className="ml-5 space-y-4">
            {Object.entries(value).map(([k, v]) => renderField(k, v, currentPath))}
          </div>
        </div>
      );
    }
    
    // WICHTIG: Token-Feld für Traccar
    const isToken = service === 'traccar' && key === 'token' && path.includes('auth');
    const isPassword = key.toLowerCase().includes('password');
    
    // SPEZIALBEHANDLUNG: Workspace-Feld für Geoserver
    const isWorkspaceField = service === 'geoserver' && key === 'workspace' && path.includes('database');
    
    // Spezielle Behandlung für Token-Felder
    if (isToken) {
      return (
        <TokenField 
          key={key} 
          label="API Token" 
          value={value} 
          disabled={!editMode} 
          onChange={(e) => handleFieldChange(currentPath, e.target.value)} 
        />
      );
    }
    
    if (isPassword) {
      return (
        <PasswordField 
          key={key} 
          label={key.charAt(0).toUpperCase() + key.slice(1)} 
          value={value} 
          disabled={!editMode} 
          onChange={(e) => handleFieldChange(currentPath, e.target.value)} 
        />
      );
    }
    
    return (
      <div key={key} className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2 capitalize">
          {key}
          {isWorkspaceField && <span className="text-xs text-gray-500 ml-2">(Schema in der Geoserver-Datenbank)</span>}
        </label>
        
        <div className={isWorkspaceField && editMode ? "flex gap-2" : ""}>
          <input
            type="text"
            value={value || ''}
            disabled={!editMode}
            onChange={(e) => handleFieldChange(currentPath, e.target.value)}
            className={`${isWorkspaceField && editMode ? 'flex-1' : 'w-full'} px-4 py-3 border-2 rounded-lg text-base transition-all focus:outline-none focus:ring-2 ${
              hasError 
                ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100' 
                : editMode 
                  ? 'border-blue-200 bg-white hover:border-blue-300 focus:border-blue-400 focus:ring-blue-100' 
                  : 'border-gray-200 bg-gray-50 text-gray-600'
            }`}
          />
          
          {/* PRÜFEN-BUTTON für Workspace */}
          {isWorkspaceField && editMode && (
            <button
              type="button"
              onClick={handleValidateWorkspace}
              disabled={validatingWorkspace}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-medium disabled:opacity-50 whitespace-nowrap"
            >
              {validatingWorkspace ? 'Prüfe...' : 'Prüfen'}
            </button>
          )}
        </div>
        
        {/* Fehleranzeige für Workspace */}
        {hasError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{fieldErrors[fieldKey]}</p>
          </div>
        )}
        
        {/* Erfolgsanzeige für Workspace */}
        {isWorkspaceField && workspaceValidation && workspaceValidation.exists && !hasError && (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-800">{workspaceValidation.message}</p>
          </div>
        )}
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
                  <button onClick={() => { setEditMode(false); setFormData(data); setError(null); setFieldErrors({}); setWorkspaceValidation(null); }} className="px-6 py-2.5 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all font-medium" disabled={saving}>Abbrechen</button>
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
  const [openMenus, setOpenMenus] = useState({ einstellungen: false });
  const [selectedView, setSelectedView] = useState(null);
  const [settingsData, setSettingsData] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setSettingsLoading(true);
      apiService.fetchSettings().then(data => {
        setSettingsData(data);
        setSettingsLoading(false);
      }).catch(() => {
        setSettingsLoading(false);
      });
    }
  }, [user]);

  const toggleMenu = (key) => setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  
  const selectView = (view) => {
    setSelectedView(view);
    if (view === 'umap') {
      setOpenMenus({ einstellungen: false });
    }
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
          <button onClick={() => window.location.href = `${API_BASE_URL}/auth/login`} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Neu anmelden</button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
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
              label="uMap" 
              icon={MapIcon} 
              level={0} 
              isActive={selectedView === 'umap'} 
              onClick={() => selectView('umap')} 
              hasChildren={false} 
            />
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
                <MenuItem label="Geoserver" icon={Server} level={1} isActive={selectedView === 'geoserver'} onClick={() => selectView('geoserver')} hasChildren={false} />
                <MenuItem label="uMap Settings" icon={Server} level={1} isActive={selectedView === 'umap-settings'} onClick={() => selectView('umap-settings')} hasChildren={false} />
                <MenuItem label="Traccar" icon={Server} level={1} isActive={selectedView === 'traccar'} onClick={() => selectView('traccar')} hasChildren={false} />
              </>
            )}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-10 bg-gradient-to-br from-gray-50 to-gray-100">
          {selectedView === 'umap' ? (
            <UMapMapsView />
          ) : settingsLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-gray-700 font-medium text-lg">Lade Einstellungen...</p>
              </div>
            </div>
          ) : selectedView === 'umap-settings' && settingsData['umap'] ? (
            <SettingsContent service="umap" data={settingsData['umap']} onSave={handleSaveSettings} />
          ) : selectedView && selectedView !== 'umap' && settingsData[selectedView] ? (
            <SettingsContent service={selectedView} data={settingsData[selectedView]} onSave={handleSaveSettings} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center bg-white rounded-2xl p-12 shadow-lg border border-gray-200">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Settings size={40} className="text-blue-600" />
                </div>
                <p className="text-xl text-gray-700 font-semibold">Wählen Sie eine Ansicht</p>
                <p className="text-gray-500 mt-2">Klicken Sie links auf einen Menüpunkt</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

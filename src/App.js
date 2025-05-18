import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

// --- Helper Functions & Constants ---
const TAG_OPTIONS = {
    NONE: null,
    HIGH_PRIORITY: 'high_priority',
    NEEDS_REVIEW: 'needs_review',
    WAITING_FOR_DATA: 'waiting_for_data',
};

const TAG_LABELS = {
    [TAG_OPTIONS.HIGH_PRIORITY]: 'High Priority',
    [TAG_OPTIONS.NEEDS_REVIEW]: 'Needs Review',
    [TAG_OPTIONS.WAITING_FOR_DATA]: 'Waiting for Data',
};

const TAG_COLORS = {
    [TAG_OPTIONS.HIGH_PRIORITY]: 'red',
    [TAG_OPTIONS.NEEDS_REVIEW]: 'yellow',
    [TAG_OPTIONS.WAITING_FOR_DATA]: 'blue',
};

// --- GA4 Integration Constants ---
const GA4_CLIENT_ID = '241533256907-9nedrhlmjb5sefoqkag1te36ftrqenal.apps.googleusercontent.com';
const GA4_REDIRECT_URI = window.location.origin + '/oauth2callback';
const GA4_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const GA4_PROPERTY_ID = '376552340'; // Replace with your actual GA4 Property ID
const GA4_METRICS_OPTIONS = [
    { label: 'Sessions', value: 'sessions' },
    { label: 'Event Count', value: 'eventCount' },
    { label: 'Screen Page Views', value: 'screenPageViews' },
    { label: 'Total Users', value: 'totalUsers' },
    { label: 'New Users', value: 'newUsers' },
    { label: 'Conversions', value: 'conversions' },
];

// Modal Component
const Modal = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button onClick={onClose} className="modal-close-button">&times;</button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

// Context Menu Component
const ContextMenu = ({ x, y, options, onClose }) => {
    const menuRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };
        if (options) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            if (options) {
                document.removeEventListener('mousedown', handleClickOutside);
            }
        };
    }, [onClose, options]);
    if (!options) return null;
    return (
        <ul className="context-menu" style={{ top: y, left: x }} ref={menuRef}>
            {options.map(option => (
                <li key={option.label} onClick={() => { option.action(); onClose(); }}>
                    {option.label}
                </li>
            ))}
        </ul>
    );
};

// Trend Snapshot Chart Component
const TrendSnapshotChart = ({ kpi }) => {
    if (!kpi || !kpi.post_entries || kpi.post_entries.length === 0) {
        return <p className="chart-no-data-message">No post-change data to display trend for {kpi.name}.</p>;
    }
    const data = kpi.post_entries.map((entry, index) => ({
        name: entry.title || entry.date_added || `Entry ${index + 1}`,
        value: parseFloat(entry.value),
        pre_value: parseFloat(kpi.pre_value)
    }));

    return (
        <div className="trend-snapshot-chart-container">
            <h4>Trend for "{kpi.name}"</h4>
            <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip 
                        formatter={(value, name, props) => {
                            if (name === "Pre-Change Value") return [props.payload.pre_value, name];
                            return [value, "Post-Change Value"];
                        }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 6 }} name="Post-Change Value" />
                    {typeof kpi.pre_value === 'number' && !isNaN(parseFloat(kpi.pre_value)) && (
                        <ReferenceLine y={parseFloat(kpi.pre_value)} label={{ value: `Pre: ${kpi.pre_value}`, position: 'insideTopRight', fill: '#82ca9d', fontSize: 10 }} stroke="#82ca9d" strokeDasharray="5 5" />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};


function App() {
    // Existing State
    const [isNewEvaluationModalOpen, setIsNewEvaluationModalOpen] = useState(false);
    const [isEditKpiModalOpen, setIsEditKpiModalOpen] = useState(false);
    const [editingFeature, setEditingFeature] = useState(null);
    const [editingKpi, setEditingKpi] = useState(null);
    const [newPostValue, setNewPostValue] = useState('');
    const [newPostValueTitle, setNewPostValueTitle] = useState(''); // Added for Post-Change Title
    const [newPostValueNote, setNewPostValueNote] = useState('');
    const [featureTitle, setFeatureTitle] = useState('');
    const [featureType, setFeatureType] = useState('');
    const [featureDescription, setFeatureDescription] = useState('');
    const [dateOfChange, setDateOfChange] = useState('');
    const [currentKpis, setCurrentKpis] = useState([]);
    const [mainKpiId, setMainKpiId] = useState(null);
    const [notes, setNotes] = useState('');
    const [evaluations, setEvaluations] = useState([]);
    const [nextFeatureId, setNextFeatureId] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'dateOfChange', direction: 'descending' });
    const [expandedRows, setExpandedRows] = useState({});
    const [contextMenu, setContextMenu] = useState(null);
    const [activeTab, setActiveTab] = useState('active');
    const [notification, setNotification] = useState('');

    // GA4 Integration State
    const [ga4AccessToken, setGa4AccessToken] = useState(localStorage.getItem('ga4AccessToken'));
    const [ga4UserEmail, setGa4UserEmail] = useState(localStorage.getItem('ga4UserEmail'));
    const [isGa4Fetching, setIsGa4Fetching] = useState(false);
    const [ga4Error, setGa4Error] = useState('');
    const [isGa4FetchModalOpen, setIsGa4FetchModalOpen] = useState(false);
    const [ga4FetchTarget, setGa4FetchTarget] = useState(null); 
    const [ga4SelectedMetric, setGa4SelectedMetric] = useState(GA4_METRICS_OPTIONS[0].value);
    const [ga4StartDate, setGa4StartDate] = useState('');
    const [ga4EndDate, setGa4EndDate] = useState('');

    const storageKey = 'assesslyEvaluations_Phase7_LogoKPIFix'; // Updated storage key

    const loadEvaluations = useCallback(() => {
        const storedEvaluations = localStorage.getItem(storageKey);
        if (storedEvaluations) {
            const parsedEvaluations = JSON.parse(storedEvaluations);
            setEvaluations(parsedEvaluations.map(ev => ({
                ...ev,
                kpis: ev.kpis.map(kpi => ({
                     ...kpi, 
                     post_entries: (kpi.post_entries || []).map(pe => ({...pe, title: pe.title || ''})) // Ensure title exists
                })),
                isArchived: ev.isArchived || false,
                tag: ev.tag || TAG_OPTIONS.NONE,
            })));
            if (parsedEvaluations.length > 0) {
                setNextFeatureId(Math.max(...parsedEvaluations.map(e => e.feature_id), 0) + 1);
            } else {
                setNextFeatureId(1);
            }
        }
    }, []);

    useEffect(() => { loadEvaluations(); }, [loadEvaluations]);

    useEffect(() => {
        const successMessage = localStorage.getItem('ga4AuthSuccess');
        if (successMessage) {
            setNotification(successMessage);
            localStorage.removeItem('ga4AuthSuccess');
            setGa4AccessToken(localStorage.getItem('ga4AccessToken'));
            setGa4UserEmail(localStorage.getItem('ga4UserEmail'));
            setTimeout(() => setNotification(''), 5000);
        }
        const errorMessage = localStorage.getItem('ga4AuthError');
        if (errorMessage) {
            setNotification(errorMessage);
            localStorage.removeItem('ga4AuthError');
            setTimeout(() => setNotification(''), 5000);
        }
    }, []);

    const handleGa4Connect = () => {
        const oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
        const params = {
            client_id: GA4_CLIENT_ID,
            redirect_uri: GA4_REDIRECT_URI,
            response_type: 'code',
            scope: GA4_SCOPE,
            access_type: 'offline', 
            prompt: 'consent'
        };
        const queryString = new URLSearchParams(params).toString();
        window.location.href = `${oauth2Endpoint}?${queryString}`;
    };

    const handleGa4Disconnect = () => {
        setGa4AccessToken(null);
        setGa4UserEmail(null);
        localStorage.removeItem('ga4AccessToken');
        localStorage.removeItem('ga4UserEmail');
        setGa4Error('');
        setNotification('Disconnected from Google Analytics.');
        setTimeout(() => setNotification(''), 3000);
    };

    const openGa4FetchModal = async (type, kpiId, featureId = null) => {
        if (!ga4AccessToken) {
            setNotification('Please connect to Google Analytics first.');
            setTimeout(() => setNotification(''), 3000);
            return;
        }
        setGa4FetchTarget({ type, kpiId, featureId });
        setGa4SelectedMetric(GA4_METRICS_OPTIONS[0].value);
        setGa4StartDate('');
        setGa4EndDate('');
        setGa4Error('');

        if (type === 'pre') {
            const kpi = currentKpis.find(k => k.id === kpiId);
            if (dateOfChange && kpi && kpi.pre_duration) {
                try {
                    const endDatePre = new Date(dateOfChange);
                    endDatePre.setDate(endDatePre.getDate() - 1);
                    const startDatePre = new Date(endDatePre);
                    startDatePre.setDate(startDatePre.getDate() - parseInt(kpi.pre_duration, 10) + 1);
                    setGa4StartDate(startDatePre.toISOString().split('T')[0]);
                    setGa4EndDate(endDatePre.toISOString().split('T')[0]);
                } catch (e) {
                    setNotification('Invalid Date of Change or Pre-Duration for automatic date calculation.');
                    setTimeout(() => setNotification(''), 3000);
                    return;
                }
            } else {
                setNotification('Please set Date of Change and Pre-Duration for the KPI first to auto-calculate dates.');
                setTimeout(() => setNotification(''), 3000);
            }
        }
        try {
        const res = await fetch('/api/availableMetrics');
        const data = await res.json();
        setGa4AvailableMetrics(data.metrics || []);
    } catch (err) {
        console.error("Error loading available GA4 metrics:", err);
        setGa4AvailableMetrics(GA4_METRICS_OPTIONS); // fallback if needed
    }

    setIsGa4FetchModalOpen(true);
    };

    const handleFetchFromGa4 = async () => {
        if (!ga4FetchTarget || !ga4SelectedMetric || !ga4StartDate || !ga4EndDate) {
            setGa4Error('Please select a metric and a valid date range.');
            return;
        }
        setIsGa4Fetching(true);
        setGa4Error('');
        try {
            const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ga4AccessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dateRanges: [{ startDate: ga4StartDate, endDate: ga4EndDate }],
                    metrics: [{ name: ga4SelectedMetric }],
                    dimensions: []
                })
            });
            const data = await response.json();
            if (!response.ok) {
                const errorDetail = data.error?.message || `GA4 API Error: ${response.status}`;
                if (response.status === 401 || response.status === 403) {
                     setGa4Error(`Authentication error: ${errorDetail}. Please try disconnecting and reconnecting GA4.`);
                } else {
                    setGa4Error(`Failed to fetch: ${errorDetail}`);
                }
                throw new Error(errorDetail);
            }

            let fetchedValue = '0'; 
            if (data.rows && data.rows.length > 0 && data.rows[0].metricValues && data.rows[0].metricValues.length > 0) {
                fetchedValue = data.rows[0].metricValues[0].value;
            } else {
                setGa4Error('No data found in GA4 for the selected period/metric.');
            }

            if (ga4FetchTarget.type === 'pre') {
                setCurrentKpis(currentKpis.map(kpi => 
                    kpi.id === ga4FetchTarget.kpiId ? { ...kpi, pre_value: fetchedValue } : kpi
                ));
            } else if (ga4FetchTarget.type === 'post') {
                setNewPostValue(fetchedValue);
            }
            setIsGa4FetchModalOpen(false);
            if(!ga4Error || (ga4Error && fetchedValue !== '0')) {
                setNotification(`Fetched ${ga4SelectedMetric}: ${fetchedValue}`);
                setTimeout(() => setNotification(''), 3000);
            }

        } catch (error) {
            console.error('Error fetching from GA4:', error);
            if (!ga4Error) setGa4Error('An unexpected error occurred while fetching GA4 data.');
        } finally {
            setIsGa4Fetching(false);
        }
    };

    const saveEvaluations = (updatedEvaluations) => {
        localStorage.setItem(storageKey, JSON.stringify(updatedEvaluations));
        setEvaluations(updatedEvaluations.map(ev => ({ 
            ...ev, 
            kpis: ev.kpis.map(kpi => ({ 
                ...kpi, 
                post_entries: (kpi.post_entries || []).map(pe => ({...pe, title: pe.title || ''}))
            })),
            isArchived: ev.isArchived || false,
            tag: ev.tag || TAG_OPTIONS.NONE,
        })));
    };

    const handleOpenNewEvaluationModal = () => {
        setEditingFeature(null);
        setFeatureTitle('');
        setFeatureType('');
        setFeatureDescription('');
        setDateOfChange('');
        setCurrentKpis([]);
        setMainKpiId(null);
        setNotes('');
        setGa4Error('');
        setIsNewEvaluationModalOpen(true);
    };

    const handleAddKpi = () => {
        if (currentKpis.length >= 3) {
            alert("You can add a maximum of 3 KPIs.");
            return;
        }
        const newKpiId = Date.now();
        const newKpi = { id: newKpiId, name: '', pre_value: '', pre_duration: '30', post_entries: [] };
        const updatedKpis = [...currentKpis, newKpi];
        setCurrentKpis(updatedKpis);
        if (updatedKpis.length === 1 || !mainKpiId) { // Set first KPI as main, or if no main KPI is set
            setMainKpiId(newKpiId);
        }
    };

    const handleKpiChange = (id, field, value) => {
        setCurrentKpis(currentKpis.map(kpi => kpi.id === id ? { ...kpi, [field]: value } : kpi));
    };

    const handleRemoveKpi = (id) => {
        const updatedKpis = currentKpis.filter(kpi => kpi.id !== id);
        setCurrentKpis(updatedKpis);
        if (mainKpiId === id) {
            setMainKpiId(updatedKpis.length > 0 ? updatedKpis[0].id : null);
        }
    };

    const handleSaveEvaluation = () => {
        if (!featureTitle || !featureType || !dateOfChange || currentKpis.length === 0) {
            alert("Please fill in all required fields: Title, Type, Date of Change, and at least one KPI.");
            return;
        }
        if (!mainKpiId && currentKpis.length > 0) {
            alert("Please designate one KPI as the Main KPI.");
            return;
        }

        const newEvaluation = {
            feature_id: editingFeature ? editingFeature.feature_id : nextFeatureId,
            title: featureTitle,
            type: featureType,
            description: featureDescription,
            date_of_change: dateOfChange,
            kpis: currentKpis.map(kpi => ({...kpi, is_main: kpi.id === mainKpiId, post_entries: kpi.post_entries || []})),
            notes: { content: notes, timestamp: new Date().toISOString() },
            isArchived: editingFeature ? editingFeature.isArchived : false,
            tag: editingFeature ? editingFeature.tag : TAG_OPTIONS.NONE,
        };

        let updatedEvaluations;
        if (editingFeature) {
            updatedEvaluations = evaluations.map(ev => ev.feature_id === editingFeature.feature_id ? newEvaluation : ev);
        } else {
            updatedEvaluations = [...evaluations, newEvaluation];
            setNextFeatureId(nextFeatureId + 1);
        }
        saveEvaluations(updatedEvaluations);
        setIsNewEvaluationModalOpen(false);
        setEditingFeature(null);
    };

    const handleEditEvaluation = (feature) => {
        setEditingFeature(feature);
        setFeatureTitle(feature.title);
        setFeatureType(feature.type);
        setFeatureDescription(feature.description);
        setDateOfChange(feature.date_of_change);
        setCurrentKpis(feature.kpis.map(kpi => ({...kpi, post_entries: kpi.post_entries || [] })));
        const currentMainKpi = feature.kpis.find(kpi => kpi.is_main);
        setMainKpiId(currentMainKpi ? currentMainKpi.id : (feature.kpis.length > 0 ? feature.kpis[0].id : null) );
        setNotes(feature.notes ? feature.notes.content : '');
        setGa4Error('');
        setIsNewEvaluationModalOpen(true);
    };

    const handleDeleteEvaluation = (featureId) => {
        if (window.confirm("Are you sure you want to permanently delete this evaluation?")) {
            const updatedEvaluations = evaluations.filter(ev => ev.feature_id !== featureId);
            saveEvaluations(updatedEvaluations);
        }
    };

    const handleArchiveEvaluation = (featureId) => {
        const updatedEvaluations = evaluations.map(ev => 
            ev.feature_id === featureId ? { ...ev, isArchived: true } : ev
        );
        saveEvaluations(updatedEvaluations);
    };

    const handleUnarchiveEvaluation = (featureId) => {
        const updatedEvaluations = evaluations.map(ev => 
            ev.feature_id === featureId ? { ...ev, isArchived: false } : ev
        );
        saveEvaluations(updatedEvaluations);
    };

    const handleOpenEditKpiModal = (featureId, kpiId) => {
        const feature = evaluations.find(ev => ev.feature_id === featureId);
        const kpi = feature.kpis.find(k => k.id === kpiId);
        setEditingFeature(feature);
        setEditingKpi(kpi);
        setNewPostValue('');
        setNewPostValueTitle(''); // Reset for new entry
        setNewPostValueNote('');
        setGa4Error('');
        setIsEditKpiModalOpen(true);
    };

    const handleSaveKpiPostEntry = () => {
        if (!newPostValue) {
            alert("Please enter a post-change value.");
            return;
        }
        const updatedEvaluations = evaluations.map(ev => {
            if (ev.feature_id === editingFeature.feature_id) {
                return {
                    ...ev,
                    kpis: ev.kpis.map(kpi => {
                        if (kpi.id === editingKpi.id) {
                            return {
                                ...kpi,
                                post_entries: [
                                    ...(kpi.post_entries || []),
                                    {
                                        value: newPostValue,
                                        title: newPostValueTitle, // Save title
                                        note: newPostValueNote,
                                        date_added: new Date().toISOString()
                                    }
                                ].sort((a, b) => new Date(a.date_added) - new Date(b.date_added)) // Sort by date
                            };
                        }
                        return kpi;
                    })
                };
            }
            return ev;
        });
        saveEvaluations(updatedEvaluations);
        setIsEditKpiModalOpen(false);
        setEditingKpi(null);
    };

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
            // Optional: third click could clear sort or revert to default
            // For now, it will just toggle back to ascending
            direction = 'ascending'; 
        }
        setSortConfig({ key, direction });
    };

    const sortedEvaluations = React.useMemo(() => {
        let sortableItems = [...evaluations.filter(ev => ev.isArchived === (activeTab === 'archived'))];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [evaluations, sortConfig, activeTab]);

    const toggleRowExpansion = (featureId) => {
        setExpandedRows(prev => ({ ...prev, [featureId]: !prev[featureId] }));
    };

    const handleContextMenu = (event, feature) => {
        event.preventDefault();
        setContextMenu(null); // Close any existing menu first
        const options = [
            { label: expandedRows[feature.feature_id] ? 'Collapse Details' : 'Expand Details', action: () => toggleRowExpansion(feature.feature_id) },
            { label: 'Edit Evaluation', action: () => handleEditEvaluation(feature) },
        ];

        if (activeTab === 'active') {
            options.push({ label: 'Archive Evaluation', action: () => handleArchiveEvaluation(feature.feature_id) });
            Object.keys(TAG_OPTIONS).forEach(tagKey => {
                if (TAG_OPTIONS[tagKey]) { // Exclude NONE
                    options.push({ 
                        label: `Tag: ${TAG_LABELS[TAG_OPTIONS[tagKey]]}${feature.tag === TAG_OPTIONS[tagKey] ? ' (Remove)' : ''}`,
                        action: () => handleTagEvaluation(feature.feature_id, feature.tag === TAG_OPTIONS[tagKey] ? TAG_OPTIONS.NONE : TAG_OPTIONS[tagKey])
                    });
                }
            });
        } else { // Archived tab
            options.push({ label: 'Unarchive Evaluation', action: () => handleUnarchiveEvaluation(feature.feature_id) });
            options.push({ label: 'Delete Permanently', action: () => handleDeleteEvaluation(feature.feature_id) });
        }
        
        setContextMenu({ x: event.clientX, y: event.clientY, options });
    };

    const handleTagEvaluation = (featureId, tag) => {
        const updatedEvaluations = evaluations.map(ev => 
            ev.feature_id === featureId ? { ...ev, tag: tag } : ev
        );
        saveEvaluations(updatedEvaluations);
    };

    const getResultIcon = (feature) => {
        const mainKpi = feature.kpis.find(kpi => kpi.is_main);
        if (!mainKpi || !mainKpi.post_entries || mainKpi.post_entries.length === 0) return <span className="result-icon result-no-data">–</span>;
        
        const latestEntry = mainKpi.post_entries[mainKpi.post_entries.length - 1];
        const preValue = parseFloat(mainKpi.pre_value);
        const postValue = parseFloat(latestEntry.value);

        if (isNaN(preValue) || isNaN(postValue)) return <span className="result-icon result-no-data">–</span>;
        if (postValue > preValue) return <span className="result-icon result-improved">↑</span>;
        if (postValue < preValue) return <span className="result-icon result-worsened">↓</span>;
        return <span className="result-icon result-no-change">=</span>;
    };

    const getSortIndicator = (columnKey) => {
        if (sortConfig.key === columnKey) {
            return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
        }
        return ' ↕'; // Neutral indicator for sortable columns
    };

    return (
        <div className="App">
            <header className="App-header">
                <div className="header-title-logo">
                    <img src="/assessly-logo.png" alt="Assessly Logo" className="app-logo" /> 
                    <h1>Feature Evaluation Dashboard</h1>
                </div>
                {/* Actions can go here if needed */}
            </header>

            {notification && <div className="notification-banner">{notification}</div>}

            <div className="ga4-status-bar">
                {ga4AccessToken ? (
                    <>
                        <span>Connected to GA4 as: {ga4UserEmail || 'User'}</span>
                        <button onClick={handleGa4Disconnect} className="ga4-button ga4-disconnect">Disconnect GA4</button>
                    </>
                ) : (
                    <button onClick={handleGa4Connect} className="ga4-button ga4-connect">Connect to Google Analytics</button>
                )}
            </div>

            <div className="tabs">
                <button onClick={() => setActiveTab('active')} className={activeTab === 'active' ? 'active' : ''}>Active Evaluations</button>
                <button onClick={() => setActiveTab('archived')} className={activeTab === 'archived' ? 'active' : ''}>Archived Evaluations</button>
            </div>

            {activeTab === 'active' && (
                <div className="table-actions">
                    <button onClick={handleOpenNewEvaluationModal} className="new-eval-button">+ New Evaluation</button>
                </div>
            )}

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('date_of_change')} title="Sort by Date of Change">Date of Change{getSortIndicator('date_of_change')}</th>
                            <th onClick={() => requestSort('title')} title="Sort by Title">Title{getSortIndicator('title')}</th>
                            <th>Feature Type</th>
                            <th className="description-col">Description</th>
                            <th className="results-col">Results (Main KPI)</th>
                            <th className="notes-col">Notes/Learnings</th>
                            {activeTab === 'active' && <th className="tags-col">Tags</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedEvaluations.map(feature => (
                            <React.Fragment key={feature.feature_id}>
                                <tr onContextMenu={(e) => handleContextMenu(e, feature)} className={`tag-row-${feature.tag ? TAG_COLORS[feature.tag] : ''}`}>
                                    <td>{feature.date_of_change}</td>
                                    <td>{feature.title}</td>
                                    <td>{feature.type}</td>
                                    <td className="description-col">{feature.description}</td>
                                    <td className="results-col">{getResultIcon(feature)}</td>
                                    <td className="notes-col">{feature.notes ? feature.notes.content : ''}</td>
                                    {activeTab === 'active' && (
                                        <td className="tags-col">
                                            {feature.tag && TAG_LABELS[feature.tag] && (
                                                <span className={`tag-chip tag-${TAG_COLORS[feature.tag]}`}>{TAG_LABELS[feature.tag]}</span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                                {expandedRows[feature.feature_id] && (
                                    <tr className="expanded-row">
                                        <td colSpan={activeTab === 'active' ? 7 : 6}>
                                            <div className="expanded-content">
                                                <h4>KPI Details for "{feature.title}"</h4>
                                                {feature.kpis.map(kpi => (
                                                    <div key={kpi.id} className={`kpi-details-expanded ${kpi.is_main ? 'main-kpi-expanded' : ''}`}>
                                                        <h5>
                                                            {kpi.name} {kpi.is_main && <span className="main-kpi-tag">(Main KPI)</span>}
                                                        </h5>
                                                        <p>Pre-Change Value: {kpi.pre_value} (Duration: {kpi.pre_duration} days)</p>
                                                        <h6>Post-Change Entries:</h6>
                                                        {kpi.post_entries && kpi.post_entries.length > 0 ? (
                                                            kpi.post_entries.map((entry, index) => (
                                                                <div key={index} className="post-entry-detail">
                                                                    <p><strong>{entry.title || `Entry ${index + 1}`} (Added: {new Date(entry.date_added).toLocaleDateString()})</strong></p>
                                                                    <p>Value: {entry.value}</p>
                                                                    {entry.note && <p>Note: {entry.note}</p>}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p>No post-change entries yet.</p>
                                                        )}
                                                        {activeTab === 'active' && (
                                                            <button onClick={() => handleOpenEditKpiModal(feature.feature_id, kpi.id)} className="add-post-value-button-small">+ Add Post-Change Value</button>
                                                        )}
                                                        <TrendSnapshotChart kpi={kpi} />
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                        {sortedEvaluations.length === 0 && (
                            <tr>
                                <td colSpan={activeTab === 'active' ? 7 : 6} style={{ textAlign: 'center', padding: '20px' }}>
                                    No {activeTab} evaluations found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* New Evaluation / Edit Evaluation Modal */}
            <Modal isOpen={isNewEvaluationModalOpen} onClose={() => setIsNewEvaluationModalOpen(false)} title={editingFeature ? "Edit Feature Evaluation" : "New Feature Evaluation"}>
                <form onSubmit={(e) => { e.preventDefault(); handleSaveEvaluation(); }}>
                    <div className="form-group">
                        <label htmlFor="featureTitle">Feature Title*</label>
                        <input type="text" id="featureTitle" value={featureTitle} onChange={(e) => setFeatureTitle(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="featureType">Feature Type*</label>
                        <input type="text" id="featureType" value={featureType} onChange={(e) => setFeatureType(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="featureDescription">Description</label>
                        <textarea id="featureDescription" value={featureDescription} onChange={(e) => setFeatureDescription(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="dateOfChange">Date of Change*</label>
                        <input type="date" id="dateOfChange" value={dateOfChange} onChange={(e) => setDateOfChange(e.target.value)} required />
                    </div>

                    <h4>KPIs (Key Performance Indicators)*</h4>
                    {currentKpis.map((kpi, index) => (
                        <div key={kpi.id} className={`kpi-input-block ${kpi.id === mainKpiId ? 'main-kpi-highlight' : ''}`}>
                            <div className="kpi-main-selector">
                                <input 
                                    type="radio" 
                                    id={`mainKpi-${kpi.id}`} 
                                    name="mainKpiSelector" 
                                    checked={kpi.id === mainKpiId} 
                                    onChange={() => setMainKpiId(kpi.id)} 
                                />
                                <label htmlFor={`mainKpi-${kpi.id}`} className="main-kpi-label">Set as Main KPI</label>
                                {currentKpis.length > 1 && (
                                    <button type="button" onClick={() => handleRemoveKpi(kpi.id)} className="remove-kpi-button" title="Remove KPI">&times;</button>
                                )}
                            </div>
                            <div className="form-group">
                                <label htmlFor={`kpiName-${kpi.id}`}>KPI Name*</label>
                                <input type="text" id={`kpiName-${kpi.id}`} value={kpi.name} onChange={(e) => handleKpiChange(kpi.id, 'name', e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor={`kpiPreValue-${kpi.id}`}>Pre-Change Value*</label>
                                <input type="number" step="any" id={`kpiPreValue-${kpi.id}`} value={kpi.pre_value} onChange={(e) => handleKpiChange(kpi.id, 'pre_value', e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor={`kpiPreDuration-${kpi.id}`}>Pre-Change Duration (days)*</label>
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    <input type="number" id={`kpiPreDuration-${kpi.id}`} value={kpi.pre_duration} onChange={(e) => handleKpiChange(kpi.id, 'pre_duration', e.target.value)} required style={{flexGrow: 1}}/>
                                    {ga4AccessToken && <button type="button" onClick={() => openGa4FetchModal('pre', kpi.id)} className="ga4-button-small">Fetch Pre (GA4)</button>}
                                </div>
                            </div>
                        </div>
                    ))}
                    {currentKpis.length < 3 && (
                        <button type="button" onClick={handleAddKpi} className="add-kpi-button">+ Add KPI</button>
                    )}
                    {currentKpis.length === 0 && <p style={{color: 'red', fontSize: '0.9em'}}>Please add at least one KPI.</p>}

                    <div className="form-group" style={{marginTop: '20px'}}>
                        <label htmlFor="notes">Notes / Learnings</label>
                        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                    <button type="submit" className="save-button">{editingFeature ? "Save Changes" : "Create Evaluation"}</button>
                </form>
            </Modal>

            {/* Edit KPI (Add Post-Change Value) Modal */}
            <Modal isOpen={isEditKpiModalOpen} onClose={() => setIsEditKpiModalOpen(false)} title={`Add Post-Change Value for ${editingKpi?.name}`}>
                <form onSubmit={(e) => { e.preventDefault(); handleSaveKpiPostEntry(); }}>
                    <div className="form-group">
                        <label htmlFor="postValueTitle">Title (e.g., After 1 week)</label>
                        <input type="text" id="postValueTitle" value={newPostValueTitle} onChange={(e) => setNewPostValueTitle(e.target.value)} placeholder="e.g. After 1 week, after GA4 pull, etc." />
                    </div>
                    <div className="form-group">
                        <label htmlFor="newPostValue">Post-Change Value*</label>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <input type="number" step="any" id="newPostValue" value={newPostValue} onChange={(e) => setNewPostValue(e.target.value)} required style={{flexGrow: 1}}/>
                            {ga4AccessToken && <button type="button" onClick={() => openGa4FetchModal('post', editingKpi?.id, editingFeature?.feature_id)} className="ga4-button-small">Fetch Post (GA4)</button>}
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="newPostValueNote">Note for this entry</label>
                        <textarea id="newPostValueNote" value={newPostValueNote} onChange={(e) => setNewPostValueNote(e.target.value)} />
                    </div>
                    <button type="submit" className="save-button">Save Post-Change Value</button>
                </form>
            </Modal>

            {/* GA4 Fetch Modal */}
            <Modal isOpen={isGa4FetchModalOpen} onClose={() => setIsGa4FetchModalOpen(false)} title="Fetch Data from Google Analytics 4">
                <div className="form-group">
                    <label htmlFor="ga4Metric">Select Metric:</label>
                    <select id="ga4Metric" value={ga4SelectedMetric} onChange={(e) => setGa4SelectedMetric(e.target.value)}>
                        {GA4_METRICS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="ga4StartDate">Start Date:</label>
                    <input type="date" id="ga4StartDate" value={ga4StartDate} onChange={(e) => setGa4StartDate(e.target.value)} disabled={ga4FetchTarget?.type === 'pre'}/>
                </div>
                <div className="form-group">
                    <label htmlFor="ga4EndDate">End Date:</label>
                    <input type="date" id="ga4EndDate" value={ga4EndDate} onChange={(e) => setGa4EndDate(e.target.value)} disabled={ga4FetchTarget?.type === 'pre'}/>
                </div>
                {ga4Error && <p style={{ color: 'red' }}>{ga4Error}</p>}
                <button onClick={handleFetchFromGa4} disabled={isGa4Fetching} className="save-button">
                    {isGa4Fetching ? 'Fetching...' : 'Fetch Data'}
                </button>
            </Modal>

            {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} options={contextMenu.options} onClose={() => setContextMenu(null)} />}
        </div>
    );
}

export default App;


import React, { useState, useEffect } from 'react';
import { Card, Title, Text, TextInput, Select, SelectItem, Button } from '@tremor/react';
import { doc, setDoc, getDoc } from "firebase/firestore";
import Navigation from '../components/Navigation';
import { db } from "../firebase";

function Config({ darkMode, setDarkMode }) {
    // Sidebar and main content styling
    const sidebarClass = "w-72 bg-white dark:bg-gray-900 p-6 shadow-xl border-r border-gray-200 dark:border-gray-800 fixed h-screen flex flex-col";
    const mainClass = "flex-1 pl-80 p-8 overflow-auto bg-background-light dark:bg-gray-900 transition-colors min-h-screen";

    // Toggle switch (standardized position)
    const Toggle = (
        <label className="flex items-center cursor-pointer select-none">
            <div className="relative">
                <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={() => setDarkMode(!darkMode)}
                    className="sr-only"
                    aria-label="Toggle dark mode"
                />
                <div className="block w-14 h-8 rounded-full bg-gray-300 dark:bg-gray-700 transition-colors"></div>
                <div
                    className={`dot absolute left-1 top-1 w-6 h-6 rounded-full flex items-center justify-center transition transform
                        ${darkMode ? 'translate-x-6 bg-gray-900 text-yellow-400' : 'bg-white text-gray-700'}
                    `}
                >
                    {darkMode ? (
                        // Moon icon
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                        </svg>
                    ) : (
                        // Sun icon
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 15a5 5 0 100-10 5 5 0 000 10zm0 2a7 7 0 110-14 7 7 0 010 14zm0-16a1 1 0 011 1v2a1 1 0 11-2 0V2a1 1 0 011-1zm0 16a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zm8-8a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zm-16 0a1 1 0 011 1H2a1 1 0 110-2h2a1 1 0 011 1zm12.071 5.071a1 1 0 010 1.415l-1.414 1.414a1 1 0 11-1.415-1.415l1.415-1.414a1 1 0 011.414 0zm-10.142 0a1 1 0 010 1.415L4.93 17.9a1 1 0 11-1.415-1.415l1.415-1.414a1 1 0 011.414 0zm10.142-10.142a1 1 0 00-1.415 0L13.9 4.93a1 1 0 101.415 1.415l1.414-1.415a1 1 0 000-1.414zm-10.142 0a1 1 0 00-1.415 0L2.1 4.93A1 1 0 103.515 6.343l1.415-1.415a1 1 0 000-1.414z" />
                        </svg>
                    )}
                </div>
            </div>
            <span className="ml-3 text-base text-gray-700 dark:text-gray-200 font-medium">
                {darkMode ? 'Dark' : 'Light'}
            </span>
        </label>
    );

    // Telegram settings state
    const [telegramBotToken, setTelegramBotToken] = useState('');
    const [telegramChannelId, setTelegramChannelId] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');
    const [editTelegram, setEditTelegram] = useState(false);

    // Email settings state
    const [smtpServer, setSmtpServer] = useState('');
    const [smtpPort, setSmtpPort] = useState('');
    const [emailFrom, setEmailFrom] = useState('');
    const [emailPassword, setEmailPassword] = useState('');
    const [savingEmail, setSavingEmail] = useState(false);
    const [saveEmailMsg, setSaveEmailMsg] = useState('');
    const [editEmail, setEditEmail] = useState(false);

    // AI Configuration state
    const [aiModel, setAiModel] = useState('openai');
    const [aiEndpoint, setAiEndpoint] = useState('https://api.openai.com/v1/chat/completions');
    const [aiApiKey, setAiApiKey] = useState('sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'); // Fake encrypted display
    const [savingAI, setSavingAI] = useState(false);
    const [saveAIMsg, setSaveAIMsg] = useState('');
    const [editAI, setEditAI] = useState(false);

    // Store original values for cancel
    const [originalTelegram, setOriginalTelegram] = useState({});
    const [originalEmail, setOriginalEmail] = useState({});
    const [originalAI, setOriginalAI] = useState({});

    // Load existing settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "config", "system");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setTelegramBotToken(data.telegramBotToken || '');
                    setTelegramChannelId(data.telegramChannelId || '');
                    setSmtpServer(data.smtpServer || '');
                    setSmtpPort(data.smtpPort || '');
                    setEmailFrom(data.emailFrom || '');
                    setEmailPassword(data.emailPassword || '');
                    setOriginalTelegram({
                        telegramBotToken: data.telegramBotToken || '',
                        telegramChannelId: data.telegramChannelId || ''
                    });
                    setOriginalEmail({
                        smtpServer: data.smtpServer || '',
                        smtpPort: data.smtpPort || '',
                        emailFrom: data.emailFrom || '',
                        emailPassword: data.emailPassword || ''
                    });
                    // AI Configuration (always show default values, actual key is in backend)
                    setAiModel(data.aiModel || 'openai');
                    setAiEndpoint(data.aiEndpoint || 'https://api.openai.com/v1/chat/completions');
                    // Always show fake encrypted key, real one is in backend/.env
                    setAiApiKey('sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
                    setOriginalAI({
                        aiModel: data.aiModel || 'openai',
                        aiEndpoint: data.aiEndpoint || 'https://api.openai.com/v1/chat/completions',
                        aiApiKey: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
                    });
                }
            } catch (err) {
                setSaveMsg('Error loading settings: ' + err.message);
            }
        };
        fetchSettings();
    }, []);

    // Save Telegram settings handler
    const handleSaveTelegram = async () => {
        setSaving(true);
        setSaveMsg('');
        
        console.log('🔍 Validating Telegram Settings:', { 
            telegramBotToken: `"${telegramBotToken}"`, 
            telegramChannelId: `"${telegramChannelId}"` 
        });
        
        // Validation: Check for null/empty inputs
        if (!telegramBotToken || telegramBotToken.trim() === '') {
            console.log('❌ Validation failed: Bot Token is empty');
            setSaveMsg('❌ Error: Telegram Bot Token cannot be empty. Get it from @BotFather on Telegram');
            setSaving(false);
            return;
        }
        
        // Validate bot token format (should be like: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)
        const botTokenRegex = /^\d+:.+$/;
        if (!botTokenRegex.test(telegramBotToken)) {
            console.log('❌ Validation failed: Invalid bot token format');
            setSaveMsg('❌ Error: Invalid Telegram Bot Token format. Should be like: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz');
            setSaving(false);
            return;
        }
        
        if (!telegramChannelId || telegramChannelId.trim() === '') {
            console.log('❌ Validation failed: Channel ID is empty');
            setSaveMsg('❌ Error: Telegram Channel ID cannot be empty. Should be numeric (e.g., -1001234567890)');
            setSaving(false);
            return;
        }
        
        // Validate channel ID format (should be numeric, can be negative)
        const channelIdRegex = /^-?\d+$/;
        if (!channelIdRegex.test(telegramChannelId.trim())) {
            console.log('❌ Validation failed: Invalid channel ID format');
            setSaveMsg('❌ Error: Telegram Channel ID must be numeric (e.g., -1001234567890 or 123456789)');
            setSaving(false);
            return;
        }
        
        console.log('✅ Telegram validation passed, saving...');
        
        try {
            await setDoc(doc(db, "config", "system"), {
                telegramBotToken: telegramBotToken.trim(),
                telegramChannelId: telegramChannelId.trim()
            }, { merge: true });
            console.log('✅ Telegram settings saved to Firestore');
            setSaveMsg('✅ Telegram settings saved successfully!');
            setEditTelegram(false);
            setOriginalTelegram({ telegramBotToken, telegramChannelId });
        } catch (err) {
            console.error('❌ Error saving Telegram settings:', err);
            setSaveMsg('❌ Error saving: ' + err.message);
        }
        setSaving(false);
    };

    // Save Email settings handler
    const handleSaveEmail = async () => {
        alert('🔔 handleSaveEmail called! Check console for validation details.');
        
        setSavingEmail(true);
        setSaveEmailMsg('');
        
        console.log('🔍 Validating Email Settings:', { 
            smtpServer: `"${smtpServer}"`, 
            smtpPort: `"${smtpPort}"`, 
            emailFrom: `"${emailFrom}"`, 
            emailPassword: `"${emailPassword}"` 
        });
        
        // Validation: Check for null/empty inputs
        if (!smtpServer || smtpServer.trim() === '') {
            console.log('❌ Validation failed: SMTP Server is empty');
            setSaveEmailMsg('❌ Error: SMTP Server cannot be empty. Please enter a valid server (e.g., smtp.gmail.com)');
            setSavingEmail(false);
            return;
        }
        
        if (!smtpPort || smtpPort.toString().trim() === '') {
            console.log('❌ Validation failed: SMTP Port is empty');
            setSaveEmailMsg('❌ Error: SMTP Port cannot be empty. Please enter a valid port number (e.g., 465 or 587)');
            setSavingEmail(false);
            return;
        }
        
        // Validate port is a number and within valid range
        const portNumber = parseInt(smtpPort);
        if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
            console.log('❌ Validation failed: Invalid port number');
            setSaveEmailMsg('❌ Error: SMTP Port must be a valid number between 1 and 65535');
            setSavingEmail(false);
            return;
        }
        
        if (!emailFrom || emailFrom.trim() === '') {
            console.log('❌ Validation failed: Email From is empty');
            setSaveEmailMsg('❌ Error: Email From address cannot be empty. Please enter a valid email address');
            setSavingEmail(false);
            return;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailFrom)) {
            console.log('❌ Validation failed: Invalid email format');
            setSaveEmailMsg('❌ Error: Please enter a valid email address format (e.g., user@example.com)');
            setSavingEmail(false);
            return;
        }
        
        if (!emailPassword || emailPassword.trim() === '') {
            console.log('❌ Validation failed: Email Password is empty');
            setSaveEmailMsg('❌ Error: Email Password cannot be empty. Please enter your email password or app password');
            setSavingEmail(false);
            return;
        }
        
        // Validate minimum password length
        if (emailPassword.length < 8) {
            console.log('❌ Validation failed: Password too short');
            setSaveEmailMsg('❌ Error: Email Password must be at least 8 characters long');
            setSavingEmail(false);
            return;
        }
        
        console.log('✅ All validations passed, saving to Firestore...');
        
        try {
            await setDoc(doc(db, "config", "system"), {
                smtpServer: smtpServer.trim(),
                smtpPort: smtpPort.toString().trim(),
                emailFrom: emailFrom.trim(),
                emailPassword
            }, { merge: true });
            console.log('✅ Successfully saved to Firestore');
            setSaveEmailMsg('✅ Email settings saved successfully!');
            setEditEmail(false);
            setOriginalEmail({ smtpServer, smtpPort, emailFrom, emailPassword });
        } catch (err) {
            console.error('❌ Error saving to Firestore:', err);
            setSaveEmailMsg('❌ Error saving: ' + err.message);
        }
        setSavingEmail(false);
    };

    // Cancel edit handlers
    const handleCancelTelegram = () => {
        setTelegramBotToken(originalTelegram.telegramBotToken);
        setTelegramChannelId(originalTelegram.telegramChannelId);
        setEditTelegram(false);
        setSaveMsg('');
    };
    const handleCancelEmail = () => {
        setSmtpServer(originalEmail.smtpServer);
        setSmtpPort(originalEmail.smtpPort);
        setEmailFrom(originalEmail.emailFrom);
        setEmailPassword(originalEmail.emailPassword);
        setEditEmail(false);
        setSaveEmailMsg('');
    };
    
    const handleEditEmail = () => {
        setEditEmail(true);
        setSaveEmailMsg(''); // Clear any previous messages when entering edit mode
    };

    // Save AI settings handler
    const handleSaveAI = async () => {
        setSavingAI(true);
        setSaveAIMsg('');
        
        console.log('🔍 Validating AI Configuration:', { 
            aiModel: `"${aiModel}"`, 
            aiEndpoint: `"${aiEndpoint}"` 
        });
        
        // Validation: Check for null/empty inputs
        if (!aiModel || aiModel.trim() === '') {
            console.log('❌ Validation failed: AI Model is empty');
            setSaveAIMsg('❌ Error: AI Model cannot be empty. Please select a model');
            setSavingAI(false);
            return;
        }
        
        if (!aiEndpoint || aiEndpoint.trim() === '') {
            console.log('❌ Validation failed: AI Endpoint is empty');
            setSaveAIMsg('❌ Error: AI Endpoint URL cannot be empty. Please enter a valid API endpoint');
            setSavingAI(false);
            return;
        }
        
        // Validate URL format
        let urlObj;
        try {
            urlObj = new URL(aiEndpoint);
        } catch (e) {
            console.log('❌ Validation failed: Invalid URL format');
            setSaveAIMsg('❌ Error: Invalid URL format. Please enter a valid URL (e.g., https://api.openai.com/v1/chat/completions)');
            setSavingAI(false);
            return;
        }
        
        // Validate HTTPS protocol for security
        if (urlObj.protocol !== 'https:') {
            console.log('❌ Validation failed: URL must use HTTPS');
            setSaveAIMsg('❌ Error: AI Endpoint must use HTTPS protocol for security. Change http:// to https://');
            setSavingAI(false);
            return;
        }
        
        // Validate that URL has a proper domain
        if (!urlObj.hostname || urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
            console.log('⚠️ Warning: Using localhost endpoint');
            setSaveAIMsg('⚠️ Warning: Using localhost endpoint. Make sure this is intentional for testing.');
        }
        
        console.log('✅ AI configuration validation passed, saving...');
        
        try {
            await setDoc(doc(db, "config", "system"), {
                aiModel: aiModel.trim(),
                aiEndpoint: aiEndpoint.trim()
                // Note: API key is NOT saved to Firestore, it stays in backend/.env
            }, { merge: true });
            console.log('✅ AI configuration saved to Firestore');
            setSaveAIMsg('✅ AI configuration saved successfully! (API key managed in backend)');
            setEditAI(false);
            setOriginalAI({ aiModel, aiEndpoint, aiApiKey });
        } catch (err) {
            console.error('❌ Error saving AI configuration:', err);
            setSaveAIMsg('❌ Error saving: ' + err.message);
        }
        setSavingAI(false);
    };

    // Cancel AI edit handler
    const handleCancelAI = () => {
        setAiModel(originalAI.aiModel);
        setAiEndpoint(originalAI.aiEndpoint);
        setAiApiKey(originalAI.aiApiKey);
        setEditAI(false);
        setSaveAIMsg('');
    };

    // Edit icon SVG
    const EditIcon = (
        <button
            className="ml-2 text-gray-500 hover:text-blue-600 focus:outline-none"
            aria-label="Edit"
            tabIndex={0}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-2.828 1.172H7v-2a4 4 0 011.172-2.828z" />
            </svg>
        </button>
    );

    return (
        <div className="min-h-screen bg-background-light text-text-default dark:bg-gray-900 dark:text-gray-100 transition-colors">
            <div className="flex min-h-screen">
                {/* Sidebar */}
                <aside className={sidebarClass}>
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-primary tracking-tight">CyberSecure</h1>
                        <div className="border-b border-gray-200 dark:border-gray-700 my-4" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">Security Analysis Dashboard</p>
                    </div>
                    <Navigation />
                </aside>

                {/* Main Content */}
                <main className={mainClass}>
                    {/* Standardized Toggle Switch Position */}
                    <div className="flex justify-end mb-6">
                        {Toggle}
                    </div>

                    {/* Heading Section */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">System Configuration</h2>
                        <p className="text-gray-600 dark:text-gray-300 text-lg">Manage system settings and integrations</p>
                    </div>

                    {/* Webhook Settings */}
                    <Card className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <Title className="text-gray-900 dark:text-gray-100">Webhook Configurations</Title>
                            {!editTelegram && (
                                <span onClick={() => setEditTelegram(true)}>{EditIcon}</span>
                            )}
                        </div>
                        <div className="mt-4 space-y-4">
                            <div>
                                <Text className="text-gray-700 dark:text-gray-200">Telegram Bot Token <span className="text-red-500">*</span></Text>
                                {editTelegram ? (
                                    <TextInput
                                        placeholder="e.g., 123456789:ABCdefGHIjklMNOpqrsTUVwxyz (required)"
                                        className="mt-2"
                                        value={telegramBotToken}
                                        onChange={e => setTelegramBotToken(e.target.value)}
                                        required
                                    />
                                ) : (
                                    <div className="mt-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 break-all">
                                        {telegramBotToken ? '••••••••' : <span className="text-gray-400">Not set</span>}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Text className="text-gray-700 dark:text-gray-200">Telegram Channel ID <span className="text-red-500">*</span></Text>
                                {editTelegram ? (
                                    <TextInput
                                        placeholder="e.g., -1001234567890 or 123456789 (required)"
                                        className="mt-2"
                                        value={telegramChannelId}
                                        onChange={e => setTelegramChannelId(e.target.value)}
                                        required
                                    />
                                ) : (
                                    <div className="mt-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 break-all">
                                        {telegramChannelId ? '••••••••' : <span className="text-gray-400">Not set</span>}
                                    </div>
                                )}
                            </div>
                            {editTelegram && (
                                <div className="flex gap-2 mt-2">
                                    <Button
                                        size="sm"
                                        color="blue"
                                        onClick={handleSaveTelegram}
                                        loading={saving}
                                    >
                                        Save Telegram Settings
                                    </Button>
                                    <Button
                                        size="sm"
                                        color="gray"
                                        onClick={handleCancelTelegram}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            )}
                            {saveMsg && (
                                <div className={`mt-3 p-3 rounded-lg border ${
                                    saveMsg.includes('❌') 
                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' 
                                        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                                }`}>
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            {saveMsg.includes('❌') ? (
                                                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <p className="text-sm font-medium">
                                                {saveMsg}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Email Settings */}
                    <Card className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <Title className="text-gray-900 dark:text-gray-100">Email Notifications</Title>
                            {!editEmail && (
                                <span onClick={handleEditEmail}>{EditIcon}</span>
                            )}
                        </div>
                        <div className="mt-4 space-y-4">
                            <div>
                                <Text className="text-gray-700 dark:text-gray-200">SMTP Server <span className="text-red-500">*</span></Text>
                                {editEmail ? (
                                    <TextInput
                                        placeholder="e.g., smtp.gmail.com (required)"
                                        className="mt-2"
                                        value={smtpServer}
                                        onChange={e => setSmtpServer(e.target.value)}
                                        required
                                    />
                                ) : (
                                    <div className="mt-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 break-all">
                                        {smtpServer || <span className="text-gray-400">Not set</span>}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Text className="text-gray-700 dark:text-gray-200">SMTP Port <span className="text-red-500">*</span></Text>
                                {editEmail ? (
                                    <TextInput
                                        placeholder="587 or 465 (required)"
                                        type="number"
                                        className="mt-2"
                                        value={smtpPort}
                                        onChange={e => setSmtpPort(e.target.value)}
                                        required
                                    />
                                ) : (
                                    <div className="mt-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 break-all">
                                        {smtpPort || <span className="text-gray-400">Not set</span>}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Text className="text-gray-700 dark:text-gray-200">Email From <span className="text-red-500">*</span></Text>
                                {editEmail ? (
                                    <TextInput
                                        placeholder="your-email@gmail.com (required)"
                                        type="email"
                                        className="mt-2"
                                        value={emailFrom}
                                        onChange={e => setEmailFrom(e.target.value)}
                                        required
                                    />
                                ) : (
                                    <div className="mt-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 break-all">
                                        {emailFrom || <span className="text-gray-400">Not set</span>}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Text className="text-gray-700 dark:text-gray-200">Email Password <span className="text-red-500">*</span></Text>
                                {editEmail ? (
                                    <TextInput
                                        placeholder="Min 8 characters (required)"
                                        type="password"
                                        className="mt-2"
                                        value={emailPassword}
                                        onChange={e => setEmailPassword(e.target.value)}
                                        required
                                    />
                                ) : (
                                    <div className="mt-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 break-all">
                                        {emailPassword ? '••••••••' : <span className="text-gray-400">Not set</span>}
                                    </div>
                                )}
                            </div>
                            {editEmail && (
                                <div className="flex gap-2 mt-2">
                                    <Button
                                        size="sm"
                                        color="indigo"
                                        onClick={handleSaveEmail}
                                        loading={savingEmail}
                                        disabled={savingEmail}
                                    >
                                        Save Email Settings
                                    </Button>
                                    <Button
                                        size="sm"
                                        color="gray"
                                        onClick={handleCancelEmail}
                                        disabled={savingEmail}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            )}
                            {editEmail && (
                                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                        <strong>⚠️ Required Fields:</strong> All fields marked with <span className="text-red-500">*</span> must be filled before saving.
                                    </p>
                                </div>
                            )}
                            {saveEmailMsg && (
                                <div className={`mt-3 p-3 rounded-lg border ${
                                    saveEmailMsg.includes('❌') 
                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' 
                                        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                                }`}>
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            {saveEmailMsg.includes('❌') ? (
                                                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <p className="text-sm font-medium">
                                                {saveEmailMsg}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* AI Model Settings */}
                    <Card className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <Title className="text-gray-900 dark:text-gray-100">AI Configuration</Title>
                            {!editAI && (
                                <span onClick={() => setEditAI(true)}>{EditIcon}</span>
                            )}
                        </div>
                        <div className="mt-4 space-y-4">
                            <div>
                                <Text className="text-gray-700 dark:text-gray-200">Model Selection <span className="text-red-500">*</span></Text>
                                {editAI ? (
                                    <Select 
                                        className="mt-2" 
                                        value={aiModel}
                                        onValueChange={setAiModel}
                                        required
                                    >
                                        <SelectItem value="openai">OpenAI GPT</SelectItem>
                                        <SelectItem value="granite">IBM Granite</SelectItem>
                                        <SelectItem value="custom">Custom Model</SelectItem>
                                    </Select>
                                ) : (
                                    <div className="mt-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200">
                                        {aiModel === 'openai' ? 'OpenAI GPT' : aiModel === 'granite' ? 'IBM Granite' : 'Custom Model'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Text className="text-gray-700 dark:text-gray-200">API Endpoint <span className="text-red-500">*</span></Text>
                                {editAI ? (
                                    <TextInput
                                        placeholder="https://api.openai.com/v1/chat/completions (required, must be HTTPS)"
                                        className="mt-2"
                                        value={aiEndpoint}
                                        onChange={e => setAiEndpoint(e.target.value)}
                                        required
                                    />
                                ) : (
                                    <div className="mt-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 break-all">
                                        {aiEndpoint}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Text className="text-gray-700 dark:text-gray-200">API Key</Text>
                                <div className="mt-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 break-all flex items-center justify-between">
                                    <span className="font-mono text-sm">••••••••••••••••••••••••••••••••••••••••••••••••••••</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Managed in backend)</span>
                                </div>
                                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    API key is securely stored in backend environment variables and cannot be viewed or edited from the frontend.
                                </Text>
                            </div>
                            {editAI && (
                                <div className="flex gap-2 mt-2">
                                    <Button
                                        size="sm"
                                        color="amber"
                                        onClick={handleSaveAI}
                                        loading={savingAI}
                                    >
                                        Save AI Settings
                                    </Button>
                                    <Button
                                        size="sm"
                                        color="gray"
                                        onClick={handleCancelAI}
                                        disabled={savingAI}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            )}
                            {saveAIMsg && (
                                <div className={`mt-3 p-3 rounded-lg border ${
                                    saveAIMsg.includes('❌') 
                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' 
                                        : saveAIMsg.includes('⚠️')
                                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300'
                                        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                                }`}>
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            {saveAIMsg.includes('❌') ? (
                                                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            ) : saveAIMsg.includes('⚠️') ? (
                                                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <p className="text-sm font-medium">
                                                {saveAIMsg}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </main>
            </div>
        </div>
    );
}

export default Config;
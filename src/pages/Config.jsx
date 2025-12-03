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
        try {
            await setDoc(doc(db, "config", "system"), {
                telegramBotToken,
                telegramChannelId
            }, { merge: true });
            setSaveMsg('Saved successfully!');
            setEditTelegram(false);
            setOriginalTelegram({ telegramBotToken, telegramChannelId });
        } catch (err) {
            setSaveMsg('Error saving: ' + err.message);
        }
        setSaving(false);
    };

    // Save Email settings handler
    const handleSaveEmail = async () => {
        setSavingEmail(true);
        setSaveEmailMsg('');
        try {
            await setDoc(doc(db, "config", "system"), {
                smtpServer,
                smtpPort,
                emailFrom,
                emailPassword
            }, { merge: true });
            setSaveEmailMsg('Email settings saved!');
            setEditEmail(false);
            setOriginalEmail({ smtpServer, smtpPort, emailFrom, emailPassword });
        } catch (err) {
            setSaveEmailMsg('Error saving: ' + err.message);
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

    // Save AI settings handler
    const handleSaveAI = async () => {
        setSavingAI(true);
        setSaveAIMsg('');
        try {
            await setDoc(doc(db, "config", "system"), {
                aiModel,
                aiEndpoint
                // Note: API key is NOT saved to Firestore, it stays in backend/.env
            }, { merge: true });
            setSaveAIMsg('AI configuration saved! (API key managed in backend)');
            setEditAI(false);
            setOriginalAI({ aiModel, aiEndpoint, aiApiKey });
        } catch (err) {
            setSaveAIMsg('Error saving: ' + err.message);
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
                                <Text className="text-gray-700 dark:text-gray-200">Telegram Bot Token</Text>
                                {editTelegram ? (
                                    <TextInput
                                        placeholder="Enter your Telegram bot token"
                                        className="mt-2"
                                        value={telegramBotToken}
                                        onChange={e => setTelegramBotToken(e.target.value)}
                                    />
                                ) : (
                                    <div className="mt-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 break-all">
                                        {telegramBotToken ? '••••••••' : <span className="text-gray-400">Not set</span>}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Text className="text-gray-700 dark:text-gray-200">Telegram Channel ID</Text>
                                {editTelegram ? (
                                    <TextInput
                                        placeholder="Enter your Telegram channel ID"
                                        className="mt-2"
                                        value={telegramChannelId}
                                        onChange={e => setTelegramChannelId(e.target.value)}
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
                                <div className="mt-2 text-sm" style={{ color: saveMsg.startsWith('Error') ? 'red' : 'green' }}>
                                    {saveMsg}
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Email Settings */}
                    <Card className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <Title className="text-gray-900 dark:text-gray-100">Email Notifications</Title>
                            {!editEmail && (
                                <span onClick={() => setEditEmail(true)}>{EditIcon}</span>
                            )}
                        </div>
                        <div className="mt-4 space-y-4">
                            <div>
                                <Text className="text-gray-700 dark:text-gray-200">SMTP Server</Text>
                                {editEmail ? (
                                    <TextInput
                                        placeholder="smtp.example.com"
                                        className="mt-2"
                                        value={smtpServer}
                                        onChange={e => setSmtpServer(e.target.value)}
                                    />
                                ) : (
                                    <div className="mt-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 break-all">
                                        {smtpServer || <span className="text-gray-400">Not set</span>}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Text className="text-gray-700 dark:text-gray-200">SMTP Port</Text>
                                {editEmail ? (
                                    <TextInput
                                        placeholder="587"
                                        type="number"
                                        className="mt-2"
                                        value={smtpPort}
                                        onChange={e => setSmtpPort(e.target.value)}
                                    />
                                ) : (
                                    <div className="mt-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 break-all">
                                        {smtpPort || <span className="text-gray-400">Not set</span>}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Text className="text-gray-700 dark:text-gray-200">Email From</Text>
                                {editEmail ? (
                                    <TextInput
                                        placeholder="security@yourdomain.com"
                                        type="email"
                                        className="mt-2"
                                        value={emailFrom}
                                        onChange={e => setEmailFrom(e.target.value)}
                                    />
                                ) : (
                                    <div className="mt-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 break-all">
                                        {emailFrom || <span className="text-gray-400">Not set</span>}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Text className="text-gray-700 dark:text-gray-200">Email Password</Text>
                                {editEmail ? (
                                    <TextInput
                                        placeholder="Your email password or app password"
                                        type="password"
                                        className="mt-2"
                                        value={emailPassword}
                                        onChange={e => setEmailPassword(e.target.value)}
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
                            {saveEmailMsg && (
                                <div className="mt-2 text-sm" style={{ color: saveEmailMsg.startsWith('Error') ? 'red' : 'green' }}>
                                    {saveEmailMsg}
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
                                <Text className="text-gray-700 dark:text-gray-200">Model Selection</Text>
                                {editAI ? (
                                    <Select 
                                        className="mt-2" 
                                        value={aiModel}
                                        onValueChange={setAiModel}
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
                                <Text className="text-gray-700 dark:text-gray-200">API Endpoint</Text>
                                {editAI ? (
                                    <TextInput
                                        placeholder="https://api.openai.com/v1/chat/completions"
                                        className="mt-2"
                                        value={aiEndpoint}
                                        onChange={e => setAiEndpoint(e.target.value)}
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
                                <div className="mt-2 text-sm" style={{ color: saveAIMsg.startsWith('Error') ? 'red' : 'green' }}>
                                    {saveAIMsg}
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
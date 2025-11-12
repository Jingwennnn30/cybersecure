import React, { useState, useEffect, useRef } from "react";

function FloatingChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [chatHistory, setChatHistory] = useState([]);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Load chat history from localStorage on mount
    useEffect(() => {
        const loadChatHistory = () => {
            const stored = localStorage.getItem('chatbot_history');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Filter out chats older than 1 day
                const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
                const filtered = parsed.filter(chat => chat.lastUpdated > oneDayAgo);
                setChatHistory(filtered);
                localStorage.setItem('chatbot_history', JSON.stringify(filtered));
            }
        };
        loadChatHistory();
    }, []);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Create new chat
    const createNewChat = () => {
        const newChatId = Date.now().toString();
        const welcomeMsg = {
            id: 1,
            type: "bot",
            content: "Hello! I'm your AI Security Assistant. How can I help you today?",
            timestamp: new Date(),
        };
        
        const newChat = {
            id: newChatId,
            title: "New Chat",
            messages: [welcomeMsg],
            lastUpdated: Date.now()
        };
        
        const updatedHistory = [newChat, ...chatHistory];
        setChatHistory(updatedHistory);
        setCurrentChatId(newChatId);
        setMessages([welcomeMsg]);
        localStorage.setItem('chatbot_history', JSON.stringify(updatedHistory));
    };

    // Load existing chat
    const loadChat = (chatId) => {
        const chat = chatHistory.find(c => c.id === chatId);
        if (chat) {
            setCurrentChatId(chatId);
            // Convert timestamp strings back to Date objects
            const messagesWithDates = chat.messages.map(msg => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
            }));
            setMessages(messagesWithDates);
        }
    };

    // Delete chat
    const deleteChat = (chatId, e) => {
        e.stopPropagation();
        const updatedHistory = chatHistory.filter(c => c.id !== chatId);
        setChatHistory(updatedHistory);
        localStorage.setItem('chatbot_history', JSON.stringify(updatedHistory));
        
        if (currentChatId === chatId) {
            setCurrentChatId(null);
            setMessages([]);
        }
    };

    // Update current chat in history
    const updateChatHistory = (newMessages) => {
        if (!currentChatId) return;
        
        const updatedHistory = chatHistory.map(chat => {
            if (chat.id === currentChatId) {
                const firstUserMsg = newMessages.find(m => m.type === 'user');
                const title = firstUserMsg 
                    ? firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '')
                    : 'New Chat';
                
                return {
                    ...chat,
                    messages: newMessages,
                    title: title,
                    lastUpdated: Date.now()
                };
            }
            return chat;
        });
        
        setChatHistory(updatedHistory);
        localStorage.setItem('chatbot_history', JSON.stringify(updatedHistory));
    };

    // Initialize chat when opened
    useEffect(() => {
        if (isOpen && !currentChatId && chatHistory.length === 0) {
            createNewChat();
        } else if (isOpen && !currentChatId && chatHistory.length > 0) {
            loadChat(chatHistory[0].id);
        }
    }, [isOpen]);

    // Prevent body scroll when chatbot is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        
        // Cleanup when component unmounts
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;
        if (!currentChatId) createNewChat();

        const userMessage = {
            id: messages.length + 1,
            type: "user",
            content: inputMessage,
            timestamp: new Date(),
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInputMessage("");
        setIsLoading(true);
        updateChatHistory(updatedMessages);

        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL || "http://localhost:4000"}/api/chatbot`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        message: inputMessage,
                        history: messages,
                    }),
                }
            );

            if (response.ok) {
                const data = await response.json();
                const botMessage = {
                    id: messages.length + 2,
                    type: "bot",
                    content: data.response || "I'm sorry, I couldn't process that request.",
                    timestamp: new Date(),
                };
                const finalMessages = [...updatedMessages, botMessage];
                setMessages(finalMessages);
                updateChatHistory(finalMessages);
            } else {
                throw new Error("Failed to get response");
            }
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage = {
                id: messages.length + 2,
                type: "bot",
                content: "Sorry, I encountered an error. Please try again.",
                timestamp: new Date(),
            };
            const finalMessages = [...updatedMessages, errorMessage];
            setMessages(finalMessages);
            updateChatHistory(finalMessages);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <>
            {/* Floating Chat Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 w-16 h-16 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 z-50"
                aria-label="Open AI Assistant"
            >
                {isOpen ? (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                )}
            </button>

            {/* Modal Overlay - Freezes background */}
            {isOpen && (
                <>
                    {/* Dark overlay that blocks interaction with background */}
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 z-40"
                        onClick={() => setIsOpen(false)}
                    ></div>

                    {/* Chat Window - Bigger with Sidebar */}
                    <div className="fixed inset-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex z-50 border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ maxWidth: '1200px', margin: 'auto' }}>
                    {/* Sidebar - Chat History */}
                    <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 rounded-l-2xl flex flex-col">
                        {/* Sidebar Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <button
                                onClick={createNewChat}
                                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                New Chat
                            </button>
                        </div>

                        {/* Chat History List */}
                        <div className="flex-1 overflow-y-auto p-2" style={{ scrollbarWidth: 'thin' }}>
                            {chatHistory.length === 0 ? (
                                <p className="text-center text-gray-500 text-sm mt-4">No chat history</p>
                            ) : (
                                chatHistory.map((chat) => (
                                    <div
                                        key={chat.id}
                                        onClick={() => loadChat(chat.id)}
                                        className={`p-2.5 mb-2 rounded-lg cursor-pointer transition-colors group ${
                                            currentChatId === chat.id
                                                ? "bg-yellow-100 dark:bg-yellow-900"
                                                : "hover:bg-gray-100 dark:hover:bg-gray-800"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex-1">
                                                {chat.title}
                                            </p>
                                            <button
                                                onClick={(e) => deleteChat(chat.id, e)}
                                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 ml-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {new Date(chat.lastUpdated).toLocaleDateString()}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Main Chat Area */}
                    <div className="flex-1 flex flex-col" style={{ height: '100%', overflow: 'hidden' }}>
                        {/* Header */}
                        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-3 rounded-tr-2xl flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-base">AI Assistant</h3>
                                    <p className="text-xs text-yellow-100">Security Analysis Expert</p>
                                </div>
                            </div>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500">
                                <span className="w-2 h-2 bg-white rounded-full mr-1"></span>
                                Online
                            </span>
                        </div>

                        {/* Messages Area with Fixed Scroll */}
                        <div 
                            className="overflow-y-auto p-4 bg-white dark:bg-gray-900"
                            style={{ 
                                flex: '1 1 auto',
                                minHeight: 0,
                                height: 0,
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#fbbf24 #ffffff'
                            }}
                        >
                            <div className="space-y-4 max-w-4xl mx-auto">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-md ${
                                            message.type === "user"
                                                ? "bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400"
                                                : "bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600"
                                        }`}
                                    >
                                        <p className={`text-base whitespace-pre-wrap leading-relaxed font-semibold ${
                                            message.type === "user" ? "text-gray-800" : "text-gray-900 dark:text-gray-100"
                                        }`}>
                                            {message.content}
                                        </p>
                                        <p className={`text-xs mt-2 font-medium ${message.type === "user" ? "text-gray-700" : "text-gray-600 dark:text-gray-400"}`}>
                                            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-br-2xl flex-shrink-0">
                            <div className="flex items-center gap-3 max-w-4xl mx-auto">
                                <input
                                    type="text"
                                    className="flex-1 border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-medium"
                                    placeholder="Ask me about security alerts, threats, or recommendations..."
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isLoading || !inputMessage.trim()}
                                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-400 text-white p-2.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:shadow-none"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                                Press Enter to send
                            </p>
                        </div>
                    </div>
                </div>
                </>
            )}
        </>
    );
}

export default FloatingChatbot;

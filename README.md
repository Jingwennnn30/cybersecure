# 🛡️ CyberSecure

AI-Powered Security Analysis Dashboard for real-time threat monitoring and intelligent threat assessment.

## 📌 Description

CyberSecure is a comprehensive security analysis platform that combines real-time threat monitoring with AI-powered insights. Built for security analysts and IT professionals, it provides actionable intelligence for network security management through an intuitive dashboard interface.

**Academic Project:** Final Year Project (WIA3002) - University of Malaya

## ✨ Key Features

- **Real-time Alert Monitoring** - Live security alerts from Suricata IDS
- **AI-Powered Chatbot** - Interactive assistant using OpenAI GPT with Model Context Protocol (MCP)
- **Role-Based Access Control** - Admin, Analyst, and Viewer roles with Firebase authentication
- **Google Sign-In** - One-click authentication
- **Historical Analysis** - 2-month alert trends and severity distribution
- **Telegram Integration** - Instant alert notifications
- **Dark/Light Mode** - User-friendly theme switching

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Tailwind CSS** - Styling framework
- **React Router** - Navigation
- **Recharts** - Data visualization
- **Firebase** - Authentication & Firestore database

### Backend
- **Node.js & Express** - REST API server
- **Firebase Admin SDK** - Backend authentication
- **ClickHouse** - Analytics database
- **OpenAI API** - GPT-4 integration
- **WebSocket** - Real-time communication

### Infrastructure
- **Docker & Docker Compose** - Containerization
- **Nginx** - Reverse proxy
- **n8n** - Workflow automation

## 📁 Project Structure

```
cybersecure/
├── public/
│   ├── images/              # Assets
│   └── index.html
├── src/
│   ├── components/          # Reusable components
│   │   ├── FloatingChatbot.jsx
│   │   ├── Layout.jsx
│   │   └── Navigation.jsx
│   ├── pages/               # Page components
│   │   ├── Dashboard.jsx
│   │   ├── Alerts.jsx
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   └── Roles.jsx
│   ├── context/             # React Context
│   ├── firebase.js          # Firebase configuration
│   └── App.jsx
├── backend/
│   ├── services/
│   │   ├── chatbotService.js    # AI chatbot
│   │   ├── mcpService.js        # MCP protocol
│   │   └── clickhouseService.js # Database
│   ├── routes/              # API routes
│   ├── server.js            # Express server
│   └── package.json
├── docker-compose.yml
├── nginx.conf
└── README.md
```

## 📖 Usage

### User Roles
- **Admin** - Full access to all features
- **Analyst** - View and analyze alerts
- **Viewer** - Read-only access

### AI Assistant
Ask questions like:
- "Show me critical alerts from today"
- "What are the top threats this week?"
- "Explain this SURICATA alert"
- "Give me security recommendations"

## 🔒 Security

- Environment variables for sensitive data
- Firebase security rules
- Role-based access control
- Input validation and sanitization


## 👥 Contact

**Developer:** Wong Jing Wen 
**Email:** wongjingwen1234@gmail.com 
**GitHub:** [@Jingwennnn30](https://github.com/Jingwennnn30)

**Developer:** Wong Yi Han
**Email:** wongyihan2003@gmail.com
**GitHub:** [@yihanwong](https://github.com/yihanwong)

---

⭐ Star this repository if you find it helpful!

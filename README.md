# Kairos: The Ultimate Technical Interview Mastery Platform 🚀

Kairos is a premium, AI-powered interview preparation platform designed to turn candidates into high-performing engineers. With a focus on consistency, depth, and expert feedback, Kairos helps you build the daily habit of excellence.

![Kairos Dashboard](https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2070)

## ✨ Core Features

### 📅 Deterministic Daily Ritual
Every user on the platform receives the **exact same high-impact technical challenge** every 24 hours. Join the global conversation and master core concepts alongside thousands of other engineers.

### 🎯 Targeted Practice Hub
Choose from **19 specialized technical categories** including:
- **Core**: DSA, OS, DBMS, Networks, OOP, System Design
- **Full Stack**: Frontend, Backend, FullStack
- **Modern Tech**: Cloud, Security, DevOps, Mobile, Machine Learning
- **Professional**: HR, Agile, Product Management

### 🤖 AI-Powered Evaluation
Get instant, expert-level feedback on every response. Our AI evaluates:
- **Technical Accuracy**: Depth of understanding.
- **Clarity**: Ability to communicate complex ideas.
- **Trade-offs**: Consideration of technical pros and cons.
- **Model Answers**: Compare your response with a "Perfect Answer" drafted by industry experts.

### 📈 Progress & Analytics
- **Day Streaks**: Build momentum and never miss a day.
- **Skill Map**: Visualize your growth across different domains.
- **History**: Review past answers and track your improvement over time.

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, TailwindCSS, Framer Motion, Lucide React
- **Backend**: Node.js (Express), Drizzle ORM
- **Database**: MySQL
- **AI Integration**: Claude 3.5 Sonnet / GPT-4 via OpenRouter
- **Authentication**: Native Custom Auth System

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MySQL Instance
- OpenRouter API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Umesh-chandra-2006/Kairos.git
   cd Kairos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root:
   ```env
   DATABASE_URL=mysql://user:pass@localhost:3306/kairos
   JWT_SECRET=your_super_secret_key
   OPENROUTER_API_KEY=your_key
   ```

4. **Initialize Database**
   ```bash
   npm run db:push
   npm run seed
   ```

5. **Start Development**
   ```bash
   npm run dev
   ```

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Built with ❤️ for the engineering community.*

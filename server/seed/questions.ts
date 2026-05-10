import "dotenv/config";
import { getDB, connectDB } from "../lib/db";
import { questions as questionsTable } from "../../drizzle/schema";

const categories = [
  "DSA", "OS", "DBMS", "Networks", "OOP", "SystemDesign", "Behavioral", 
  "FullStack", "Frontend", "Backend", "HR", "Cloud", "Security", 
  "Testing", "DevOps", "Mobile", "MachineLearning", "Agile", "Product"
] as const;

const difficulties = ["easy", "medium", "hard"] as const;

const topicsMap: Record<string, string[]> = {
  "DSA": ["Arrays", "Linked Lists", "Trees", "Graphs", "Sorting", "Searching", "Recursion", "Greedy", "Heaps", "Tries", "Segment Trees", "Bit Manipulation"],
  "OS": ["Paging", "Segmentation", "Deadlocks", "Scheduling", "Interrupts", "File Systems", "Memory Management", "Concurrency", "I/O Management"],
  "DBMS": ["Normalization", "Indexing", "Transactions", "ACID", "Sharding", "Replication", "NoSQL", "Query Optimization", "Stored Procedures"],
  "Networks": ["TCP/IP", "HTTP", "DNS", "Sockets", "Routing", "Firewalls", "Load Balancing", "TLS/SSL", "VPN", "WebSockets"],
  "OOP": ["Inheritance", "Polymorphism", "Encapsulation", "Abstraction", "Interfaces", "Composition", "Design Patterns", "Solid Principles"],
  "SystemDesign": ["Scalability", "Availability", "Consistency", "Microservices", "Event-Driven", "Caching", "Databases", "API Gateway", "Service Mesh"],
  "FullStack": ["Authentication", "Authorization", "APIs", "Database Management", "Frontend Frameworks", "Server-Side Logic", "Deployment", "State Management"],
  "Frontend": ["CSS", "HTML", "Javascript", "Frameworks", "Performance", "Accessibility", "Responsive Design", "Security"],
  "Backend": ["Node.js", "Python", "Java", "Go", "Databases", "Caching", "Security", "Scalability", "Testing"],
  "HR": ["Leadership", "Conflict Resolution", "Teamwork", "Career Goals", "Self-Improvement", "Problem Solving", "Stress Management"],
  "Cloud": ["AWS", "Azure", "GCP", "Serverless", "Kubernetes", "Docker", "S3", "Lambda", "Virtual Machines"],
  "Security": ["Encryption", "Authentication", "OWASP Top 10", "Firewalls", "Security Protocols", "Incident Response", "Vulnerability Scanning"],
  "Testing": ["Unit Testing", "Integration Testing", "E2E Testing", "Load Testing", "Security Testing", "TDD", "BDD"],
  "DevOps": ["Docker", "Kubernetes", "Jenkins", "GitLab CI", "Terraform", "Ansible", "Monitoring", "Logging"],
  "Mobile": ["Android", "iOS", "React Native", "Flutter", "App Store", "Native APIs", "Performance"],
  "MachineLearning": ["Regression", "Classification", "Neural Networks", "Deep Learning", "NLP", "Computer Vision", "Clustering"],
  "Agile": ["Scrum", "Kanban", "Sprint", "Backlog", "User Stories", "Retrospectives", "Dailies"],
  "Product": ["User Stories", "Roadmaps", "Prioritization", "Analytics", "UX Design", "Market Research", "Stakeholder Management"]
};

const generatedQuestions: any[] = [];

for (const cat of categories) {
  const topics = topicsMap[cat] || ["General Concept"];
  for (let i = 0; i < 50; i++) {
    const topic = topics[i % topics.length];
    const difficulty = difficulties[i % difficulties.length];
    generatedQuestions.push({
      category: cat,
      difficulty,
      text: `Explain ${topic} in the context of ${cat}. What are the key considerations for interview preparation?`,
      rubricHints: `Should explain ${topic} accurately, mention its importance in ${cat}, and discuss at least two technical trade-offs or common interview points.`
    });
  }
}

async function seed() {
  try {
    console.log("Starting seed process...");
    await connectDB();
    const db = getDB();
    
    console.log(`Generated ${generatedQuestions.length} questions. Preparing to seed...`);
    
    // Clear existing
    await db.delete(questionsTable);
    console.log("Cleared existing questions");

    // Insert in chunks
    const chunkSize = 50;
    for (let i = 0; i < generatedQuestions.length; i += chunkSize) {
      const chunk = generatedQuestions.slice(i, i + chunkSize);
      await db.insert(questionsTable).values(chunk);
      console.log(`Inserted ${Math.min(i + chunkSize, generatedQuestions.length)} questions...`);
    }

    console.log(`Successfully seeded ${generatedQuestions.length} questions across ${categories.length} categories.`);
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();

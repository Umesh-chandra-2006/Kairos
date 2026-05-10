import "dotenv/config";
import mongoose from "mongoose";
import { Question } from "../src/models/Question";

const questions = [
  // ─── DSA (5 questions) ───────────────────────────────────────────────────
  {
    category: "DSA",
    difficulty: "easy",
    text: "Explain the sliding window technique. What class of problems is it useful for?",
    rubricHints:
      "Should mention: maintaining a window of fixed or variable size over an array/string, O(n) vs O(n²) brute force, useful for subarray/substring problems like max sum subarray, longest substring without repeat. Should give at least one concrete example.",
  },
  {
    category: "DSA",
    difficulty: "medium",
    text: "What is the difference between BFS and DFS? When would you choose one over the other?",
    rubricHints:
      "BFS uses a queue, DFS uses a stack (or recursion). BFS is better for shortest path in unweighted graphs. DFS is better for cycle detection, topological sort, exploring all paths. Bonus: iterative DFS, space complexity differences (BFS can be O(width), DFS O(depth)).",
  },
  {
    category: "DSA",
    difficulty: "medium",
    text: "Explain how a hash table works internally. What happens during a collision?",
    rubricHints:
      "Hash function maps key to bucket index. Collision resolution: chaining (linked list at each bucket) or open addressing (linear/quadratic probing). Load factor triggers rehashing. Average O(1) insert/lookup. Worst case O(n) with many collisions. Good hash functions distribute uniformly.",
  },
  {
    category: "DSA",
    difficulty: "hard",
    text: "Explain dynamic programming. How do you identify if a problem can be solved with DP?",
    rubricHints:
      "Two properties: optimal substructure (optimal solution built from optimal sub-solutions) and overlapping subproblems. Top-down (memoization) vs bottom-up (tabulation). Examples: Fibonacci, 0/1 knapsack, LCS. How to formulate state, transition relation.",
  },
  {
    category: "DSA",
    difficulty: "hard",
    text: "What is a segment tree? When would you use it over a prefix sum array?",
    rubricHints:
      "Segment tree supports both range queries and point updates in O(log n). Prefix sum only handles static arrays (updates are O(n)). Use segment tree when both queries and updates are frequent. Mention: build O(n), query O(log n), update O(log n). Lazy propagation for range updates.",
  },

  // ─── OS (5 questions) ────────────────────────────────────────────────────
  {
    category: "OS",
    difficulty: "medium",
    text: "What is the difference between a process and a thread? When would you use one over the other?",
    rubricHints:
      "Separate memory space for processes vs shared memory for threads. Context switch cost (processes heavier). Use threads for shared state (e.g. server handling requests). Use processes for isolation (e.g. browser tabs). Bonus: GIL in CPython, race conditions, mutex/locks.",
  },
  {
    category: "OS",
    difficulty: "easy",
    text: "What is a deadlock? What are the four necessary conditions for it to occur?",
    rubricHints:
      "Coffman conditions: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait. All four must hold simultaneously. Prevention: break any one condition. Detection + recovery. Banker's algorithm for avoidance.",
  },
  {
    category: "OS",
    difficulty: "medium",
    text: "Explain virtual memory. Why is it useful and what is a page fault?",
    rubricHints:
      "Virtual memory abstracts physical RAM. Allows programs larger than physical memory. Paging: virtual pages mapped to physical frames. Page fault: referenced page not in RAM, OS loads from disk (swap). TLB for fast translation. Thrashing: too many page faults.",
  },
  {
    category: "OS",
    difficulty: "hard",
    text: "What is the difference between preemptive and non-preemptive scheduling? Name and compare at least three scheduling algorithms.",
    rubricHints:
      "Preemptive: OS can interrupt running process. Non-preemptive: process runs until it yields. Algorithms: FCFS (simple, convoy effect), SJF (optimal avg wait, starvation), Round Robin (fair, good for time-sharing, context switch overhead), Priority Scheduling (starvation → aging). Metrics: throughput, turnaround, waiting time.",
  },
  {
    category: "OS",
    difficulty: "easy",
    text: "What is a mutex and how does it differ from a semaphore?",
    rubricHints:
      "Mutex: binary lock, only owner can unlock. Semaphore: counter, multiple threads can signal. Mutex for mutual exclusion of critical section. Semaphore for signaling and counting (e.g. producer-consumer, bounded buffer). Binary semaphore ≠ mutex (ownership). Priority inversion with mutex.",
  },

  // ─── DBMS (4 questions) ──────────────────────────────────────────────────
  {
    category: "DBMS",
    difficulty: "easy",
    text: "What are ACID properties? Explain each with a brief example.",
    rubricHints:
      "Atomicity: all or nothing (bank transfer). Consistency: DB moves from valid state to valid state. Isolation: concurrent transactions don't interfere. Durability: committed data survives crashes. Example for each. Mention transactions, rollback.",
  },
  {
    category: "DBMS",
    difficulty: "medium",
    text: "What is database indexing? How does a B-tree index work, and when should you not use an index?",
    rubricHints:
      "Index speeds up read at cost of write overhead and storage. B-tree: balanced tree with sorted keys, O(log n) lookup. Clustered vs non-clustered. Don't index: small tables, high write-to-read ratio, low cardinality columns (e.g. boolean). Composite indexes: order matters (leftmost prefix rule).",
  },
  {
    category: "DBMS",
    difficulty: "medium",
    text: "Explain the differences between SQL JOIN types: INNER, LEFT, RIGHT, and FULL OUTER.",
    rubricHints:
      "INNER: rows with matching keys in both tables. LEFT: all from left + matched from right (null if no match). RIGHT: opposite. FULL OUTER: all rows from both, nulls where no match. Cross join (Cartesian product). Venn diagram explanation is a plus. Use cases for each.",
  },
  {
    category: "DBMS",
    difficulty: "hard",
    text: "What is database normalization? Explain 1NF, 2NF, and 3NF with examples.",
    rubricHints:
      "1NF: atomic values, no repeating groups. 2NF: 1NF + no partial dependency on composite PK. 3NF: 2NF + no transitive dependency. BCNF: stricter 3NF. Denormalization trade-offs for performance. Practical: over-normalization can hurt read performance (many joins).",
  },

  // ─── Networks (4 questions) ──────────────────────────────────────────────
  {
    category: "Networks",
    difficulty: "easy",
    text: "What happens when you type a URL into a browser and press Enter? Walk through the full request/response cycle.",
    rubricHints:
      "DNS resolution (browser cache → OS cache → DNS resolver → root/TLD/authoritative). TCP handshake. TLS handshake (if HTTPS). HTTP request sent. Server processes, returns response. Browser parses HTML, fetches sub-resources, renders. Bonus: CDN, HTTP/2 multiplexing, HTTP caching headers.",
  },
  {
    category: "Networks",
    difficulty: "medium",
    text: "What is the difference between TCP and UDP? When would you use each?",
    rubricHints:
      "TCP: connection-oriented, reliable (ACK, retransmit), ordered, congestion control. Slower. UDP: connectionless, no guarantee, lower latency. TCP for HTTP, email, file transfer. UDP for video streaming, gaming, DNS (why?), VoIP. TCP handshake overhead. Head-of-line blocking.",
  },
  {
    category: "Networks",
    difficulty: "medium",
    text: "Explain how HTTPS works. What does TLS provide and how is the key exchange done?",
    rubricHints:
      "TLS provides confidentiality (encryption), integrity (MAC), authentication (certificates). Handshake: client hello (supported ciphers), server hello + certificate, key exchange (ECDHE/RSA), session key derived. Symmetric encryption for data after handshake. Certificate chain, CA, root trust. TLS 1.3 improvements.",
  },
  {
    category: "Networks",
    difficulty: "hard",
    text: "What is HTTP/2 and how does it differ from HTTP/1.1? What problem does HTTP/3 solve?",
    rubricHints:
      "HTTP/2: multiplexing (multiple streams over one TCP connection), header compression (HPACK), server push, binary framing. Fixes HTTP/1.1 head-of-line blocking at application layer. HTTP/3: uses QUIC (UDP-based), fixes TCP-level HOL blocking, faster connection establishment (0-RTT), built-in TLS. Trade-offs.",
  },

  // ─── OOP (4 questions) ───────────────────────────────────────────────────
  {
    category: "OOP",
    difficulty: "easy",
    text: "What are the four pillars of object-oriented programming? Explain each with a real-world analogy.",
    rubricHints:
      "Encapsulation: hiding internal state (car engine behind ignition). Abstraction: exposing only necessary interface (TV remote). Inheritance: child class inherits from parent (Dog extends Animal). Polymorphism: same interface, different behavior (Shape.draw()). Why OOP? Reusability, maintainability, modeling real world.",
  },
  {
    category: "OOP",
    difficulty: "medium",
    text: "What is the SOLID principle? Describe each principle briefly.",
    rubricHints:
      "S: Single Responsibility — class has one reason to change. O: Open/Closed — open for extension, closed for modification. L: Liskov Substitution — subclasses must be substitutable for parent. I: Interface Segregation — clients shouldn't depend on unused interfaces. D: Dependency Inversion — depend on abstractions, not concretions. Real examples for each.",
  },
  {
    category: "OOP",
    difficulty: "medium",
    text: "What is the difference between an abstract class and an interface? When would you use each?",
    rubricHints:
      "Abstract class: can have state, method implementations, constructors. Interface: contract only (in most languages). Use abstract class when sharing code across related classes. Use interface for unrelated classes sharing behavior (Serializable, Flyable). Multiple interface implementation vs single inheritance. Language differences (Java vs Python).",
  },
  {
    category: "OOP",
    difficulty: "hard",
    text: "Explain the Observer design pattern. Give a real-world use case and discuss its trade-offs.",
    rubricHints:
      "Subject maintains list of observers. On state change, notifies all observers. Use case: event systems, UI data binding, pub/sub. Trade-offs: decouples subject from observers but can cause memory leaks (forgotten subscriptions), unexpected update cascades, ordering issues. Push vs pull model. RxJS/reactive extensions as modern take.",
  },

  // ─── SystemDesign (4 questions) ─────────────────────────────────────────
  {
    category: "SystemDesign",
    difficulty: "hard",
    text: "Design a URL shortener like bit.ly. Walk me through your approach.",
    rubricHints:
      "Hashing strategy (MD5/base62), collision handling, database choice (KV store like Redis + persistent DB), read-heavy optimization (caching), scale considerations (horizontal scaling, CDN for redirects). Bonus: analytics, custom slugs, expiry. Estimate QPS and storage. Redirect: 301 vs 302.",
  },
  {
    category: "SystemDesign",
    difficulty: "hard",
    text: "Design a rate limiter. What algorithms would you consider and how would you handle distributed systems?",
    rubricHints:
      "Algorithms: Token Bucket (smooth, handles burst), Leaky Bucket, Fixed Window Counter (edge burst), Sliding Window Log (accurate, memory heavy), Sliding Window Counter (hybrid). Distributed: centralized Redis with atomic increment, or use Redis Lua scripts. Per-user vs per-IP. Response headers (X-RateLimit-*). Graceful degradation.",
  },
  {
    category: "SystemDesign",
    difficulty: "medium",
    text: "What is a CDN and how does it work? When would you use one?",
    rubricHints:
      "CDN: globally distributed edge servers cache static/dynamic content closer to users. Reduces latency, offloads origin server. Cache invalidation strategies (TTL, purge). Use for: static assets (images, JS/CSS), streaming, API acceleration. Push vs pull CDN. Cost vs performance. Anycast routing.",
  },
  {
    category: "SystemDesign",
    difficulty: "hard",
    text: "Explain the CAP theorem. How does it apply to real distributed databases like Cassandra, DynamoDB, and PostgreSQL?",
    rubricHints:
      "CAP: Consistency, Availability, Partition Tolerance — can only guarantee 2 of 3. Cassandra: AP (tunable consistency). DynamoDB: AP by default (strong consistency opt-in). PostgreSQL (single node): CA (no partition tolerance). PACELC extends CAP with latency. Practical: networks always have partitions, so trade-off is C vs A. Eventual consistency, quorum reads.",
  },

  // ─── Behavioral (4 questions) ────────────────────────────────────────────
  {
    category: "Behavioral",
    difficulty: "easy",
    text: "Tell me about a time you had a disagreement with a teammate. How did you handle it?",
    rubricHints:
      "STAR format (Situation, Task, Action, Result). Should demonstrate: listening to understand, not to win; separating ego from idea; seeking common ground or escalating appropriately; outcome — what changed or was resolved. Avoid blaming. Show growth mindset.",
  },
  {
    category: "Behavioral",
    difficulty: "medium",
    text: "Describe a project where you had to learn a new technology quickly under a deadline. What was your approach?",
    rubricHints:
      "STAR format. Should mention: time-boxing learning, prioritizing official docs, building a small prototype first, identifying known unknowns, asking for help when stuck. Result: did they deliver? What would they do differently? Shows self-management, learning agility.",
  },
  {
    category: "Behavioral",
    difficulty: "medium",
    text: "Tell me about the most technically complex problem you've solved. How did you break it down?",
    rubricHints:
      "Should demonstrate: problem decomposition, identifying root cause vs symptoms, systematic debugging or design approach, communication with stakeholders during process, measurable outcome. Bonus: what tools/techniques they used, what they'd change retrospectively.",
  },
  {
    category: "Behavioral",
    difficulty: "hard",
    text: "Describe a time you had to make a significant technical decision with incomplete information. How did you proceed and what was the outcome?",
    rubricHints:
      "Should show: risk assessment framework, gathering minimum viable information, reversible vs irreversible decisions, stakeholder alignment, documenting assumptions. Result: ideally positive but acknowledging failure is fine if they show what they learned. Shows senior-level judgment.",
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not set in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  // Clear existing questions
  const deleted = await Question.deleteMany({});
  console.log(`🗑  Cleared ${deleted.deletedCount} existing questions`);

  // Insert all
  const inserted = await Question.insertMany(questions);
  console.log(`✅ Seeded ${inserted.length} questions`);

  // Summary per category
  const categoryCounts: Record<string, number> = {};
  for (const q of questions) {
    categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
  }
  console.log("\n📊 Questions per category:");
  for (const [cat, count] of Object.entries(categoryCounts)) {
    console.log(`   ${cat}: ${count}`);
  }

  await mongoose.disconnect();
  console.log("\n🎉 Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

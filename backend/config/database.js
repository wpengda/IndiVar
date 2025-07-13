const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database configuration
const DB_PATH = path.join(__dirname, '../../indivar.db');

// Create database connection
const db = new sqlite3.Database(DB_PATH);

// Initialize database tables
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
          reject(err);
        }
      });

      // Articles table
      db.run(`CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        content TEXT NOT NULL,
        primary_category TEXT NOT NULL,
        secondary_category TEXT NOT NULL,
        author TEXT NOT NULL,
        publish_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating articles table:', err);
          reject(err);
        }
      });

      // Read articles table
      db.run(`CREATE TABLE IF NOT EXISTS read_articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        article_id TEXT NOT NULL,
        read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, article_id)
      )`, (err) => {
        if (err) {
          console.error('Error creating read_articles table:', err);
          reject(err);
        }
      });

      // User article notes table
      db.run(`CREATE TABLE IF NOT EXISTS user_article_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        article_id TEXT NOT NULL,
        note TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, article_id)
      )`, (err) => {
        if (err) {
          console.error('Error creating user_article_notes table:', err);
          reject(err);
        }
      });

      // Test progress table
      db.run(`CREATE TABLE IF NOT EXISTS test_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        test_id TEXT NOT NULL,
        progress_data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, test_id)
      )`, (err) => {
        if (err) {
          console.error('Error creating test_progress table:', err);
          reject(err);
        }
      });

      // Test results table
      db.run(`CREATE TABLE IF NOT EXISTS test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        test_id TEXT NOT NULL,
        test_type TEXT NOT NULL,
        results_data TEXT NOT NULL,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`, (err) => {
        if (err) {
          console.error('Error creating test_results table:', err);
          reject(err);
        }
      });

      // Insert sample articles if they don't exist
      insertSampleArticles()
        .then(() => {
          console.log('Database initialized successfully');
          resolve();
        })
        .catch(reject);
    });
  });
};

// Sample articles data
const sampleArticles = [
  {
    title: "Introduction to Personality Science",
    excerpt: "A comprehensive overview of personality psychology and individual differences research.",
    content: "Personality psychology is the scientific study of individual differences in behavior, thought, and emotion. This field seeks to understand how and why people differ from one another in their characteristic patterns of thinking, feeling, and behaving.\n\nAt its core, personality psychology addresses fundamental questions about human nature: What makes each person unique? How do our personalities develop over time? To what extent are our traits stable versus malleable?\n\nThe field encompasses multiple theoretical perspectives, from trait theories that focus on stable individual differences to dynamic approaches that emphasize the role of context and situation. Researchers use various methodologies, including self-report questionnaires, behavioral observations, and physiological measures.\n\nUnderstanding personality has important implications for education, workplace dynamics, mental health, and personal relationships. By studying individual differences, we can better appreciate human diversity and develop more effective interventions and support systems.\n\nThis introduction provides the foundation for exploring the rich and complex world of personality science.",
    primary_category: "Introduction to Personality Science (Personality 101)",
    secondary_category: "Foundations",
    author: "Dr. Sarah Chen"
  },
  {
    title: "The Big Five Personality Model",
    excerpt: "Explore the five-factor model of personality and its applications in research and practice.",
    content: "The Big Five personality model represents one of the most widely accepted frameworks for understanding individual differences in personality. This model identifies five broad dimensions that capture the major variations in human personality: Openness to Experience, Conscientiousness, Extraversion, Agreeableness, and Neuroticism (OCEAN).\n\nEach of these dimensions represents a continuum, with individuals falling somewhere along each spectrum. Research has shown that these traits are relatively stable across adulthood and have important implications for various life outcomes.\n\nOpenness to Experience reflects curiosity, imagination, and openness to new ideas and experiences. Conscientiousness involves organization, responsibility, and goal-directed behavior. Extraversion encompasses sociability, assertiveness, and positive emotionality.\n\nAgreeableness relates to cooperation, trust, and concern for others. Neuroticism involves emotional instability, anxiety, and negative emotionality.\n\nThe Big Five model has been validated across cultures and languages, making it a robust framework for cross-cultural personality research. It provides a common language for researchers and practitioners to discuss individual differences.\n\nUnderstanding the Big Five can help individuals gain insight into their own personality patterns and how these might influence their behavior, relationships, and life choices.",
    primary_category: "Trait Taxonomies",
    secondary_category: "Big Five",
    author: "Dr. Michael Rodriguez"
  },
  {
    title: "Personality Assessment Methods",
    excerpt: "An overview of different approaches to measuring personality traits and individual differences.",
    content: "Personality assessment involves the systematic evaluation of individual differences in personality characteristics. Researchers and practitioners use various methods to measure personality, each with its own strengths and limitations.\n\nSelf-report questionnaires are the most common method, where individuals rate themselves on various personality dimensions. These measures are efficient and can capture internal experiences, but they may be subject to response biases such as social desirability or self-deception.\n\nObserver ratings provide an external perspective on personality, often from peers, family members, or trained observers. These ratings can offer valuable insights and may be less susceptible to certain biases, but they depend on the quality of the observer's judgment.\n\nBehavioral measures assess personality through direct observation of behavior in controlled or naturalistic settings. These methods can provide objective data but may not capture internal experiences and can be resource-intensive.\n\nPhysiological measures examine biological correlates of personality, such as brain activity, heart rate, or hormone levels. These methods offer insights into the biological basis of personality but may not directly measure psychological constructs.\n\nProjective techniques, such as the Rorschach inkblot test, present ambiguous stimuli and interpret responses. While these methods can reveal unconscious aspects of personality, they often lack reliability and validity.\n\nThe choice of assessment method depends on the research question, available resources, and the specific personality constructs of interest. Many studies use multiple methods to triangulate findings and gain a more comprehensive understanding of personality.",
    primary_category: "Item Measurements",
    secondary_category: "Assessment Methods",
    author: "Dr. Emily Watson"
  },
  {
    title: "Personality Development Across the Lifespan",
    excerpt: "How personality traits change and develop from childhood through adulthood.",
    content: "Personality development is a complex process that unfolds across the entire lifespan, influenced by both genetic and environmental factors. Understanding how personality changes over time is crucial for both theoretical and practical applications.\n\nResearch has shown that personality traits demonstrate both stability and change throughout life. While there is considerable rank-order stability in personality traits, mean-level changes also occur, particularly during certain developmental periods.\n\nChildhood and adolescence are marked by significant personality development as individuals form their sense of self and develop characteristic patterns of behavior. During this period, personality traits become more stable and predictive of future outcomes.\n\nYoung adulthood is characterized by continued personality maturation, often involving increases in conscientiousness and agreeableness. This period may reflect the demands of adult roles and responsibilities.\n\nMiddle adulthood shows relatively stable personality patterns, though some individuals may experience midlife transitions that influence their personality expression.\n\nOlder adulthood may bring changes in personality as individuals adapt to physical, social, and cognitive changes. Some research suggests increases in agreeableness and decreases in neuroticism during this period.\n\nEnvironmental factors such as life events, relationships, and cultural contexts play important roles in personality development. Major life transitions, such as starting a career or becoming a parent, can influence personality change.\n\nUnderstanding personality development has implications for education, career counseling, and mental health interventions. By recognizing typical developmental patterns, we can better support individuals at different life stages.",
    primary_category: "Development",
    secondary_category: "Lifespan",
    author: "Dr. Jennifer Kim"
  },
  {
    title: "Personality and Career Success",
    excerpt: "How individual differences influence career choices, job performance, and workplace satisfaction.",
    content: "Personality traits play a significant role in career development and workplace success. Understanding the relationship between personality and career outcomes can help individuals make informed career choices and organizations develop effective selection and development programs.\n\nResearch has consistently shown that certain personality traits predict job performance across various occupations. Conscientiousness is one of the strongest predictors of job performance, as it relates to reliability, organization, and goal-directed behavior.\n\nExtraversion is associated with success in sales and leadership roles, where interpersonal skills and social energy are important. Agreeableness contributes to teamwork and customer service effectiveness.\n\nOpenness to Experience is valuable in creative and research-oriented fields, where innovation and learning are key. Neuroticism is generally negatively related to job performance, though this relationship may vary by occupation.\n\nPersonality also influences career choice and satisfaction. Individuals tend to gravitate toward careers that align with their personality traits, leading to better job satisfaction and performance.\n\nWork environment factors, such as organizational culture and job characteristics, can moderate the relationship between personality and career outcomes. A good person-environment fit enhances both individual and organizational success.\n\nUnderstanding personality-career relationships has practical implications for career counseling, job placement, and organizational development. By considering personality factors, we can help individuals find fulfilling careers and organizations build effective teams.",
    primary_category: "Criteria & Outcomes",
    secondary_category: "Career",
    author: "Dr. Robert Thompson"
  }
];

// Insert sample articles
const insertSampleArticles = () => {
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) as count FROM articles", (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (row.count === 0) {
        const stmt = db.prepare("INSERT INTO articles (title, excerpt, content, primary_category, secondary_category, author) VALUES (?, ?, ?, ?, ?, ?)");
        
        sampleArticles.forEach(article => {
          stmt.run(article.title, article.excerpt, article.content, article.primary_category, article.secondary_category, article.author);
        });
        
        stmt.finalize((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Sample articles inserted successfully');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  });
};

module.exports = {
  db,
  initializeDatabase
}; 
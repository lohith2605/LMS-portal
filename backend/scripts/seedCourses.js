require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Course = require('../models/Course');
const { logger } = require('../utils/logger');

const sampleCourses = [
  {
    title: 'Design Systems from Figma to Production Code',
    summary: 'Bridge the gap between design tokens, accessible component architecture, and modern frontend styling workflows.',
    description: `A comprehensive journey for engineers and designers seeking to build resilient, accessible design systems that scale across multi-brand organizations. Learn the mathematical foundation of spatial scales, automate style syncing between Figma and GitHub, and craft robust primitives with WCAG-compliant keyboard and screen-reader interactions.

Throughout this course, you will build and publish a production-ready component library equipped with automated token generation, monorepo package bundling, and living documentation.`,
    category: 'Design',
    level: 'Intermediate',
    estimatedDuration: '6 weeks',
    language: 'English',
    thumbnail: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
    learningObjectives: [
      'Construct scalable design token systems for colors, typography, and spatial math.',
      'Bridge Figma variables with automated CI/CD style token transformations.',
      'Implement accessible primitives following WCAG 2.1 AA keyboard specifications.',
      'Deploy living documentation sites and distribute packages via npm/monorepos.',
    ],
    prerequisites: 'Familiarity with modern UI design principles and basic component syntax (HTML, CSS, React).',
    intendedAudience: 'Frontend engineers, UI/UX designers, and design system architects.',
    status: 'published',
    publishedAt: new Date(),
    sections: [
      {
        title: 'Module 1: Foundations of Design Tokens',
        description: 'Explore design tokens as the single source of truth across platforms.',
        sortOrder: 0,
        lessons: [
          {
            title: 'Welcome & System Architecture Overview',
            description: 'Introduction to design systems and learning roadmap.',
            contentType: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            textContent: '# Welcome to Design Systems\n\nDesign systems are more than just component libraries—they are living systems that encode organizational philosophy and design principles into reusable code tokens.\n\n### Key Principles\n1. Consistency\n2. Scalability\n3. Accessibility\n4. Efficiency',
            duration: '12 mins',
            sortOrder: 0,
            isPublished: true,
          },
          {
            title: 'Spatial Math and Typography Scales',
            description: 'Deriving harmonious spatial grids and dynamic typography systems.',
            contentType: 'text',
            textContent: '# Spatial Math & Modular Scales\n\nModern interfaces rely on an 8pt or 4pt baseline grid to guarantee visual balance across different viewport sizes.\n\n```css\n:root {\n  --space-1: 0.25rem; /* 4px */\n  --space-2: 0.5rem;  /* 8px */\n  --space-4: 1rem;    /* 16px */\n  --space-6: 1.5rem;  /* 24px */\n  --space-8: 2rem;    /* 32px */\n}\n```',
            duration: '18 mins',
            sortOrder: 1,
            isPublished: true,
          },
        ],
      },
      {
        title: 'Module 2: Building Accessible Component Primitives',
        description: 'Crafting robust, accessible UI components from the ground up.',
        sortOrder: 1,
        lessons: [
          {
            title: 'Accessible Buttons, Focus States & ARIA',
            description: 'Creating keyboard-friendly, screen-reader verified interactive buttons.',
            contentType: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            textContent: '# Accessible Interactive Primitives\n\nEnsure every interactive element has visible outline rings, active touch feedback, and aria-expanded attributes.',
            duration: '22 mins',
            sortOrder: 0,
            isPublished: true,
          },
          {
            title: 'Compound Components & Context State Sharing',
            description: 'Managing complex modal dialogs and dropdown menus using React Context.',
            contentType: 'text',
            textContent: '# Compound Components in React\n\nLearn how to compose flexible parent-child components like Dropdown, Dropdown.Trigger, and Dropdown.Menu without prop drilling.',
            duration: '25 mins',
            sortOrder: 1,
            isPublished: true,
          },
        ],
      },
    ],
  },
  {
    title: 'Systems Architecture & Scalable Web Services',
    summary: 'Learn modern distributed patterns, event-driven backends, database sharding strategies, and reliable API resilience.',
    description: `Dive into the core principles of designing resilient, high-throughput backend services. This curriculum takes engineers past basic CRUD APIs into the realm of distributed systems, exploring CQRS patterns, message queues, asynchronous workflow engines, and reliable transaction boundaries.

Students gain hands-on experience stress-testing node clusters, handling circuit breaking under load, and designing clean database query access plans.`,
    category: 'Development',
    level: 'Advanced',
    estimatedDuration: '8 weeks',
    language: 'English',
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    learningObjectives: [
      'Decompose monoliths into clear domain-driven microservice boundaries.',
      'Implement asynchronous messaging patterns with message queues and outbox tables.',
      'Optimize database queries with indexing, execution plans, and read replicas.',
      'Implement circuit breakers, health probes, and distributed tracing.',
    ],
    prerequisites: 'Solid background in server-side JavaScript, Go, or Python and relational databases.',
    intendedAudience: 'Backend engineers, DevOps professionals, and system architects.',
    status: 'published',
    publishedAt: new Date(),
    sections: [
      {
        title: 'Section 1: Distributed Foundations & Decomposition',
        description: 'Decomposing complex domains into decoupled services.',
        sortOrder: 0,
        lessons: [
          {
            title: 'Domain Boundaries & The Transaction Outbox Pattern',
            description: 'Guaranteed message delivery across distributed storage nodes.',
            contentType: 'text',
            textContent: '# The Transaction Outbox Pattern\n\nWhen updating a database and publishing a message to a queue, atomic dual-writes are impossible without 2PC. The Outbox pattern writes the event into an internal table within the same transaction.',
            duration: '20 mins',
            sortOrder: 0,
            isPublished: true,
          },
          {
            title: 'Event Streaming with Queues & Partition Keys',
            description: 'Maintaining message ordering while achieving horizontal scale.',
            contentType: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            textContent: '# Message Ordering & Partitioning\n\nUnderstanding partition hash algorithms to distribute user workloads safely across workers without concurrency race conditions.',
            duration: '30 mins',
            sortOrder: 1,
            isPublished: true,
          },
        ],
      },
      {
        title: 'Section 2: High Availability & API Resilience',
        description: 'Surviving transient failures and cascade outages gracefully.',
        sortOrder: 1,
        lessons: [
          {
            title: 'Circuit Breakers, Retries, and Exponential Backoff',
            description: 'Protect downstream databases and third-party APIs during peak degradation.',
            contentType: 'text',
            textContent: '# Circuit Breakers\n\nStates:\n- **Closed**: Requests pass normally.\n- **Open**: Failing quickly without executing expensive remote calls.\n- **Half-Open**: Probing downstream health with canary requests.',
            duration: '15 mins',
            sortOrder: 0,
            isPublished: true,
          },
        ],
      },
    ],
  },
  {
    title: 'Practical Data Analysis with Python & SQL',
    summary: 'Transform raw datasets into actionable insights using structured relational queries, Pandas pipelines, and clean data storytelling.',
    description: `Unlock the power of exploratory data science and analytics engineering. Starting from structured SQL queries, joins, and analytical window functions, this course transitions smoothly into Python data manipulation using Pandas, NumPy, and modern visualization packages.

Designed with practical business analytics in mind, learners will clean real-world messy datasets, identify anomalies, and present actionable insights.`,
    category: 'Data',
    level: 'Beginner',
    estimatedDuration: '5 weeks',
    language: 'English',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    learningObjectives: [
      'Write multi-table relational SQL queries with CTEs and window functions.',
      'Wrangle messy data using Python, Pandas DataFrames, and vectorized operations.',
      'Detect outliers and calculate statistical confidence intervals.',
      'Build executive summary dashboards with clear visual hierarchy.',
    ],
    prerequisites: 'No prior programming required; basic spreadsheet familiarity is helpful.',
    intendedAudience: 'Aspiring data analysts, business analysts, and curious developers.',
    status: 'published',
    publishedAt: new Date(),
    sections: [
      {
        title: 'Module 1: Relational SQL Mastery',
        description: 'Mastering SQL queries from basic SELECTs to advanced window aggregations.',
        sortOrder: 0,
        lessons: [
          {
            title: 'Relational Joins, Group By & Filtering',
            description: 'Extracting clean data across multiple normalized database tables.',
            contentType: 'text',
            textContent: '# Relational SQL Essentials\n\nUnderstanding the difference between INNER, LEFT, RIGHT, and FULL OUTER joins when aggregating business metrics.',
            duration: '25 mins',
            sortOrder: 0,
            isPublished: true,
          },
          {
            title: 'Window Functions: RANK, DENSE_RANK & Running Totals',
            description: 'Calculating cumulative revenue and partitioned rankings.',
            contentType: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            textContent: '# SQL Window Functions\n\n```sql\nSELECT\n  order_id,\n  order_date,\n  amount,\n  SUM(amount) OVER (PARTITION BY customer_id ORDER BY order_date) as running_total\nFROM orders;\n```',
            duration: '35 mins',
            sortOrder: 1,
            isPublished: true,
          },
        ],
      },
    ],
  },
  {
    title: 'Full-Stack Web Engineering with React & Node',
    summary: 'Build complete, production-grade web applications with modern React state architectures, clean REST endpoints, and secure sessions.',
    description: `A hands-on, end-to-end full stack development masterclass. You will learn to construct responsive React single-page applications connected to robust Express and MongoDB backends. We dive deep into cookie-based JWT sessions, role-based access control, optimistic UI updates, error boundary resilience, and automated API testing.

By the end of the course, you will have built and deployed a production-ready web application adhering to industry security best practices.`,
    category: 'Development',
    level: 'Intermediate',
    estimatedDuration: '7 weeks',
    language: 'English',
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    learningObjectives: [
      'Architect modular React components with hooks, contexts, and clean routing.',
      'Design RESTful Express APIs with schema validation and structured error handling.',
      'Implement secure authentication using HttpOnly JWT cookies and password hashing.',
      'Write integration tests using Jest and Supertest.',
    ],
    prerequisites: 'Basic JavaScript familiarity (ES6+ syntax).',
    intendedAudience: 'Junior to intermediate web developers seeking full-stack proficiency.',
    status: 'published',
    publishedAt: new Date(),
    sections: [
      {
        title: 'Section 1: Frontend Architecture & Component State',
        description: 'Building predictable and responsive React interfaces.',
        sortOrder: 0,
        lessons: [
          {
            title: 'Component Decomposition & State Ownership',
            description: 'Lifting state, custom hooks, and preventing unnecessary re-renders.',
            contentType: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            textContent: '# React Component Architecture\n\nSeparating presentation components from container state logic enables effortless testability and UI reuse.',
            duration: '20 mins',
            sortOrder: 0,
            isPublished: true,
          },
          {
            title: 'Handling Async API Requests with AbortController',
            description: 'Preventing memory leaks and race conditions in React effects.',
            contentType: 'text',
            textContent: '# Async Data Fetching in React\n\nAlways pass an `AbortSignal` to prevent stale response state updates when users rapidly change routes or filter tabs.',
            duration: '15 mins',
            sortOrder: 1,
            isPublished: true,
          },
        ],
      },
      {
        title: 'Section 2: Secure Backend RESTful Architecture',
        description: 'Constructing robust Express backends with authentication & authorization.',
        sortOrder: 1,
        lessons: [
          {
            title: 'HttpOnly Cookie Authentication & Token Verification',
            description: 'Protecting user sessions against XSS and token interception attacks.',
            contentType: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            textContent: '# Secure Cookie Sessions\n\nHttpOnly cookies ensure client-side JavaScript cannot read sensitive session credentials.',
            duration: '28 mins',
            sortOrder: 0,
            isPublished: true,
          },
        ],
      },
    ],
  },
];

const seedCourses = async () => {
  try {
    await connectDB();

    // 1. Find or create an approved instructor
    let instructor = await User.findOne({ role: 'instructor', accountStatus: 'active' });

    if (!instructor) {
      logger.info('No active instructor found. Creating default verified instructor account...');
      instructor = await User.create({
        name: 'Elena Rostova',
        email: 'elena.instructor@learnspace.org',
        password: 'Password123!',
        role: 'instructor',
        accountStatus: 'active',
        emailVerified: true,
        bio: 'Staff Design Systems Architect & Educator with over 10 years experience building scalable web applications.',
      });
      logger.success(`Created verified instructor: ${instructor.email}`);
    } else {
      logger.info(`Using existing verified instructor: ${instructor.name} (${instructor.email})`);
    }

    // 2. Iterate and seed courses if not already present
    for (const cData of sampleCourses) {
      const existing = await Course.findOne({ title: cData.title });
      if (existing) {
        logger.info(`Course already exists: "${cData.title}". Updating status to published...`);
        existing.status = 'published';
        existing.publishedAt = existing.publishedAt || new Date();
        await existing.save();
      } else {
        const slug = await Course.generateSlug(cData.title);
        const course = await Course.create({
          ...cData,
          slug,
          instructor: instructor._id,
        });
        logger.success(`Seeded course: "${course.title}" (Slug: ${course.slug})`);
      }
    }

    const totalCourses = await Course.countDocuments({});
    const publishedCourses = await Course.countDocuments({ status: 'published' });
    logger.success(`Seeding complete. Total courses: ${totalCourses}, Published: ${publishedCourses}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error(`Course seeding failed: ${error.message}`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

seedCourses();

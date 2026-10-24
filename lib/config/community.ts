// ============================================
// DSRT Community — Categories, Skills, Types
// ============================================

export const CATEGORIES = [
  // Technology
  'Artificial Intelligence', 'Machine Learning', 'Web Development', 'Mobile Development',
  'Cloud Computing', 'Cybersecurity', 'Blockchain', 'Data Science', 'DevOps',
  'IoT', 'AR/VR', 'Robotics', 'Quantum Computing', 'Software Engineering',
  'Game Development', 'API Development', 'Database Systems', 'Embedded Systems',

  // Business & Finance
  'FinTech', 'Banking', 'Insurance', 'Investment', 'Cryptocurrency',
  'E-Commerce', 'D2C', 'B2B SaaS', 'Marketplace', 'Subscription Business',
  'Real Estate', 'PropTech', 'Wealth Management', 'Accounting',

  // Healthcare & Biotech
  'HealthTech', 'MedTech', 'Biotechnology', 'Pharmaceutical', 'Mental Health',
  'Wellness', 'Fitness', 'Nutrition', 'Telemedicine', 'Genomics',

  // Education
  'EdTech', 'Online Learning', 'K-12 Education', 'Higher Education',
  'Corporate Training', 'Language Learning', 'STEM Education',

  // Media & Entertainment
  'Content Creation', 'Streaming', 'Gaming', 'Music', 'Film & Video',
  'Publishing', 'Podcasting', 'Social Media', 'Sports', 'Esports',

  // Consumer & Lifestyle
  'Fashion', 'Beauty', 'Food & Beverage', 'Restaurant', 'Travel',
  'Hospitality', 'Home & Living', 'Pet Care', 'Parenting',

  // Industry
  'Manufacturing', 'Automotive', 'Aerospace', 'Defense', 'Construction',
  'Logistics', 'Supply Chain', 'Agriculture', 'AgriTech', 'Energy',
  'Renewable Energy', 'Mining', 'Chemicals',

  // Services & Professional
  'Legal Tech', 'HR Tech', 'Marketing', 'Advertising', 'PR',
  'Consulting', 'Design', 'Photography', 'Freelancing',

  // Impact & Social
  'Climate Tech', 'Sustainability', 'Social Impact', 'Non-Profit',
  'Government', 'Civic Tech', 'Diversity & Inclusion',

  // Emerging
  'Space Tech', 'Deep Tech', 'Nanotechnology', 'Longevity', 'Web3',
  'Creator Economy', 'Passion Economy',
] as const

export const SKILLS = [
  // Programming Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust',
  'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'Julia',
  'Dart', 'Elixir', 'Haskell', 'Clojure', 'Perl', 'Lua', 'Solidity', 'Assembly',

  // Frontend
  'React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'SolidJS', 'Nuxt.js',
  'HTML', 'CSS', 'Tailwind CSS', 'Sass', 'Bootstrap', 'Material UI',
  'Redux', 'Zustand', 'MobX', 'React Native', 'Flutter', 'Ionic',

  // Backend
  'Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring Boot',
  'Ruby on Rails', 'ASP.NET', 'Laravel', 'Phoenix', 'GraphQL', 'REST API',
  'gRPC', 'WebSockets', 'Microservices',

  // Databases
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB',
  'Cassandra', 'Neo4j', 'SQLite', 'Firebase', 'Supabase', 'Prisma',

  // Cloud & DevOps
  'AWS', 'Google Cloud', 'Azure', 'Vercel', 'Netlify', 'Heroku', 'Docker',
  'Kubernetes', 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions',
  'CircleCI', 'CI/CD', 'Linux', 'Nginx', 'Serverless',

  // Data & AI
  'Machine Learning', 'Deep Learning', 'Neural Networks', 'NLP', 'Computer Vision',
  'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy',
  'Data Analysis', 'Data Visualization', 'Tableau', 'Power BI', 'Jupyter',
  'Apache Spark', 'Hadoop', 'Airflow', 'MLOps', 'LLMs', 'Prompt Engineering',
  'RAG', 'Fine-tuning', 'LangChain', 'Vector Databases',

  // Mobile
  'iOS Development', 'Android Development', 'Cross-platform',

  // Design
  'UI Design', 'UX Design', 'Product Design', 'Figma', 'Sketch', 'Adobe XD',
  'Photoshop', 'Illustrator', 'InDesign', 'After Effects', 'Premiere Pro',
  'Blender', '3D Modeling', 'Motion Graphics', 'Typography', 'Design Systems',
  'Prototyping', 'User Research', 'Wireframing',

  // Blockchain
  'Ethereum', 'Bitcoin', 'Smart Contracts', 'Web3.js', 'Ethers.js', 'Hardhat',
  'DeFi', 'NFTs', 'Solana', 'Polygon',

  // Business Skills
  'Product Management', 'Project Management', 'Agile', 'Scrum', 'Kanban',
  'Business Strategy', 'Business Development', 'Sales', 'B2B Sales', 'SaaS Sales',
  'Marketing', 'Digital Marketing', 'SEO', 'SEM', 'Content Marketing',
  'Email Marketing', 'Growth Hacking', 'Performance Marketing', 'Brand Strategy',
  'Social Media Marketing', 'Influencer Marketing', 'Copywriting',
  'Public Relations', 'Community Management',

  // Finance & Legal
  'Financial Modeling', 'Fundraising', 'Venture Capital', 'Angel Investing',
  'Accounting', 'Bookkeeping', 'Tax Planning', 'M&A', 'Due Diligence',
  'Contract Law', 'IP Law', 'Compliance', 'GDPR',

  // Soft Skills
  'Leadership', 'Team Management', 'Public Speaking', 'Negotiation',
  'Mentoring', 'Coaching', 'Storytelling', 'Presentation', 'Writing',
  'Technical Writing', 'Documentation', 'Research',

  // Creative
  'Video Editing', 'Videography', 'Photography', 'Music Production',
  'Sound Design', 'Illustration', 'Animation', 'Art Direction',
  'Creative Writing', 'Screenwriting',

  // Trades & Physical
  'Cooking', 'Carpentry', 'Electrical Work', 'Plumbing', 'Welding',
  'Farming', 'Gardening', 'Fitness Training', 'Yoga Instruction',

  // Language
  'English', 'Hindi', 'Spanish', 'French', 'German', 'Mandarin', 'Japanese',
  'Korean', 'Arabic', 'Portuguese', 'Russian',

  // Analysis
  'Data Analytics', 'Business Analysis', 'Market Research', 'Competitive Analysis',
  'Statistical Analysis', 'A/B Testing', 'User Analytics',

  // Emerging
  'Quantum Programming', 'AR Development', 'VR Development', 'Game Design',
  'Unity', 'Unreal Engine', 'Robotics', 'Embedded C', 'FPGA',
] as const

export const POST_TYPES = [
  { id: 'post', label: 'Post', color: 'blue', icon: 'Article' },
  { id: 'project', label: 'Project', color: 'purple', icon: 'Code' },
  { id: 'venture', label: 'Venture', color: 'orange', icon: 'Rocket' },
  { id: 'looking_for', label: 'Looking For', color: 'green', icon: 'MagnifyingGlass' },
  { id: 'event', label: 'Event', color: 'pink', icon: 'CalendarBlank' },
  { id: 'resource', label: 'Resource', color: 'yellow', icon: 'Lightbulb' },
  { id: 'announcement', label: 'Announcement', color: 'red', icon: 'Megaphone' },
  { id: 'hackathon', label: 'Hackathon', color: 'cyan', icon: 'Trophy' },
] as const

export const CONTENT_TABS = [
  { id: 'all', label: 'All' },
  { id: 'for_you', label: 'For You' },
  { id: 'projects', label: 'Projects' },
  { id: 'ventures', label: 'Ventures' },
  { id: 'looking_for', label: 'Looking For' },
  { id: 'posts', label: 'Posts' },
  { id: 'events', label: 'Events' },
  { id: 'discussions', label: 'Discussions' },
  { id: 'opportunities', label: 'Opportunities' },
] as const

export const COMMUNITY_TABS = [
  { id: 'global', label: 'Global Community', icon: 'GlobeHemisphereWest' },
  { id: 'organization', label: 'My Organization', icon: 'Buildings' },
  { id: 'following', label: 'Following Communities', icon: 'UsersThree' },
] as const

export type PostCategory = typeof POST_TYPES[number]['id']
export type ContentTab = typeof CONTENT_TABS[number]['id']
export type CommunityTab = typeof COMMUNITY_TABS[number]['id']
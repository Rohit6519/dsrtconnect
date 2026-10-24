// ============================================================================
// PROJECT SEMANTIC QUERY PARSER
// ============================================================================
//
// Understands queries like:
//   "PyTorch NILM prototype"            → tech=[pytorch], keywords=[nilm], stage=prototype
//   "open source robotics in India"     → open_source, domains=[robotics], location=India
//   "ML research"                       → domains=[ai-ml], project_type=research
//   "hardware projects looking for engineers"
//     → domains=[hardware], collab=looking_for_collaborators
// ============================================================================

export interface ParsedProjectQuery {
  keywords: string[]
  domain_slugs: string[]
  domain_names: string[]
  technology_slugs: string[]
  technology_names: string[]
  location?: string
  stage?: string
  project_type?: string
  license?: string
  is_open_source?: boolean
  is_looking_for_collaborators?: boolean
  is_hiring?: boolean
  original: string
}

// ─── STAGE VOCABULARY ───
const STAGE_KEYWORDS: Record<string, string> = {
  'idea': 'idea',
  'ideation': 'idea',
  'planning': 'planning',
  'prototype': 'prototype',
  'prototyping': 'prototype',
  'building': 'building',
  'development': 'development',
  'in development': 'development',
  'testing': 'testing',
  'mvp': 'mvp',
  'minimum viable': 'mvp',
  'launched': 'launched',
  'live': 'launched',
  'shipped': 'launched',
  'maintaining': 'maintaining',
  'production': 'production',
  'in production': 'production',
  'research': 'research',
  'experiment': 'research',
  'completed': 'completed',
  'archived': 'archived',
  'on hold': 'on-hold',
  'paused': 'on-hold',
}

// ─── PROJECT TYPE VOCABULARY ───
const PROJECT_TYPE_KEYWORDS: Record<string, string> = {
  'startup': 'startup',
  'side project': 'personal',
  'side-project': 'personal',
  'personal project': 'personal',
  'hackathon': 'hackathon',
  'hackathon build': 'hackathon',
  'game jam': 'hackathon',
  'open source': 'open-source',
  'open-source': 'open-source',
  'oss': 'open-source',
  'learning': 'learning',
  'learning project': 'learning',
  'portfolio': 'portfolio',
  'portfolio project': 'portfolio',
  'portfolio piece': 'portfolio',
  'client work': 'client-work',
  'client project': 'client-work',
  'research': 'research',
  'research project': 'research',
  'academic': 'research',
  'mvp': 'mvp',
  'prototype': 'mvp',
  'bootcamp': 'bootcamp',
  'bootcamp project': 'bootcamp',
  'case study': 'case-study',
  'community': 'community',
  'community contribution': 'community',
  'creative': 'creative',
  'creative work': 'creative',
  'experiment': 'experiment',
}

// ─── LICENSE VOCABULARY ───
const LICENSE_KEYWORDS: Record<string, string> = {
  'mit': 'mit',
  'mit license': 'mit',
  'apache': 'apache-2.0',
  'apache 2': 'apache-2.0',
  'apache 2.0': 'apache-2.0',
  'gpl': 'gpl',
  'gplv3': 'gpl-3.0',
  'gpl v3': 'gpl-3.0',
  'gpl 3': 'gpl-3.0',
  'bsd': 'bsd',
  'mpl': 'mpl',
  'mozilla public': 'mpl',
  'unlicense': 'unlicense',
  'agpl': 'agpl',
}

// ─── DOMAIN SYNONYMS (maps aliases to canonical domain slugs) ───
const DOMAIN_SYNONYMS: Record<string, { name: string; slug: string; aliases: string[] }> = {
  'ai-ml': {
    name: 'AI / Machine Learning',
    slug: 'ai-ml',
    aliases: ['ai', 'ml', 'artificial intelligence', 'machine learning'],
  },
  'deep-learning': {
    name: 'Deep Learning',
    slug: 'deep-learning',
    aliases: ['dl', 'deep learning', 'neural network', 'neural networks'],
  },
  'computer-vision': {
    name: 'Computer Vision',
    slug: 'computer-vision',
    aliases: ['cv', 'computer vision', 'image recognition', 'vision'],
  },
  'nlp': {
    name: 'Natural Language Processing',
    slug: 'nlp',
    aliases: ['nlp', 'natural language', 'text processing', 'llm', 'language model'],
  },
  'gen-ai': {
    name: 'Generative AI',
    slug: 'gen-ai',
    aliases: ['generative ai', 'genai', 'gen ai', 'diffusion', 'text-to-image'],
  },
  'llm-apps': {
    name: 'LLM Applications',
    slug: 'llm-apps',
    aliases: ['llm', 'llm app', 'chatgpt clone', 'chatbot app'],
  },
  'ai-agents': {
    name: 'AI Agents',
    slug: 'ai-agents',
    aliases: ['agent', 'agents', 'agentic', 'autonomous agent'],
  },
  'robotics': {
    name: 'Robotics',
    slug: 'robotics',
    aliases: ['robot', 'robotics', 'robots', 'ros', 'autonomous system'],
  },
  'hardware': {
    name: 'Hardware Projects',
    slug: 'hardware',
    aliases: ['hardware', 'hw', 'electronics', 'circuit', 'pcb'],
  },
  'iot': {
    name: 'IoT Projects',
    slug: 'iot',
    aliases: ['iot', 'internet of things', 'connected device', 'smart device'],
  },
  'embedded': {
    name: 'Embedded Systems',
    slug: 'embedded',
    aliases: ['embedded', 'embedded system', 'firmware', 'microcontroller'],
  },
  'drones': {
    name: 'Drones',
    slug: 'drones',
    aliases: ['drone', 'drones', 'uav', 'quadcopter'],
  },
  'web-dev': {
    name: 'Web Development',
    slug: 'web-dev',
    aliases: ['web dev', 'website', 'web application', 'webapp'],
  },
  'mobile-dev': {
    name: 'Mobile Development',
    slug: 'mobile-dev',
    aliases: ['mobile', 'mobile app', 'ios app', 'android app'],
  },
  'game-dev': {
    name: 'Game Development',
    slug: 'game-dev',
    aliases: ['game', 'games', 'gamedev', 'game development'],
  },
  'devops': {
    name: 'DevOps',
    slug: 'devops',
    aliases: ['devops', 'sre', 'infrastructure', 'deployment'],
  },
  'cybersecurity': {
    name: 'Cybersecurity',
    slug: 'cybersecurity',
    aliases: ['security', 'cybersecurity', 'infosec', 'appsec'],
  },
  'data-science': {
    name: 'Data Science',
    slug: 'data-science',
    aliases: ['data science', 'analytics', 'data', 'data analysis'],
  },
  'blockchain': {
    name: 'Blockchain',
    slug: 'blockchain',
    aliases: ['blockchain', 'web3', 'crypto', 'defi', 'smart contract'],
  },
  'design-systems': {
    name: 'Design Systems',
    slug: 'design-systems',
    aliases: ['design system', 'ui library', 'component library'],
  },
  'ui-design': {
    name: 'UI Design',
    slug: 'ui-design',
    aliases: ['ui', 'user interface', 'interface design'],
  },
  'ux-design': {
    name: 'UX Design',
    slug: 'ux-design',
    aliases: ['ux', 'user experience', 'experience design'],
  },
  'research': {
    name: 'Research',
    slug: 'research',
    aliases: ['research', 'academic research', 'scientific research'],
  },
  'ai-research': {
    name: 'AI Research',
    slug: 'ai-research',
    aliases: ['ai research', 'ml research', 'ai paper'],
  },
  'accessibility': {
    name: 'Accessibility',
    slug: 'accessibility',
    aliases: ['a11y', 'accessibility', 'accessible design'],
  },
  'climate-action': {
    name: 'Climate Action',
    slug: 'climate-action',
    aliases: ['climate', 'climate tech', 'sustainability', 'cleantech'],
  },
  'social-impact': {
    name: 'Social Impact',
    slug: 'social-impact',
    aliases: ['social impact', 'nonprofit', 'social good', 'impact'],
  },
  'open-source': {
    name: 'Open Source',
    slug: 'open-source',
    aliases: ['open source', 'oss', 'foss', 'free software'],
  },
}

// ─── TECHNOLOGY SYNONYMS ───
const TECH_SYNONYMS: Record<string, { name: string; slug: string; aliases: string[] }> = {
  'python': { name: 'Python', slug: 'python', aliases: ['python', 'py'] },
  'javascript': { name: 'JavaScript', slug: 'javascript', aliases: ['javascript', 'js'] },
  'typescript': { name: 'TypeScript', slug: 'typescript', aliases: ['typescript', 'ts'] },
  'rust': { name: 'Rust', slug: 'rust', aliases: ['rust', 'rustlang'] },
  'go': { name: 'Go', slug: 'go', aliases: ['golang'] },
  'java': { name: 'Java', slug: 'java', aliases: ['java'] },
  'cpp': { name: 'C++', slug: 'cpp', aliases: ['cpp', 'c++', 'cplusplus'] },
  'swift': { name: 'Swift', slug: 'swift', aliases: ['swift', 'swiftui'] },
  'kotlin': { name: 'Kotlin', slug: 'kotlin', aliases: ['kotlin'] },
  'react': { name: 'React', slug: 'react', aliases: ['react', 'reactjs', 'react.js'] },
  'nextjs': { name: 'Next.js', slug: 'nextjs', aliases: ['nextjs', 'next.js', 'next'] },
  'vue': { name: 'Vue.js', slug: 'vue', aliases: ['vue', 'vuejs', 'vue.js'] },
  'svelte': { name: 'Svelte', slug: 'svelte', aliases: ['svelte', 'sveltekit'] },
  'nodejs': { name: 'Node.js', slug: 'nodejs', aliases: ['node', 'nodejs', 'node.js'] },
  'django': { name: 'Django', slug: 'django', aliases: ['django'] },
  'fastapi': { name: 'FastAPI', slug: 'fastapi', aliases: ['fastapi'] },
  'flask': { name: 'Flask', slug: 'flask', aliases: ['flask'] },
  'rails': { name: 'Ruby on Rails', slug: 'rails', aliases: ['rails', 'ruby on rails', 'ror'] },
  'pytorch': { name: 'PyTorch', slug: 'pytorch', aliases: ['pytorch', 'torch'] },
  'tensorflow': { name: 'TensorFlow', slug: 'tensorflow', aliases: ['tensorflow', 'tf'] },
  'huggingface': { name: 'Hugging Face', slug: 'huggingface', aliases: ['hugging face', 'huggingface', 'hf', 'transformers'] },
  'langchain': { name: 'LangChain', slug: 'langchain', aliases: ['langchain'] },
  'openai-sdk': { name: 'OpenAI SDK', slug: 'openai-sdk', aliases: ['openai', 'gpt', 'chatgpt'] },
  'opencv': { name: 'OpenCV', slug: 'opencv', aliases: ['opencv', 'cv2'] },
  'postgresql': { name: 'PostgreSQL', slug: 'postgresql', aliases: ['postgres', 'postgresql', 'pg'] },
  'mongodb': { name: 'MongoDB', slug: 'mongodb', aliases: ['mongo', 'mongodb'] },
  'redis-tech': { name: 'Redis', slug: 'redis-tech', aliases: ['redis'] },
  'supabase': { name: 'Supabase', slug: 'supabase', aliases: ['supabase'] },
  'firebase': { name: 'Firebase', slug: 'firebase', aliases: ['firebase'] },
  'docker': { name: 'Docker', slug: 'docker-tech', aliases: ['docker', 'containers'] },
  'kubernetes': { name: 'Kubernetes', slug: 'kubernetes-tech', aliases: ['kubernetes', 'k8s'] },
  'aws-tech': { name: 'AWS', slug: 'aws-tech', aliases: ['aws', 'amazon web services'] },
  'arduino': { name: 'Arduino', slug: 'arduino-tech', aliases: ['arduino'] },
  'raspberry-pi': { name: 'Raspberry Pi', slug: 'raspberry-pi-tech', aliases: ['raspberry pi', 'rpi', 'raspi'] },
  'esp32': { name: 'ESP32', slug: 'esp32-tech', aliases: ['esp32', 'esp'] },
  'ros': { name: 'ROS', slug: 'ros-tech', aliases: ['ros', 'ros2', 'robot operating system'] },
  'unity': { name: 'Unity', slug: 'unity-tech', aliases: ['unity', 'unity3d'] },
  'unreal': { name: 'Unreal Engine', slug: 'unreal-tech', aliases: ['unreal', 'ue5', 'unreal engine'] },
  'godot': { name: 'Godot', slug: 'godot-tech', aliases: ['godot'] },
  'figma': { name: 'Figma', slug: 'figma', aliases: ['figma'] },
  'blender': { name: 'Blender', slug: 'blender-tech', aliases: ['blender'] },
  'solidity': { name: 'Solidity', slug: 'solidity-lang', aliases: ['solidity'] },
  'ethereum': { name: 'Ethereum', slug: 'ethereum-tech', aliases: ['ethereum', 'eth', 'evm'] },
}

// ─── LOCATIONS ───
const LOCATION_KEYWORDS = [
  'india', 'usa', 'united states', 'uk', 'united kingdom', 'japan', 'china',
  'germany', 'france', 'canada', 'australia', 'singapore', 'brazil', 'mexico',
  'south korea', 'korea', 'netherlands', 'sweden', 'norway', 'denmark',
  'switzerland', 'italy', 'spain', 'ireland', 'israel', 'uae', 'dubai',
  'bangalore', 'bengaluru', 'mumbai', 'delhi', 'chennai', 'hyderabad', 'pune',
  'new york', 'san francisco', 'los angeles', 'boston', 'seattle', 'austin',
  'london', 'paris', 'berlin', 'amsterdam', 'stockholm', 'zurich',
  'tokyo', 'osaka', 'seoul', 'beijing', 'shanghai', 'hong kong', 'taipei',
  'sydney', 'melbourne', 'toronto', 'vancouver',
]

// ─── INTENT DETECTORS ───
const OPEN_SOURCE_INTENT = /\b(open\s?source|open-source|oss|foss)\b/i
const COLLAB_INTENT = /\b(looking for|seeking|need|want)\s+(collaborator|contributor|co-?founder|help|team)/i
const HIRING_INTENT = /\b(hiring|jobs?|roles?|opportunities|open positions?)\b/i

// ─── STOP WORDS ───
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'of', 'for', 'to', 'from', 'by', 'with',
  'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'that', 'this', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'built', 'building', 'creates', 'made', 'making', 'project', 'projects',
  'app', 'apps', 'application', 'thing', 'stuff',
])

export function parseProjectQuery(query: string): ParsedProjectQuery {
  const result: ParsedProjectQuery = {
    keywords: [],
    domain_slugs: [],
    domain_names: [],
    technology_slugs: [],
    technology_names: [],
    original: query,
  }

  if (!query || !query.trim()) return result

  const q = query.toLowerCase().trim()

  // 1. Detect intents (order matters: check more specific first)
  if (COLLAB_INTENT.test(q)) result.is_looking_for_collaborators = true
  if (HIRING_INTENT.test(q)) result.is_hiring = true
  if (OPEN_SOURCE_INTENT.test(q)) result.is_open_source = true

  // 2. Detect stage (only first match wins)
  for (const [phrase, stage] of Object.entries(STAGE_KEYWORDS)) {
    if (q.includes(phrase)) {
      result.stage = stage
      break
    }
  }

  // 3. Detect project type
  for (const [phrase, type] of Object.entries(PROJECT_TYPE_KEYWORDS)) {
    if (q.includes(phrase)) {
      result.project_type = type
      break
    }
  }

  // 4. Detect license
  for (const [phrase, license] of Object.entries(LICENSE_KEYWORDS)) {
    if (new RegExp(`\\b${phrase}\\b`, 'i').test(q)) {
      result.license = license
      break
    }
  }

  // 5. Detect location
  for (const loc of LOCATION_KEYWORDS) {
    if (new RegExp(`\\b${loc}\\b`, 'i').test(q)) {
      result.location = loc
        .split(' ')
        .map(w => w[0].toUpperCase() + w.slice(1))
        .join(' ')
      break
    }
  }

  // 6. Detect domains
  const detectedDomains = new Set<string>()
  for (const [slug, dom] of Object.entries(DOMAIN_SYNONYMS)) {
    for (const alias of dom.aliases) {
      if (new RegExp(`\\b${alias}\\b`, 'i').test(q)) {
        detectedDomains.add(slug)
        break
      }
    }
  }
  result.domain_slugs = Array.from(detectedDomains)
  result.domain_names = result.domain_slugs.map(s => DOMAIN_SYNONYMS[s].name)

  // 7. Detect technologies
  const detectedTech = new Set<string>()
  for (const [slug, tech] of Object.entries(TECH_SYNONYMS)) {
    for (const alias of tech.aliases) {
      if (new RegExp(`\\b${alias}\\b`, 'i').test(q)) {
        detectedTech.add(slug)
        break
      }
    }
  }
  result.technology_slugs = Array.from(detectedTech)
  result.technology_names = result.technology_slugs.map(s => TECH_SYNONYMS[s].name)

  // 8. Extract residual keywords
  let residual = q

  const allPhrases = [
    ...LOCATION_KEYWORDS,
    ...Object.keys(STAGE_KEYWORDS),
    ...Object.keys(PROJECT_TYPE_KEYWORDS),
    ...Object.keys(LICENSE_KEYWORDS),
    ...Object.values(DOMAIN_SYNONYMS).flatMap(d => d.aliases),
    ...Object.values(TECH_SYNONYMS).flatMap(t => t.aliases),
  ]

  for (const phrase of allPhrases) {
    residual = residual.replace(new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), ' ')
  }

  residual = residual
    .replace(OPEN_SOURCE_INTENT, ' ')
    .replace(COLLAB_INTENT, ' ')
    .replace(HIRING_INTENT, ' ')

  const words = residual
    .split(/\s+/)
    .map(w => w.replace(/[^a-z0-9-]/gi, ''))
    .filter(w => w.length > 1 && !STOP_WORDS.has(w))

  result.keywords = Array.from(new Set(words))

  return result
}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to extract clean component display name
function getComponentName(filePath, fileName) {
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  if (['index', 'main', 'app', 'base', 'server'].includes(baseName.toLowerCase())) {
    const parts = filePath.split('/');
    if (parts.length > 1) {
      const parent = parts[parts.length - 2];
      if (parent && !['src', 'pages', 'components', 'templates', 'views', 'controllers', 'routes', 'services'].includes(parent.toLowerCase())) {
        return `${parent} (${fileName})`;
      }
    }
  }
  if (fileName.includes('.routes.')) return fileName.replace('.routes.', ' Route (').replace(/\.[^/.]+$/, ')');
  if (fileName.includes('.controller.')) return fileName.replace('.controller.', ' Controller (').replace(/\.[^/.]+$/, ')');
  if (fileName.includes('.service.')) return fileName.replace('.service.', ' Service (').replace(/\.[^/.]+$/, ')');
  if (fileName.includes('.middleware.')) return fileName.replace('.middleware.', ' Guard (').replace(/\.[^/.]+$/, ')');
  if (fileName === 'schema.prisma') return 'Prisma Schema (Models)';
  return fileName;
}

// Classify file into architectural tier
function classifyFile(f) {
  const p = f.path.toLowerCase().replace(/\\/g, '/');
  const n = f.name.toLowerCase();

  // Noise / build metadata files to exclude
  if (['.gitignore', '.gitattributes', '.dockerignore', '.oxlintrc.json', 'readme.md', 
       'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.keep', '.gitkeep', 'metadata.json'].includes(n)) {
    return null;
  }

  // Infrastructure & Configuration Tier (checked before folder-based checks)
  if (n === 'dockerfile' || n.startsWith('docker-compose') || n === 'package.json' || 
      n.includes('vite.config') || n.includes('webpack') || n.includes('tsconfig') || 
      n.startsWith('.env') || n === 'requirements.txt' || n === 'procfile' || 
      n === 'config.py' || n === 'settings.py' || n.includes('eslint') || n.includes('prettier')) {
    return {
      tier: 'infra',
      role: 'Configuration / DevOps',
      icon: 'deployed_code',
      desc: 'Defines build setup, containerization, or environment configuration.'
    };
  }

  // AI & Intelligence Tier
  if (p.includes('rag') || p.includes('embedding') || p.includes('vector') || 
      n.includes('gemini') || n.includes('openai') || n.includes('ai_') || n.includes('ai.') ||
      n.includes('rag.') || n.includes('embedding.') || p.includes('llm') || 
      p.includes('model_inference') || n.includes('matcher') || n.includes('classifier')) {
    return {
      tier: 'ai',
      role: 'AI / Intelligent Module',
      icon: 'psychology',
      desc: 'Powers machine learning inference, semantic search, or AI reasoning.'
    };
  }

  // Data Persistence & Storage Tier
  if (n === 'schema.prisma' || p.includes('models/') || p.includes('entities/') || 
      p.includes('migrations/') || p.includes('database/') || p.includes('db/') || 
      p.includes('repositories/') || n.endsWith('.model.js') || n.endsWith('.model.ts') || 
      n.endsWith('.entity.ts') || n.endsWith('.entity.js') || n.endsWith('.sql') || 
      n === 'models.py' || n === 'database.py' || n === 'db.py' || n === 'seed.py' || 
      n.endsWith('.csv') || n.endsWith('.sqlite') || n.endsWith('.db')) {
    return {
      tier: 'data',
      role: 'Data Model / Storage',
      icon: 'database',
      desc: 'Manages database schemas, persistence models, or dataset storage.'
    };
  }

  // API & Gateway Tier
  if (p.includes('routes/') || p.includes('controllers/') || p.includes('middleware/') || 
      p.includes('api/') || p.includes('endpoints/') || n.includes('.routes.') || 
      n.includes('.controller.') || n.includes('.middleware.') || n === 'server.js' || 
      n === 'app.js' || n === 'app.py' || n === 'main.py' || n === 'server.py' || 
      n === 'api.js' || n.endsWith('controller.js') || n.endsWith('routes.js') || n.endsWith('middleware.js')) {
    const isMiddleware = p.includes('middleware') || n.includes('middleware');
    const isRoute = p.includes('routes') || n.includes('routes');
    return {
      tier: 'api',
      role: isMiddleware ? 'Security / Middleware' : isRoute ? 'API Route Handler' : 'API Controller / Gateway',
      icon: isMiddleware ? 'shield' : isRoute ? 'alt_route' : 'api',
      desc: isMiddleware ? 'Request filtering, authentication, and validation.' : 'Handles HTTP requests and API routing.'
    };
  }

  // Client / Presentation Tier
  if (p.includes('frontend/') || p.includes('client/') || p.includes('web/') || 
      p.includes('/pages/') || p.includes('/components/') || p.includes('/views/') || 
      p.includes('/screens/') || p.includes('templates/') || p.includes('static/') || 
      n.endsWith('.jsx') || n.endsWith('.tsx') || n.endsWith('.vue') || n.endsWith('.svelte') || 
      n.endsWith('.html') || (p.includes('src/') && (n.endsWith('.css') || n.endsWith('.scss')))) {
    const isPage = p.includes('pages/') || p.includes('views/') || p.includes('screens/') || p.includes('templates/');
    return {
      tier: 'client',
      role: isPage ? 'UI View / Page' : 'UI Component',
      icon: isPage ? 'dashboard' : 'web',
      desc: isPage ? 'Primary user interface view or page.' : 'Reusable client-side interface component.'
    };
  }

  // Application & Business Logic Tier
  if (p.includes('services/') || p.includes('modules/') || p.includes('managers/') || 
      p.includes('domain/') || p.includes('core/') || p.includes('lib/') || 
      p.includes('utils/') || p.includes('helpers/') || n.includes('.service.') || 
      n.endsWith('.service.js') || n.endsWith('service.js') || n.endsWith('.py') || 
      n.endsWith('.js') || n.endsWith('.ts')) {
    return {
      tier: 'services',
      role: 'Domain Service / Logic',
      icon: 'settings_suggest',
      desc: 'Executes core application business rules, processing, and services.'
    };
  }

  return null;
}

function buildDeterministicArchitecture(files, technologies = {}) {
  const buckets = {
    client: [],
    api: [],
    services: [],
    data: [],
    ai: [],
    infra: []
  };

  files.forEach(f => {
    const classification = classifyFile(f);
    if (classification) {
      buckets[classification.tier].push({
        name: getComponentName(f.path, f.name),
        type: classification.role,
        icon: classification.icon,
        file: f.path,
        desc: classification.desc
      });
    }
  });

  const layerDefs = [
    { key: 'client', name: 'Client / Presentation Tier', desc: 'Handles user interface rendering, client-side routing, user interactions, and visual presentation.' },
    { key: 'api', name: 'API & Gateway Tier', desc: 'Exposes HTTP/REST endpoints, manages request routing, authentication guards, and API controllers.' },
    { key: 'services', name: 'Application & Business Logic Tier', desc: 'Encapsulates domain logic, service workflows, data transformations, and core application rules.' },
    { key: 'data', name: 'Persistence & Data Tier', desc: 'Manages database schemas, relational models, migrations, and data storage access.' },
    { key: 'ai', name: 'AI & Intelligence Tier', desc: 'Powers vector embeddings, semantic retrieval, RAG pipelines, and AI model orchestration.' },
    { key: 'infra', name: 'Infrastructure & Configuration Tier', desc: 'Configures containerization, environment definitions, package dependencies, and build tooling.' }
  ];

  const resultLayers = [];
  layerDefs.forEach(def => {
    const nodes = buckets[def.key];
    if (nodes && nodes.length > 0) {
      const layerIndex = resultLayers.length + 1;
      resultLayers.push({
        layerName: def.name,
        badge: `LAYER ${layerIndex}`,
        description: def.desc,
        nodes: nodes.slice(0, 20).map((n, i) => ({
          id: `node-${def.key}-${i + 1}`,
          ...n
        }))
      });
    }
  });

  let architectureType = 'Modular Multi-Tier Architecture';
  const hasClient = buckets.client.length > 0;
  const hasApi = buckets.api.length > 0;
  const hasServices = buckets.services.length > 0;
  const hasAi = buckets.ai.length > 0;
  const hasData = buckets.data.length > 0;

  if (hasClient && (hasApi || hasServices)) {
    architectureType = hasAi ? 'AI-Powered Full-Stack Architecture' : 'Full-Stack Architecture';
  } else if (hasClient) {
    architectureType = 'Client-Side SPA Architecture';
  } else if (hasApi || hasServices) {
    architectureType = hasAi ? 'AI-Augmented Backend Microservice Architecture' : 'Backend Service Architecture';
  }

  const summary = `System architecture decomposed into ${resultLayers.length} distinct tiers (${resultLayers.map(l => l.layerName.split(' ')[0]).join(', ')}), featuring ${files.length} indexed files.`;

  return {
    layers: resultLayers,
    summary,
    architectureType
  };
}

// Tolerant file lookup for grounding AI responses
function createPathLookup(files) {
  const exactMap = new Map();
  const normalizedMap = new Map();
  const nameMap = new Map();

  files.forEach(f => {
    exactMap.set(f.path, f.path);
    const norm = f.path.replace(/\\/g, '/').replace(/^\.?\//, '').toLowerCase();
    normalizedMap.set(norm, f.path);
    
    const n = f.name.toLowerCase();
    if (!nameMap.has(n)) {
      nameMap.set(n, f.path);
    }
  });

  return {
    resolve(rawPath) {
      if (!rawPath) return null;
      if (exactMap.has(rawPath)) return exactMap.get(rawPath);
      const norm = rawPath.replace(/\\/g, '/').replace(/^\.?\//, '').toLowerCase();
      if (normalizedMap.has(norm)) return normalizedMap.get(norm);
      // Try resolving by base filename
      const baseName = norm.split('/').pop();
      if (nameMap.has(baseName)) return nameMap.get(baseName);
      return null;
    }
  };
}

module.exports = {
  getComponentName,
  classifyFile,
  buildDeterministicArchitecture,
  createPathLookup
};

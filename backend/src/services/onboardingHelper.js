function generateDeterministicOnboarding(repository, files, architecture = null) {
  const filePaths = new Set(files.map(f => f.path));
  const fileMap = new Map(files.map(f => [f.name, f]));

  // 1. Technologies
  const techSet = new Set();
  const pkgFile = files.find(f => f.name === 'package.json');
  if (pkgFile && pkgFile.content) {
    try {
      const pkg = JSON.parse(pkgFile.content);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (allDeps['react']) techSet.add('React');
      if (allDeps['vue']) techSet.add('Vue');
      if (allDeps['vite']) techSet.add('Vite');
      if (allDeps['express']) techSet.add('Express');
      if (allDeps['fastify']) techSet.add('Fastify');
      if (allDeps['@prisma/client']) techSet.add('Prisma ORM');
      if (allDeps['pg']) techSet.add('PostgreSQL');
      if (allDeps['mongoose']) techSet.add('MongoDB');
      if (allDeps['@google/genai'] || allDeps['@google/generative-ai']) techSet.add('Google Gemini');
      if (allDeps['openai']) techSet.add('OpenAI');
      if (allDeps['tailwindcss']) techSet.add('Tailwind CSS');
      if (allDeps['typescript']) techSet.add('TypeScript');
    } catch (e) {}
  }

  const reqFile = files.find(f => f.name === 'requirements.txt');
  if (reqFile && reqFile.content) {
    const text = reqFile.content.toLowerCase();
    if (text.includes('flask')) techSet.add('Flask');
    if (text.includes('fastapi')) techSet.add('FastAPI');
    if (text.includes('django')) techSet.add('Django');
    if (text.includes('torch') || text.includes('pytorch')) techSet.add('PyTorch');
    if (text.includes('tensorflow')) techSet.add('TensorFlow');
    if (text.includes('pandas')) techSet.add('Pandas');
    if (text.includes('psycopg')) techSet.add('PostgreSQL');
  }

  if (files.some(f => f.name === 'schema.prisma')) {
    techSet.add('Prisma ORM');
    techSet.add('PostgreSQL');
  }
  if (files.some(f => f.name.endsWith('.jsx') || f.name.endsWith('.tsx'))) {
    techSet.add('React');
  }
  if (files.some(f => f.name.endsWith('.py'))) {
    techSet.add('Python');
  }
  if (files.some(f => f.name.endsWith('.js') || f.name.endsWith('.ts'))) {
    techSet.add('Node.js');
  }

  // 2. Entry points
  const candidateEntryNames = ['server.js', 'app.js', 'app.py', 'main.py', 'main.jsx', 'main.tsx', 'index.js', 'index.jsx', 'App.jsx'];
  const entryPoints = [];
  files.forEach(f => {
    if (candidateEntryNames.includes(f.name) && entryPoints.length < 5) {
      let role = 'Application Entry Point';
      let desc = `Mounts and configures ${f.name}.`;
      if (f.name === 'server.js' || f.name === 'app.js') {
        role = 'Backend Server Entry';
        desc = 'Configures Express middleware, API routes, and network listeners.';
      } else if (f.name === 'app.py' || f.name === 'main.py') {
        role = 'Python Application Entry';
        desc = 'Initializes backend application routing and configuration.';
      } else if (f.name === 'main.jsx' || f.name === 'main.tsx') {
        role = 'Frontend Client Mount';
        desc = 'Renders root React components and mounts client-side providers.';
      } else if (f.name === 'App.jsx') {
        role = 'Frontend Root Component';
        desc = 'Houses main navigation layout and top-level client routes.';
      }

      entryPoints.push({
        filePath: f.path,
        role,
        description: desc
      });
    }
  });

  // 3. Important directories
  const dirCounts = {};
  files.forEach(f => {
    const parts = f.path.split('/');
    if (parts.length > 1) {
      const dir = parts.slice(0, parts.length - 1).join('/');
      dirCounts[dir] = (dirCounts[dir] || 0) + 1;
    }
  });

  const dirPurposeMap = {
    'routes': 'Defines HTTP/REST endpoints and request routing',
    'controllers': 'Processes incoming requests and invokes services',
    'services': 'Implements core application business logic and orchestration',
    'middleware': 'Handles request interception, authentication, and validation',
    'models': 'Declares database schemas, relational models, and entities',
    'pages': 'Renders top-level user interface views and pages',
    'components': 'Reusable UI presentation components and widgets',
    'modules': 'Specialized application feature modules and domain logic',
    'database': 'Database migration scripts, seed data, and schema definitions',
    'templates': 'Server-rendered HTML view templates'
  };

  const importantDirectories = [];
  Object.keys(dirCounts).forEach(dir => {
    const lastSegment = dir.split('/').pop().toLowerCase();
    if (dirPurposeMap[lastSegment] && importantDirectories.length < 6) {
      importantDirectories.push({
        path: dir,
        purpose: dirPurposeMap[lastSegment]
      });
    }
  });

  // 4. Important files
  const importantFiles = [];
  const targetFiles = [
    { name: 'README.md', desc: 'Project documentation and overview', reason: 'Provides setup guidelines and architectural overview.' },
    { name: 'package.json', desc: 'Node package manifest', reason: 'Defines runtime dependencies and executable scripts.' },
    { name: 'schema.prisma', desc: 'Prisma database schema', reason: 'Specifies data models, relations, and database migrations.' },
    { name: 'requirements.txt', desc: 'Python package dependencies', reason: 'Lists required Python packages for runtime execution.' },
    { name: 'docker-compose.yml', desc: 'Multi-container orchestration', reason: 'Defines multi-service development infrastructure.' },
    { name: 'Dockerfile', desc: 'Container build definition', reason: 'Specifies containerized build and runtime environments.' },
    { name: '.env.example', desc: 'Environment variable template', reason: 'Documents required configuration keys and secrets.' }
  ];

  targetFiles.forEach(tf => {
    const match = files.find(f => f.name.toLowerCase() === tf.name.toLowerCase());
    if (match) {
      importantFiles.push({
        filePath: match.path,
        description: tf.desc,
        reason: tf.reason
      });
    }
  });

  // 5. Development flow
  const developmentFlow = [
    { step: 1, description: 'User interacts with the frontend views or sends HTTP requests to the system API.' },
    { step: 2, description: 'Requests are inspected and authenticated by security middleware and routed to specific endpoint controllers.' },
    { step: 3, description: 'Controllers delegate processing to application services implementing domain rules and business workflows.' },
    { step: 4, description: 'Services query or persist relational data using the persistence tier models and database clients.' },
    { step: 5, description: 'Structured JSON responses are returned to the client and rendered in the user interface.' }
  ];

  // 6. Setup requirements, commands & environment variables
  const reqs = [];
  const commands = [];
  if (techSet.has('Node.js') || techSet.has('React')) {
    reqs.push('Node.js (v18+)');
    commands.push('npm install');
    commands.push('npm run dev');
  }
  if (techSet.has('Python')) {
    reqs.push('Python 3.10+');
    commands.push('pip install -r requirements.txt');
    commands.push('python app.py');
  }
  if (files.some(f => f.name.startsWith('docker'))) {
    reqs.push('Docker & Docker Compose');
    commands.push('docker-compose up -d');
  }
  if (techSet.has('PostgreSQL') || techSet.has('Prisma ORM')) {
    reqs.push('PostgreSQL Database');
    commands.push('npx prisma migrate dev');
  }

  const envVars = [];
  const envExample = files.find(f => f.name.startsWith('.env'));
  if (envExample && envExample.content) {
    const lines = envExample.content.split('\n');
    lines.forEach(l => {
      const trimmed = l.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const key = trimmed.split('=')[0].trim();
        if (key && !envVars.includes(key)) envVars.push(key);
      }
    });
  }
  if (envVars.length === 0) {
    if (techSet.has('PostgreSQL')) envVars.push('DATABASE_URL');
    if (techSet.has('Node.js')) envVars.push('PORT');
  }

  // 7. Recommended reading order
  const recommendedReadingOrder = [];
  if (filePaths.has('README.md') || files.some(f => f.name === 'README.md')) {
    const r = files.find(f => f.name === 'README.md');
    recommendedReadingOrder.push({ filePath: r.path, reason: 'Provides fundamental project context, features, and setup.' });
  }
  importantFiles.forEach(f => {
    if (f.filePath !== 'README.md' && recommendedReadingOrder.length < 4) {
      recommendedReadingOrder.push({ filePath: f.filePath, reason: f.reason });
    }
  });

  const overviewSummary = architecture?.summary || 
    `${repository.name} is a modern software application structured into ${architecture?.analysisData?.layers?.length || 'multiple'} tiers, featuring ${Array.from(techSet).join(', ')}.`;

  const overviewPurpose = `${repository.name} provides automated tools and services built with ${Array.from(techSet).slice(0, 3).join(', ')}.`;

  return {
    overview: {
      summary: overviewSummary,
      purpose: overviewPurpose
    },
    technologies: Array.from(techSet),
    entryPoints,
    importantDirectories,
    importantFiles,
    developmentFlow,
    setup: {
      requirements: reqs.length > 0 ? reqs : ['Node.js (v18+)'],
      commands: commands.length > 0 ? commands : ['npm install', 'npm start'],
      environmentVariables: envVars
    },
    recommendedReadingOrder
  };
}

module.exports = {
  generateDeterministicOnboarding
};

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const geminiService = require('./geminiService');
const {
  getComponentName,
  classifyFile,
  buildDeterministicArchitecture,
  createPathLookup
} = require('./architectureHelper');

const hasAi = !!process.env.GEMINI_API_KEY;

const getArchitecture = async (repositoryId) => {
  const architecture = await prisma.repositoryArchitecture.findUnique({
    where: { repositoryId }
  });
  
  if (!architecture) return null;
  
  // Check if stale
  const repository = await prisma.repository.findUnique({
    where: { id: repositoryId },
    select: { latestCommitSha: true, ingestionStatus: true }
  });

  if (repository && repository.latestCommitSha && architecture.commitSha !== repository.latestCommitSha) {
    architecture.status = 'STALE';
  }

  // Self-heal: If existing record suffers from legacy single-layer bug, automatically upgrade it to all required layers
  const existingLayers = architecture.analysisData?.layers;
  const isLegacySingleLayer = architecture.status === 'COMPLETED' && (
    !existingLayers || 
    existingLayers.length <= 1 || 
    existingLayers[0]?.layerName === 'Auto-detected Components'
  );

  if (isLegacySingleLayer) {
    try {
      const files = await prisma.repositoryFile.findMany({
        where: { repositoryId },
        select: { path: true, name: true, language: true, content: true }
      });

      if (files.length > 0) {
        const repaired = buildDeterministicArchitecture(files);
        if (repaired.layers.length > 1) {
          architecture.analysisData = { ...architecture.analysisData, layers: repaired.layers };
          if (!architecture.summary || architecture.summary.includes('Auto-detected') || architecture.summary.includes('deterministically')) {
            architecture.summary = repaired.summary;
          }
          if (!architecture.architectureType || architecture.architectureType === 'Unknown Architecture') {
            architecture.architectureType = repaired.architectureType;
          }

          // Persist the repaired architecture
          await prisma.repositoryArchitecture.update({
            where: { repositoryId },
            data: {
              analysisData: architecture.analysisData,
              summary: architecture.summary,
              architectureType: architecture.architectureType
            }
          });
        }
      }
    } catch (healError) {
      console.warn('Auto-heal architecture check failed:', healError.message);
    }
  }

  return architecture;
};

const generateArchitecture = async (repositoryId) => {
  try {
    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId }
    });

    if (!repository) throw new Error('Repository not found');
    
    // Create or update status to ANALYZING
    await prisma.repositoryArchitecture.upsert({
      where: { repositoryId },
      update: { status: 'ANALYZING', error: null },
      create: {
        repositoryId,
        commitSha: repository.latestCommitSha || 'unknown',
        status: 'ANALYZING'
      }
    });

    // 1. Fetch indexed repository files
    const files = await prisma.repositoryFile.findMany({
      where: { repositoryId },
      select: { path: true, name: true, language: true, content: true }
    });

    if (files.length === 0) {
      await updateArchitectureStatus(repositoryId, 'FAILED', 'No files indexed to analyze');
      return;
    }

    // 2. Extract technologies & project structure
    const projectStructure = {};
    const entryPoints = [];
    const frontendTech = new Set();
    const backendTech = new Set();
    const dbTech = new Set();
    const aiTech = new Set();

    files.forEach(f => {
      const parts = f.path.split('/');
      const rootDir = parts.length > 1 ? parts[0] : '/';
      if (!projectStructure[rootDir]) projectStructure[rootDir] = 0;
      projectStructure[rootDir]++;

      if (['main.js', 'main.jsx', 'index.js', 'index.jsx', 'App.jsx', 'server.js', 'app.js', 'app.py', 'main.py'].includes(f.name)) {
        entryPoints.push(f.path);
      }

      if (f.name === 'package.json' && f.content) {
        try {
          const pkg = JSON.parse(f.content);
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          if (deps['react']) frontendTech.add('React');
          if (deps['vue']) frontendTech.add('Vue');
          if (deps['vite']) frontendTech.add('Vite');
          if (deps['express']) backendTech.add('Express');
          if (deps['fastify']) backendTech.add('Fastify');
          if (deps['@prisma/client']) dbTech.add('Prisma');
          if (deps['pg']) dbTech.add('PostgreSQL');
          if (deps['mongoose']) dbTech.add('MongoDB');
          if (deps['@google/generative-ai'] || deps['@google/genai']) aiTech.add('Gemini');
          if (deps['openai']) aiTech.add('OpenAI');
        } catch (e) {}
      }
      if (f.name === 'schema.prisma') {
        dbTech.add('Prisma');
        dbTech.add('PostgreSQL');
      }
      if (f.path.includes('pgvector') || (f.content && f.content.includes('vector('))) {
        dbTech.add('pgvector');
      }
      if (f.content && (f.content.includes('GoogleGenerativeAI') || f.content.includes('GoogleGenAI'))) {
        aiTech.add('Gemini');
      }
    });

    // 3. Build comprehensive deterministic multi-layer baseline
    const deterministicArch = buildDeterministicArchitecture(files, {
      frontendTech: Array.from(frontendTech),
      backendTech: Array.from(backendTech),
      dbTech: Array.from(dbTech),
      aiTech: Array.from(aiTech)
    });

    let summary = deterministicArch.summary;
    let architectureType = deterministicArch.architectureType;
    let finalLayers = deterministicArch.layers;

    // 4. Gemini AI Synthesis (when enabled)
    if (hasAi) {
      try {
        const pathLookup = createPathLookup(files);
        
        // Prepare context categorized by candidate tiers to guide Gemini
        const categorizedContext = {};
        deterministicArch.layers.forEach(l => {
          categorizedContext[l.layerName] = l.nodes.map(n => ({
            name: n.name,
            file: n.file,
            type: n.type
          }));
        });

        const prompt = `
          Analyze the following repository structure and architectural evidence.
          Provide a comprehensive, professional system architecture decomposition.

          CRITICAL REQUIREMENTS:
          1. You MUST categorize components into ALL applicable architectural layers that comprise this system.
          2. Typical layers include:
             - "Client / Presentation Tier" (LAYER 1)
             - "API & Gateway Tier" (LAYER 2)
             - "Application & Business Logic Tier" (LAYER 3)
             - "Persistence & Data Tier" (LAYER 4)
             - "AI & Intelligence Tier" (if present)
             - "Infrastructure & Configuration Tier" (if present)
          3. DO NOT combine all components into a single layer! You MUST output multiple distinct, well-organized layers matching the architecture.
          4. Assign sequential badges: "LAYER 1", "LAYER 2", "LAYER 3", "LAYER 4", etc.
          5. Only reference real files from the provided candidate list.
          6. Return STRICTLY valid JSON matching this schema:

          {
            "summary": "Clear, detailed overview of how this system works across its architectural tiers.",
            "architectureType": "E.g., AI-Powered Full-Stack Architecture, Modular Microservices, etc.",
            "layers": [
              {
                "layerName": "Tier Name (e.g., Client / Presentation Tier, API & Gateway Tier)",
                "badge": "LAYER 1, LAYER 2, etc.",
                "description": "Clear description of the tier's role and responsibilities in the overall system.",
                "nodes": [
                  {
                    "id": "unique-kebab-case-id",
                    "name": "Human-readable component name (e.g. Dashboard Page, Auth Controller)",
                    "type": "Specific role (e.g. React View, Express Route, Domain Service, Prisma Schema)",
                    "icon": "Material symbol (e.g. 'devices', 'web', 'dashboard', 'alt_route', 'api', 'shield', 'settings_suggest', 'database', 'psychology', 'deployed_code')",
                    "file": "Exact relative file path",
                    "desc": "Short description of what this component does"
                  }
                ]
              }
            ]
          }

          Candidate Architecture Data & Files:
          ${JSON.stringify({
            detectedTechnologies: {
              frontend: Array.from(frontendTech),
              backend: Array.from(backendTech),
              database: Array.from(dbTech),
              ai: Array.from(aiTech)
            },
            entryPoints,
            candidateTiers: categorizedContext
          }, null, 2)}
        `;

        const { response } = await geminiService.generateContent({
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        }, 'analysis');

        let aiJsonStr = response.text || '';
        if (aiJsonStr.startsWith('```json')) {
          aiJsonStr = aiJsonStr.substring(7, aiJsonStr.length - 3).trim();
        } else if (aiJsonStr.startsWith('```')) {
          aiJsonStr = aiJsonStr.substring(3, aiJsonStr.length - 3).trim();
        }

        const aiData = JSON.parse(aiJsonStr);

        if (aiData.summary) summary = aiData.summary;
        if (aiData.architectureType) architectureType = aiData.architectureType;

        if (aiData.layers && Array.isArray(aiData.layers) && aiData.layers.length >= 2) {
          const validatedLayers = [];

          aiData.layers.forEach((layer) => {
            const validNodes = [];
            if (layer.nodes && Array.isArray(layer.nodes)) {
              layer.nodes.forEach((n, nIdx) => {
                const resolvedFile = pathLookup.resolve(n.file);
                if (resolvedFile) {
                  validNodes.push({
                    id: n.id || `node-${validatedLayers.length + 1}-${nIdx + 1}`,
                    name: n.name || getComponentName(resolvedFile, resolvedFile.split('/').pop()),
                    type: n.type || 'Component',
                    icon: n.icon || 'code',
                    file: resolvedFile,
                    desc: n.desc || 'System component'
                  });
                }
              });
            }

            if (validNodes.length > 0) {
              validatedLayers.push({
                layerName: layer.layerName || `Tier ${validatedLayers.length + 1}`,
                badge: `LAYER ${validatedLayers.length + 1}`,
                description: layer.description || 'Architectural layer',
                nodes: validNodes
              });
            }
          });

          // Only accept AI layers if it produced multiple distinct layers
          if (validatedLayers.length >= 2) {
            finalLayers = validatedLayers;
          } else {
            console.warn('[ArchitectureService] AI produced < 2 valid layers, keeping rich multi-layer deterministic architecture');
          }
        }
      } catch (geminiError) {
        console.warn('[ArchitectureService] Gemini synthesis fallback triggered, using rich multi-layer deterministic baseline:', geminiError.message);
        // Fallback gracefully uses the comprehensive deterministic layers
        finalLayers = deterministicArch.layers;
        summary = deterministicArch.summary;
        architectureType = deterministicArch.architectureType;
      }
    }

    // Ensure all badges are sequential LAYER 1, LAYER 2, etc.
    finalLayers.forEach((layer, idx) => {
      layer.badge = `LAYER ${idx + 1}`;
    });

    const finalAnalysisData = {
      projectStructure,
      entryPoints,
      layers: finalLayers,
      technologies: {
        frontend: Array.from(frontendTech),
        backend: Array.from(backendTech),
        database: Array.from(dbTech),
        ai: Array.from(aiTech)
      },
      fileCount: files.length
    };

    // 5. Persist architecture
    await prisma.repositoryArchitecture.update({
      where: { repositoryId },
      data: {
        status: 'COMPLETED',
        summary,
        architectureType,
        analysisData: finalAnalysisData,
        commitSha: repository.latestCommitSha || 'unknown',
        error: null,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Architecture generation error:', error);
    await updateArchitectureStatus(repositoryId, 'FAILED', error.message);
  }
};

const updateArchitectureStatus = async (repositoryId, status, errorMsg) => {
  try {
    await prisma.repositoryArchitecture.update({
      where: { repositoryId },
      data: { status, error: errorMsg }
    });
  } catch (e) {
    console.error('Failed to update architecture status:', e);
  }
};

module.exports = {
  getArchitecture,
  generateArchitecture
};

export const fileTree = [
  {
    name: 'client',
    type: 'folder',
    isOpen: true,
    children: [
      {
        name: 'src',
        type: 'folder',
        isOpen: false,
        children: [
          { name: 'App.jsx', type: 'file', language: 'javascript', path: 'client/src/App.jsx' },
          { name: 'main.jsx', type: 'file', language: 'javascript', path: 'client/src/main.jsx' }
        ]
      }
    ]
  },
  {
    name: 'server',
    type: 'folder',
    isOpen: true,
    children: [
      {
        name: 'controllers',
        type: 'folder',
        isOpen: false,
        children: [
          { name: 'applicationController.js', type: 'file', language: 'javascript', path: 'server/controllers/applicationController.js' },
          { name: 'authController.js', type: 'file', language: 'javascript', path: 'server/controllers/authController.js' }
        ]
      },
      {
        name: 'middleware',
        type: 'folder',
        isOpen: true,
        children: [
          { name: 'authMiddleware.js', type: 'file', language: 'javascript', path: 'server/middleware/authMiddleware.js', active: true },
          { name: 'errorMiddleware.js', type: 'file', language: 'javascript', path: 'server/middleware/errorMiddleware.js' },
          { name: 'rateLimiter.js', type: 'file', language: 'javascript', path: 'server/middleware/rateLimiter.js' }
        ]
      },
      {
        name: 'routes',
        type: 'folder',
        isOpen: false,
        children: [
          { name: 'authRoutes.js', type: 'file', language: 'javascript', path: 'server/routes/authRoutes.js' },
          { name: 'jobRoutes.js', type: 'file', language: 'javascript', path: 'server/routes/jobRoutes.js' }
        ]
      },
      {
        name: 'services',
        type: 'folder',
        isOpen: false,
        children: [
          { name: 'eligibilityService.js', type: 'file', language: 'javascript', path: 'server/services/eligibilityService.js' }
        ]
      },
      { name: 'server.js', type: 'file', language: 'javascript', path: 'server/server.js' }
    ]
  },
  {
    name: 'prisma',
    type: 'folder',
    isOpen: true,
    children: [
      { name: 'schema.prisma', type: 'file', language: 'prisma', path: 'prisma/schema.prisma' }
    ]
  },
  { name: 'package.json', type: 'file', language: 'json', path: 'package.json' },
  { name: 'README.md', type: 'file', language: 'markdown', path: 'README.md' }
];

export const fileContents = {
  'server/middleware/authMiddleware.js': {
    name: 'authMiddleware.js',
    path: 'VVITU_Placement_Portal / server / middleware / authMiddleware.js',
    language: 'JavaScript',
    linesCount: 35,
    size: '1.4 KB',
    encoding: 'UTF-8',
    lineEndings: 'LF',
    code: `const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Authentication Middleware
 * Validates Bearer JWT tokens and hydrates request with authenticated user.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or malformed token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, studentProfileId: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User no longer exists' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token signature' });
  }
};

module.exports = authMiddleware;`,
    summary: 'This middleware verifies the JWT token from the Authorization header before allowing access to protected endpoints. It fetches the user record from Prisma and attaches it to req.user.',
    securityAssessment: 'Handles signature expiration, missing headers, and prevents orphaned sessions by verifying the user account still exists in PostgreSQL.',
    inboundCallers: [
      'server/routes/authRoutes.js',
      'server/routes/applicationRoutes.js',
      'server/routes/jobRoutes.js'
    ],
    dependencies: [
      { name: 'jsonwebtoken', type: 'npm' },
      { name: 'prisma/schema.prisma', type: 'User' }
    ],
    optimizationHint: 'Consider caching valid decoded sessions in Redis to avoid hitting the database on every authenticated API request.'
  },
  'server/controllers/authController.js': {
    name: 'authController.js',
    path: 'VVITU_Placement_Portal / server / controllers / authController.js',
    language: 'JavaScript',
    linesCount: 42,
    size: '1.8 KB',
    encoding: 'UTF-8',
    lineEndings: 'LF',
    code: `const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({ token, role: user.role, email: user.email });
};`,
    summary: 'Authenticates student and recruiter credentials against hashed passwords in the User model and signs an authoritative JWT payload.',
    securityAssessment: 'Implements bcrypt constant-time comparison to protect against timing attacks. Tokens expire in 7 days.',
    inboundCallers: ['server/routes/authRoutes.js'],
    dependencies: [
      { name: 'bcryptjs', type: 'npm' },
      { name: 'jsonwebtoken', type: 'npm' }
    ],
    optimizationHint: 'Introduce rate-limiting per IP on this endpoint to mitigate automated brute force credential stuffing.'
  },
  'server/services/eligibilityService.js': {
    name: 'eligibilityService.js',
    path: 'VVITU_Placement_Portal / server / services / eligibilityService.js',
    language: 'JavaScript',
    linesCount: 48,
    size: '1.9 KB',
    encoding: 'UTF-8',
    lineEndings: 'LF',
    code: `/**
 * Validates whether a candidate meets recruitment criteria for a specific placement drive.
 */
exports.checkEligibility = (studentProfile, driveCriteria) => {
  const reasons = [];

  if (studentProfile.cgpa < driveCriteria.minCgpa) {
    reasons.push(\`CGPA \${studentProfile.cgpa} is below minimum requirement of \${driveCriteria.minCgpa}\`);
  }

  if (studentProfile.activeBacklogs > driveCriteria.allowedBacklogs) {
    reasons.push(\`Active backlogs (\${studentProfile.activeBacklogs}) exceed threshold (\${driveCriteria.allowedBacklogs})\`);
  }

  if (!driveCriteria.eligibleBranches.includes(studentProfile.branch)) {
    reasons.push(\`Branch \${studentProfile.branch} is not eligible for this opportunity\`);
  }

  return {
    isEligible: reasons.length === 0,
    reasons
  };
};`,
    summary: 'Calculates student placement drive eligibility by comparing their profile attributes (CGPA, active backlogs, department branch) against company drive criteria.',
    securityAssessment: 'Pure functional business logic rule evaluator; contains zero side-effects and is completely testable.',
    inboundCallers: ['server/controllers/applicationController.js'],
    dependencies: [{ name: 'prisma/schema.prisma', type: 'StudentProfile' }],
    optimizationHint: 'Pre-compile and index criteria rule trees into memory for rapid bulk filtering during company shortlisting rounds.'
  },
  'prisma/schema.prisma': {
    name: 'schema.prisma',
    path: 'VVITU_Placement_Portal / prisma / schema.prisma',
    language: 'Prisma',
    linesCount: 50,
    size: '2.1 KB',
    encoding: 'UTF-8',
    lineEndings: 'LF',
    code: `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  STUDENT
  RECRUITER
  ADMIN
}

model User {
  id               String          @id @default(uuid())
  email            String          @unique
  passwordHash     String
  role             Role            @default(STUDENT)
  studentProfile   StudentProfile? @relation(fields: [studentProfileId], references: [id])
  studentProfileId String?         @unique
  createdAt        DateTime        @default(now())
}

model StudentProfile {
  id             String        @id @default(uuid())
  user           User?
  fullName       String
  rollNumber     String        @unique
  branch         String
  cgpa           Float
  activeBacklogs Int           @default(0)
  resumeUrl      String?
  applications   Application[]
}`,
    summary: 'PostgreSQL schema definitions and data relationships for users, student academic records, placement drives, and application records.',
    securityAssessment: 'Uses UUID primary keys to prevent enumeration attacks and role-based domain classification.',
    inboundCallers: ['All server controllers and services'],
    dependencies: [{ name: 'PostgreSQL', type: 'Engine' }],
    optimizationHint: 'Ensure indexes on studentProfileId and rollNumber remain synchronized for sub-millisecond query execution.'
  }
};

export const initialOnboardingSteps = [
  {
    id: 1,
    stepNumber: '01',
    title: 'Understand the Project',
    status: 'Completed',
    summary: 'Placement & recruitment portal managing campus drives, applicant eligibility filters, and company coordination.',
    inspectedFiles: ['README.md', 'package.json'],
    actionText: 'Review Summary'
  },
  {
    id: 2,
    stepNumber: '02',
    title: 'Understand the Architecture',
    status: 'Completed',
    summary: 'Three-tier MVC architecture: React SPA → Express REST API → Business Services & Controllers → Prisma ORM → PostgreSQL database.',
    inspectedFiles: ['server.js', 'client/src/App.jsx', 'prisma/schema.prisma'],
    actionText: 'View Architecture'
  },
  {
    id: 3,
    stepNumber: '03',
    title: 'Explore Authentication',
    status: 'Active',
    moduleTitle: 'Module 3 of 5',
    summary: 'Learn how user identity, session handling, and role authorization (STUDENT vs RECRUITER / ADMIN) are securely enforced across Express route guards.',
    guideTag: 'JWT + Bearer Token Architecture',
    guideItems: [
      {
        num: '01',
        title: 'Token Issuance',
        text: 'Handled in server/controllers/authController.js via the login route. Compares passwords using bcrypt.compare and generates JWTs packed with role claims.'
      },
      {
        num: '02',
        title: 'Token Verification',
        text: 'Middleware in server/middleware/authMiddleware.js intercepts requests, extracts authorization Bearer tokens, decodes the signature, and hydrates req.user.'
      },
      {
        num: '03',
        title: 'Role Protection',
        text: 'Role interceptors block students from invoking recruiter drive management APIs, rejecting unauthorized scopes with standard HTTP 403 status payloads.'
      }
    ],
    keyFiles: [
      {
        name: 'authController.js',
        icon: 'javascript',
        path: 'server/controllers/authController.js',
        lines: 'Lines 18-64 • Issue tokens'
      },
      {
        name: 'authMiddleware.js',
        icon: 'shield',
        path: 'server/middleware/authMiddleware.js',
        lines: 'Lines 9-33 • Bearer guards'
      },
      {
        name: 'authRoutes.js',
        icon: 'route',
        path: 'server/routes/authRoutes.js',
        lines: 'Lines 1-28 • Route mappings'
      }
    ],
    checklist: [
      { id: 'c1', label: 'Trace login route handler & verify credential validation logic', checked: true },
      { id: 'c2', label: 'Inspect JWT payload claims for role identity fields', checked: true },
      { id: 'c3', label: 'Test unauthorized request response behavior (401 vs 403 handling)', checked: false }
    ],
    activeSnippet: {
      file: 'authMiddleware.js',
      functionName: 'verifyToken()',
      lines: 'Lines 14-26',
      description: 'Inspecting Bearer validation token unpacking & student claims extraction.',
      code: `const token = req.headers.authorization?.split(' ')[1];
if (!token) {
  return res.status(401).json({ msg: 'No token, unauthorized' });
}

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded; // Contains role: 'STUDENT'
  next();
} catch (err) {
  res.status(401).json({ msg: 'Token expired or malformed' });
}`
    }
  },
  {
    id: 4,
    stepNumber: '04',
    title: 'Explore Core Features',
    status: 'Locked',
    summary: 'Deep dive into job posting creation, application submission workflows, and automatic CGPA validation algorithms.',
    inspectedFiles: ['applicationController.js', 'eligibilityService.js'],
    actionText: 'Preview'
  },
  {
    id: 5,
    stepNumber: '05',
    title: 'Start Contributing',
    status: 'Upcoming',
    isFinalGoal: true,
    summary: 'First good issue: Add phone number format validation and resume upload size limit guard on application forms.',
    inspectedFiles: ['userValidator.js', 'JobDetails.jsx'],
    actionText: 'Issue Details'
  }
];

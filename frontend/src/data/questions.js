export const initialQuestions = [
  {
    id: 'q1',
    question: 'Where is JWT authentication implemented?',
    repo: 'VVITU_Placement_Portal',
    timestamp: '12 mins ago',
    sourceFile: 'server/middleware/authMiddleware.js',
    lineRef: 'Lines 9-33',
    answer: 'JWT authentication is primarily implemented in `server/middleware/authMiddleware.js`. The middleware extracts the `Bearer` token from `req.headers.authorization`, verifies the digital signature using `jwt.verify(token, process.env.JWT_SECRET)`, retrieves the user entity from the PostgreSQL database using Prisma, and attaches the hydrated record to `req.user`. Login issuance happens in `server/controllers/authController.js` via the `/api/auth/login` endpoint.',
    tags: ['Auth', 'Security', 'Express', 'JWT']
  },
  {
    id: 'q2',
    question: 'How does student job eligibility work?',
    repo: 'VVITU_Placement_Portal',
    timestamp: '45 mins ago',
    sourceFile: 'server/services/eligibilityService.js',
    lineRef: 'Lines 15-58',
    answer: 'Student job eligibility is computed by `server/services/eligibilityService.js`. When a company publishes a placement drive, rules including minimum CGPA (e.g. >= 7.5), allowed backlogs (usually 0), and eligible degree branches (CSE, IT, ECE) are cross-referenced with the student profile database table before rendering the "Apply" CTA.',
    tags: ['Business Logic', 'Eligibility', 'Drives']
  },
  {
    id: 'q3',
    question: 'Which API creates an application?',
    repo: 'VVITU_Placement_Portal',
    timestamp: '2 hours ago',
    sourceFile: 'server/routes/applicationRoutes.js',
    lineRef: 'POST /api/applications',
    answer: 'The endpoint `POST /api/applications` defined in `server/routes/applicationRoutes.js` and handled by `applicationController.createApplication` records a job submission. It executes pre-flight checks through `authMiddleware` and `eligibilityService`, then creates an Application record in Prisma.',
    tags: ['REST API', 'Applications', 'Controllers']
  },
  {
    id: 'q4',
    question: 'Where is the Prisma schema defined?',
    repo: 'VVITU_Placement_Portal',
    timestamp: 'Yesterday',
    sourceFile: 'prisma/schema.prisma',
    lineRef: 'Lines 1-84',
    answer: 'The Prisma data model is defined in `prisma/schema.prisma`. It declares 14 relational models including `User`, `StudentProfile`, `Company`, `JobDrive`, `Application`, and `InterviewRound`, backed by a PostgreSQL datasource with foreign key constraints.',
    tags: ['Prisma', 'Database', 'Schema']
  }
];

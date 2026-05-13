/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */
// Predefined HR flow templates that users can clone
// Each template has proper node structure with data.type, data.label, and data.config

export const flowTemplates = [
  // ============================================
  // Template 1: Initial Candidate Screening
  // ============================================
  {
    id: "template-initial-candidate-screening",
    name: "Initial Candidate Screening",
    description: "A general-purpose first-round screen that collects experience, availability, salary expectations, and routes candidates based on basic fit.",
    isTemplate: true,
    nodes: [
      {
        id: "node-greeting",
        type: "message",
        position: { x: 250, y: 50 },
        data: {
          type: "message",
          label: "Introduction",
          config: {
            type: "message",
            message: "Hi {{candidate_name}}, this is an automated screening call for the {{job_title}} role. This will only take about 5 minutes. Are you available to speak now?",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-ask-experience",
        type: "question",
        position: { x: 250, y: 180 },
        data: {
          type: "question",
          label: "Years of Experience",
          config: {
            type: "question",
            question: "How many years of relevant work experience do you have for this role?",
            variableName: "years_experience",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-ask-notice",
        type: "question",
        position: { x: 250, y: 310 },
        data: {
          type: "question",
          label: "Notice Period",
          config: {
            type: "question",
            question: "What is your current notice period, and when would you be able to join if selected?",
            variableName: "notice_period",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-ask-salary",
        type: "question",
        position: { x: 250, y: 440 },
        data: {
          type: "question",
          label: "Salary Expectation",
          config: {
            type: "question",
            question: "What is your current CTC and your expected CTC for this role?",
            variableName: "salary_expectation",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-ask-location",
        type: "question",
        position: { x: 250, y: 570 },
        data: {
          type: "question",
          label: "Location Preference",
          config: {
            type: "question",
            question: "Are you open to working on-site, or are you looking for a remote or hybrid arrangement?",
            variableName: "location_preference",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-check-fit",
        type: "condition",
        position: { x: 250, y: 700 },
        data: {
          type: "condition",
          label: "Assess Fit",
          config: {
            type: "condition",
            condition: "Based on the responses, is the candidate a potential fit?",
            variableName: "candidate_fit",
          },
        },
      },
      {
        id: "node-advance",
        type: "message",
        position: { x: 80, y: 850 },
        data: {
          type: "message",
          label: "Advance",
          config: {
            type: "message",
            message: "Thank you for your time! Your profile looks like a great match. Our recruiter will reach out within 2 business days to discuss next steps. Have a great day!",
            waitForResponse: false,
          },
        },
      },
      {
        id: "node-hold",
        type: "message",
        position: { x: 420, y: 850 },
        data: {
          type: "message",
          label: "Hold",
          config: {
            type: "message",
            message: "Thank you for taking the time to speak with us today. We will review your profile and get back to you if there is a suitable opportunity. Have a great day!",
            waitForResponse: false,
          },
        },
      },
      {
        id: "node-end-advance",
        type: "end",
        position: { x: 80, y: 980 },
        data: { type: "end", label: "End", config: { type: "end" } },
      },
      {
        id: "node-end-hold",
        type: "end",
        position: { x: 420, y: 980 },
        data: { type: "end", label: "End", config: { type: "end" } },
      },
    ],
    edges: [
      { id: "e1", source: "node-greeting", target: "node-ask-experience" },
      { id: "e2", source: "node-ask-experience", target: "node-ask-notice" },
      { id: "e3", source: "node-ask-notice", target: "node-ask-salary" },
      { id: "e4", source: "node-ask-salary", target: "node-ask-location" },
      { id: "e5", source: "node-ask-location", target: "node-check-fit" },
      { id: "e6", source: "node-check-fit", target: "node-advance", sourceHandle: "yes" },
      { id: "e7", source: "node-check-fit", target: "node-hold", sourceHandle: "no" },
      { id: "e8", source: "node-advance", target: "node-end-advance" },
      { id: "e9", source: "node-hold", target: "node-end-hold" },
    ],
  },

  // ============================================
  // Template 2: Technical Skills Assessment
  // ============================================
  {
    id: "template-technical-skills-assessment",
    name: "Technical Skills Assessment",
    description: "Assess a candidate's technical depth by exploring their tech stack, past projects, coding practices, and problem-solving approach.",
    isTemplate: true,
    nodes: [
      {
        id: "node-intro",
        type: "message",
        position: { x: 250, y: 50 },
        data: {
          type: "message",
          label: "Introduction",
          config: {
            type: "message",
            message: "Hi {{candidate_name}}, I'm calling to conduct a quick technical screening for the {{job_title}} position. Let's dive into your technical background. Ready to begin?",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-tech-stack",
        type: "question",
        position: { x: 250, y: 180 },
        data: {
          type: "question",
          label: "Tech Stack",
          config: {
            type: "question",
            question: "Can you describe your primary tech stack and the technologies you're most proficient in?",
            variableName: "tech_stack",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-recent-project",
        type: "question",
        position: { x: 250, y: 310 },
        data: {
          type: "question",
          label: "Recent Project",
          config: {
            type: "question",
            question: "Tell me about a technically challenging project you've worked on recently. What was your role and what technologies did you use?",
            variableName: "recent_project",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-problem-solving",
        type: "question",
        position: { x: 250, y: 440 },
        data: {
          type: "question",
          label: "Problem Solving",
          config: {
            type: "question",
            question: "How do you approach debugging a complex issue in production? Walk me through your process.",
            variableName: "problem_solving_approach",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-system-design",
        type: "question",
        position: { x: 250, y: 570 },
        data: {
          type: "question",
          label: "System Design",
          config: {
            type: "question",
            question: "Have you been involved in system design or architecture decisions? Can you give an example?",
            variableName: "system_design_experience",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-open-source",
        type: "question",
        position: { x: 250, y: 700 },
        data: {
          type: "question",
          label: "Learning & Growth",
          config: {
            type: "question",
            question: "How do you stay current with new technologies? Do you contribute to open source or personal projects?",
            variableName: "continuous_learning",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-closing",
        type: "message",
        position: { x: 250, y: 830 },
        data: {
          type: "message",
          label: "Closing",
          config: {
            type: "message",
            message: "Thank you for sharing your technical background. Our engineering team will review your responses and reach out about the next steps within 3 business days.",
            waitForResponse: false,
          },
        },
      },
      {
        id: "node-end",
        type: "end",
        position: { x: 250, y: 960 },
        data: { type: "end", label: "End", config: { type: "end" } },
      },
    ],
    edges: [
      { id: "e1", source: "node-intro", target: "node-tech-stack" },
      { id: "e2", source: "node-tech-stack", target: "node-recent-project" },
      { id: "e3", source: "node-recent-project", target: "node-problem-solving" },
      { id: "e4", source: "node-problem-solving", target: "node-system-design" },
      { id: "e5", source: "node-system-design", target: "node-open-source" },
      { id: "e6", source: "node-open-source", target: "node-closing" },
      { id: "e7", source: "node-closing", target: "node-end" },
    ],
  },

  // ============================================
  // Template 3: Cultural Fit & Values Interview
  // ============================================
  {
    id: "template-cultural-fit-values",
    name: "Cultural Fit & Values Interview",
    description: "Explore candidate values, work style, motivation, and team dynamics to assess alignment with company culture.",
    isTemplate: true,
    nodes: [
      {
        id: "node-intro",
        type: "message",
        position: { x: 250, y: 50 },
        data: {
          type: "message",
          label: "Introduction",
          config: {
            type: "message",
            message: "Hi {{candidate_name}}, thanks for joining this call. I'd like to learn more about your work style and values to see how well we align. This will be a relaxed conversation. Shall we start?",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-work-style",
        type: "question",
        position: { x: 250, y: 180 },
        data: {
          type: "question",
          label: "Work Style",
          config: {
            type: "question",
            question: "How would you describe your ideal work environment? Do you prefer working independently, collaboratively, or a mix of both?",
            variableName: "work_style",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-remote-preference",
        type: "question",
        position: { x: 250, y: 310 },
        data: {
          type: "question",
          label: "Remote/Onsite Preference",
          config: {
            type: "question",
            question: "Have you worked remotely before? What's your preference and how do you stay productive when working from home?",
            variableName: "remote_preference",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-conflict",
        type: "question",
        position: { x: 250, y: 440 },
        data: {
          type: "question",
          label: "Conflict Resolution",
          config: {
            type: "question",
            question: "Can you share an example of a time you disagreed with a team member or manager? How did you handle it?",
            variableName: "conflict_resolution",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-motivation",
        type: "question",
        position: { x: 250, y: 570 },
        data: {
          type: "question",
          label: "Motivation",
          config: {
            type: "question",
            question: "What motivates you most at work — recognition, growth, impact, or something else? Can you give an example?",
            variableName: "motivation",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-values",
        type: "question",
        position: { x: 250, y: 700 },
        data: {
          type: "question",
          label: "Company Values Alignment",
          config: {
            type: "question",
            question: "What do you look for in a company's culture when evaluating a new opportunity?",
            variableName: "values_alignment",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-closing",
        type: "message",
        position: { x: 250, y: 830 },
        data: {
          type: "message",
          label: "Closing",
          config: {
            type: "message",
            message: "This has been a wonderful conversation, thank you! Our team will review everything and reach out soon about the next steps.",
            waitForResponse: false,
          },
        },
      },
      {
        id: "node-end",
        type: "end",
        position: { x: 250, y: 960 },
        data: { type: "end", label: "End", config: { type: "end" } },
      },
    ],
    edges: [
      { id: "e1", source: "node-intro", target: "node-work-style" },
      { id: "e2", source: "node-work-style", target: "node-remote-preference" },
      { id: "e3", source: "node-remote-preference", target: "node-conflict" },
      { id: "e4", source: "node-conflict", target: "node-motivation" },
      { id: "e5", source: "node-motivation", target: "node-values" },
      { id: "e6", source: "node-values", target: "node-closing" },
      { id: "e7", source: "node-closing", target: "node-end" },
    ],
  },

  // ============================================
  // Template 4: Sales Representative Screening
  // ============================================
  {
    id: "template-sales-representative-screening",
    name: "Sales Representative Screening",
    description: "Screen sales candidates for quota attainment, pipeline management, CRM proficiency, and closing techniques.",
    isTemplate: true,
    nodes: [
      {
        id: "node-intro",
        type: "message",
        position: { x: 250, y: 50 },
        data: {
          type: "message",
          label: "Introduction",
          config: {
            type: "message",
            message: "Hi {{candidate_name}}, I'm reaching out regarding the {{job_title}} role. I'd love to learn about your sales background. Do you have a few minutes?",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-sales-experience",
        type: "question",
        position: { x: 250, y: 180 },
        data: {
          type: "question",
          label: "Sales Experience",
          config: {
            type: "question",
            question: "How many years of sales experience do you have, and what types of products or services have you sold?",
            variableName: "sales_experience",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-quota",
        type: "question",
        position: { x: 250, y: 310 },
        data: {
          type: "question",
          label: "Quota Attainment",
          config: {
            type: "question",
            question: "What was your annual quota in your most recent role, and what percentage did you achieve?",
            variableName: "quota_attainment",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-crm",
        type: "question",
        position: { x: 250, y: 440 },
        data: {
          type: "question",
          label: "CRM & Tools",
          config: {
            type: "question",
            question: "Which CRM tools have you used — such as Salesforce or HubSpot — and how do you manage your pipeline?",
            variableName: "crm_tools",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-closing-style",
        type: "question",
        position: { x: 250, y: 570 },
        data: {
          type: "question",
          label: "Closing Style",
          config: {
            type: "question",
            question: "Describe your approach to closing a deal with a hesitant prospect. What techniques work best for you?",
            variableName: "closing_style",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-check-quota",
        type: "condition",
        position: { x: 250, y: 700 },
        data: {
          type: "condition",
          label: "Quota Check",
          config: {
            type: "condition",
            condition: "Did the candidate indicate strong quota attainment (above 80%)?",
            variableName: "quota_qualified",
          },
        },
      },
      {
        id: "node-strong",
        type: "message",
        position: { x: 80, y: 850 },
        data: {
          type: "message",
          label: "Strong Candidate",
          config: {
            type: "message",
            message: "Excellent track record! Thank you for your time. Our sales leadership will be in touch within 2 days to set up a more detailed interview.",
            waitForResponse: false,
          },
        },
      },
      {
        id: "node-standard",
        type: "message",
        position: { x: 420, y: 850 },
        data: {
          type: "message",
          label: "Standard Close",
          config: {
            type: "message",
            message: "Thank you for speaking with us. We'll review your profile and reach out if there's a good match for this or future opportunities.",
            waitForResponse: false,
          },
        },
      },
      {
        id: "node-end-strong",
        type: "end",
        position: { x: 80, y: 980 },
        data: { type: "end", label: "End", config: { type: "end" } },
      },
      {
        id: "node-end-standard",
        type: "end",
        position: { x: 420, y: 980 },
        data: { type: "end", label: "End", config: { type: "end" } },
      },
    ],
    edges: [
      { id: "e1", source: "node-intro", target: "node-sales-experience" },
      { id: "e2", source: "node-sales-experience", target: "node-quota" },
      { id: "e3", source: "node-quota", target: "node-crm" },
      { id: "e4", source: "node-crm", target: "node-closing-style" },
      { id: "e5", source: "node-closing-style", target: "node-check-quota" },
      { id: "e6", source: "node-check-quota", target: "node-strong", sourceHandle: "yes" },
      { id: "e7", source: "node-check-quota", target: "node-standard", sourceHandle: "no" },
      { id: "e8", source: "node-strong", target: "node-end-strong" },
      { id: "e9", source: "node-standard", target: "node-end-standard" },
    ],
  },

  // ============================================
  // Template 5: Senior Engineer Deep-Dive
  // ============================================
  {
    id: "template-senior-engineer-deep-dive",
    name: "Senior Engineer Deep-Dive",
    description: "An in-depth interview for senior engineering roles covering architecture decisions, cross-functional leadership, mentorship, and technical strategy.",
    isTemplate: true,
    nodes: [
      {
        id: "node-intro",
        type: "message",
        position: { x: 250, y: 50 },
        data: {
          type: "message",
          label: "Introduction",
          config: {
            type: "message",
            message: "Hi {{candidate_name}}, this is a senior-level engineering screen for the {{job_title}} role. We'll explore your architecture experience and leadership. Ready to start?",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-architecture",
        type: "question",
        position: { x: 250, y: 180 },
        data: {
          type: "question",
          label: "Architecture Decisions",
          config: {
            type: "question",
            question: "Describe the most complex system you've architected. What tradeoffs did you make and how did you justify them?",
            variableName: "architecture_experience",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-scale",
        type: "question",
        position: { x: 250, y: 310 },
        data: {
          type: "question",
          label: "Scaling Experience",
          config: {
            type: "question",
            question: "Have you worked on systems at scale? What challenges did you face around performance, reliability, or cost?",
            variableName: "scaling_experience",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-leadership",
        type: "question",
        position: { x: 250, y: 440 },
        data: {
          type: "question",
          label: "Technical Leadership",
          config: {
            type: "question",
            question: "How have you influenced engineering decisions beyond your own team? Have you driven any org-wide technical changes?",
            variableName: "technical_leadership",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-mentorship",
        type: "question",
        position: { x: 250, y: 570 },
        data: {
          type: "question",
          label: "Mentorship",
          config: {
            type: "question",
            question: "Tell me about your experience mentoring junior or mid-level engineers. How do you approach technical growth in your team?",
            variableName: "mentorship_experience",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-ambiguity",
        type: "question",
        position: { x: 250, y: 700 },
        data: {
          type: "question",
          label: "Handling Ambiguity",
          config: {
            type: "question",
            question: "Describe a situation where requirements were unclear or changing rapidly. How did you drive alignment and deliver results?",
            variableName: "ambiguity_handling",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-closing",
        type: "message",
        position: { x: 250, y: 830 },
        data: {
          type: "message",
          label: "Closing",
          config: {
            type: "message",
            message: "This has been a great conversation. Our CTO's office will review your responses and reach out within 3-4 business days. Thank you for your time!",
            waitForResponse: false,
          },
        },
      },
      {
        id: "node-end",
        type: "end",
        position: { x: 250, y: 960 },
        data: { type: "end", label: "End", config: { type: "end" } },
      },
    ],
    edges: [
      { id: "e1", source: "node-intro", target: "node-architecture" },
      { id: "e2", source: "node-architecture", target: "node-scale" },
      { id: "e3", source: "node-scale", target: "node-leadership" },
      { id: "e4", source: "node-leadership", target: "node-mentorship" },
      { id: "e5", source: "node-mentorship", target: "node-ambiguity" },
      { id: "e6", source: "node-ambiguity", target: "node-closing" },
      { id: "e7", source: "node-closing", target: "node-end" },
    ],
  },

  // ============================================
  // Template 6: Customer Success Role
  // ============================================
  {
    id: "template-customer-success-screening",
    name: "Customer Success Screening",
    description: "Screen Customer Success Manager candidates for client retention skills, escalation handling, onboarding experience, and success metrics.",
    isTemplate: true,
    nodes: [
      {
        id: "node-intro",
        type: "message",
        position: { x: 250, y: 50 },
        data: {
          type: "message",
          label: "Introduction",
          config: {
            type: "message",
            message: "Hi {{candidate_name}}, I'm reaching out about the {{job_title}} role. I'd like to ask you a few questions about your customer success experience. Do you have a moment?",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-portfolio",
        type: "question",
        position: { x: 250, y: 180 },
        data: {
          type: "question",
          label: "Client Portfolio",
          config: {
            type: "question",
            question: "How many client accounts were you responsible for in your last role, and what was the total ARR you managed?",
            variableName: "client_portfolio",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-retention",
        type: "question",
        position: { x: 250, y: 310 },
        data: {
          type: "question",
          label: "Retention Metrics",
          config: {
            type: "question",
            question: "What was your net revenue retention rate, and how did you drive expansion within existing accounts?",
            variableName: "retention_metrics",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-escalation",
        type: "question",
        position: { x: 250, y: 440 },
        data: {
          type: "question",
          label: "Escalation Handling",
          config: {
            type: "question",
            question: "Tell me about a time you had to handle an angry or churning client. What steps did you take and what was the outcome?",
            variableName: "escalation_handling",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-onboarding",
        type: "question",
        position: { x: 250, y: 570 },
        data: {
          type: "question",
          label: "Onboarding Process",
          config: {
            type: "question",
            question: "Describe your onboarding process for new clients. What does a successful onboarding look like to you?",
            variableName: "onboarding_process",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-tools",
        type: "question",
        position: { x: 250, y: 700 },
        data: {
          type: "question",
          label: "Tools & Metrics",
          config: {
            type: "question",
            question: "Which CS tools and platforms have you used — such as Gainsight, ChurnZero, or Intercom — and what metrics do you track daily?",
            variableName: "cs_tools",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-closing",
        type: "message",
        position: { x: 250, y: 830 },
        data: {
          type: "message",
          label: "Closing",
          config: {
            type: "message",
            message: "You've given some really thoughtful answers. Our CS leadership will review and follow up with you within 2 business days. Thank you so much!",
            waitForResponse: false,
          },
        },
      },
      {
        id: "node-end",
        type: "end",
        position: { x: 250, y: 960 },
        data: { type: "end", label: "End", config: { type: "end" } },
      },
    ],
    edges: [
      { id: "e1", source: "node-intro", target: "node-portfolio" },
      { id: "e2", source: "node-portfolio", target: "node-retention" },
      { id: "e3", source: "node-retention", target: "node-escalation" },
      { id: "e4", source: "node-escalation", target: "node-onboarding" },
      { id: "e5", source: "node-onboarding", target: "node-tools" },
      { id: "e6", source: "node-tools", target: "node-closing" },
      { id: "e7", source: "node-closing", target: "node-end" },
    ],
  },

  // ============================================
  // Template 7: Product Manager Screening
  // ============================================
  {
    id: "template-product-manager-screening",
    name: "Product Manager Screening",
    description: "Evaluate a PM candidate's roadmap experience, stakeholder management, data-driven decision-making, and product launch history.",
    isTemplate: true,
    nodes: [
      {
        id: "node-intro",
        type: "message",
        position: { x: 250, y: 50 },
        data: {
          type: "message",
          label: "Introduction",
          config: {
            type: "message",
            message: "Hi {{candidate_name}}, I'm calling about the {{job_title}} position. I'd love to explore your product management experience and philosophy. Shall we start?",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-roadmap",
        type: "question",
        position: { x: 250, y: 180 },
        data: {
          type: "question",
          label: "Roadmap Experience",
          config: {
            type: "question",
            question: "How do you build and prioritize a product roadmap? Walk me through your framework for deciding what to build next.",
            variableName: "roadmap_experience",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-stakeholders",
        type: "question",
        position: { x: 250, y: 310 },
        data: {
          type: "question",
          label: "Stakeholder Management",
          config: {
            type: "question",
            question: "How do you handle conflicting priorities from different stakeholders such as sales, engineering, and executive leadership?",
            variableName: "stakeholder_management",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-data",
        type: "question",
        position: { x: 250, y: 440 },
        data: {
          type: "question",
          label: "Data-Driven Decisions",
          config: {
            type: "question",
            question: "Give me an example of a product decision you made based on data or user research. What did you measure and what was the outcome?",
            variableName: "data_driven_decision",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-launch",
        type: "question",
        position: { x: 250, y: 570 },
        data: {
          type: "question",
          label: "Product Launch",
          config: {
            type: "question",
            question: "Tell me about a product or feature you launched from scratch. What was your go-to-market strategy and what did you learn?",
            variableName: "product_launch",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-failure",
        type: "question",
        position: { x: 250, y: 700 },
        data: {
          type: "question",
          label: "Learning from Failure",
          config: {
            type: "question",
            question: "Tell me about a product initiative that didn't go as planned. What went wrong and what would you do differently?",
            variableName: "product_failure_learning",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-closing",
        type: "message",
        position: { x: 250, y: 830 },
        data: {
          type: "message",
          label: "Closing",
          config: {
            type: "message",
            message: "Thank you for sharing your product thinking with us. Our Head of Product will review your responses and reach out within 3 days. Have a great day!",
            waitForResponse: false,
          },
        },
      },
      {
        id: "node-end",
        type: "end",
        position: { x: 250, y: 960 },
        data: { type: "end", label: "End", config: { type: "end" } },
      },
    ],
    edges: [
      { id: "e1", source: "node-intro", target: "node-roadmap" },
      { id: "e2", source: "node-roadmap", target: "node-stakeholders" },
      { id: "e3", source: "node-stakeholders", target: "node-data" },
      { id: "e4", source: "node-data", target: "node-launch" },
      { id: "e5", source: "node-launch", target: "node-failure" },
      { id: "e6", source: "node-failure", target: "node-closing" },
      { id: "e7", source: "node-closing", target: "node-end" },
    ],
  },

  // ============================================
  // Template 8: HR & People Operations Role
  // ============================================
  {
    id: "template-hr-people-operations",
    name: "HR & People Operations Role",
    description: "Screen HR and People Operations candidates for talent acquisition skills, compliance awareness, employee engagement experience, and HR systems knowledge.",
    isTemplate: true,
    nodes: [
      {
        id: "node-intro",
        type: "message",
        position: { x: 250, y: 50 },
        data: {
          type: "message",
          label: "Introduction",
          config: {
            type: "message",
            message: "Hi {{candidate_name}}, I'm calling regarding the {{job_title}} opening on our People team. I'd love to understand your HR background. Ready to begin?",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-hr-experience",
        type: "question",
        position: { x: 250, y: 180 },
        data: {
          type: "question",
          label: "HR Experience",
          config: {
            type: "question",
            question: "How many years of HR experience do you have, and what functions have you covered — such as recruiting, L&D, HR operations, or all of them?",
            variableName: "hr_experience",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-talent-acquisition",
        type: "question",
        position: { x: 250, y: 310 },
        data: {
          type: "question",
          label: "Talent Acquisition",
          config: {
            type: "question",
            question: "Describe your full-cycle recruiting experience. What's the highest volume of open roles you've managed simultaneously?",
            variableName: "talent_acquisition",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-compliance",
        type: "question",
        position: { x: 250, y: 440 },
        data: {
          type: "question",
          label: "Compliance & Policy",
          config: {
            type: "question",
            question: "How do you stay current with labor laws and compliance requirements? Can you give an example of a policy you implemented or updated?",
            variableName: "compliance_awareness",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-engagement",
        type: "question",
        position: { x: 250, y: 570 },
        data: {
          type: "question",
          label: "Employee Engagement",
          config: {
            type: "question",
            question: "What initiatives have you led to improve employee engagement or reduce attrition? What were the measurable results?",
            variableName: "engagement_initiatives",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-hrms",
        type: "question",
        position: { x: 250, y: 700 },
        data: {
          type: "question",
          label: "HRMS & Tools",
          config: {
            type: "question",
            question: "Which HR management systems and tools have you used — such as Workday, BambooHR, or Darwinbox — and how have you used data to drive HR decisions?",
            variableName: "hrms_tools",
            waitForResponse: true,
          },
        },
      },
      {
        id: "node-check-seniority",
        type: "condition",
        position: { x: 250, y: 830 },
        data: {
          type: "condition",
          label: "Check Seniority",
          config: {
            type: "condition",
            condition: "Does the candidate have 3 or more years of HR experience?",
            variableName: "senior_hr",
          },
        },
      },
      {
        id: "node-senior-close",
        type: "message",
        position: { x: 80, y: 980 },
        data: {
          type: "message",
          label: "Senior Close",
          config: {
            type: "message",
            message: "Your HR experience is impressive. Our CHRO will personally review your profile and we'll be in touch within 2 business days for a follow-up discussion.",
            waitForResponse: false,
          },
        },
      },
      {
        id: "node-standard-close",
        type: "message",
        position: { x: 420, y: 980 },
        data: {
          type: "message",
          label: "Standard Close",
          config: {
            type: "message",
            message: "Thank you for speaking with us today. Our HR team will review your background and reach out if there is a good fit. Have a wonderful day!",
            waitForResponse: false,
          },
        },
      },
      {
        id: "node-end-senior",
        type: "end",
        position: { x: 80, y: 1110 },
        data: { type: "end", label: "End", config: { type: "end" } },
      },
      {
        id: "node-end-standard",
        type: "end",
        position: { x: 420, y: 1110 },
        data: { type: "end", label: "End", config: { type: "end" } },
      },
    ],
    edges: [
      { id: "e1", source: "node-intro", target: "node-hr-experience" },
      { id: "e2", source: "node-hr-experience", target: "node-talent-acquisition" },
      { id: "e3", source: "node-talent-acquisition", target: "node-compliance" },
      { id: "e4", source: "node-compliance", target: "node-engagement" },
      { id: "e5", source: "node-engagement", target: "node-hrms" },
      { id: "e6", source: "node-hrms", target: "node-check-seniority" },
      { id: "e7", source: "node-check-seniority", target: "node-senior-close", sourceHandle: "yes" },
      { id: "e8", source: "node-check-seniority", target: "node-standard-close", sourceHandle: "no" },
      { id: "e9", source: "node-senior-close", target: "node-end-senior" },
      { id: "e10", source: "node-standard-close", target: "node-end-standard" },
    ],
  },
];

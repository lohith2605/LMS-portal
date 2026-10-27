import React from 'react';
import {
  BookOpen,
  FileText,
  HelpCircle,
  BarChart3,
  MessageSquare,
  Bell,
  Award
} from 'lucide-react';

const FEATURES_LIST = [
  {
    icon: BookOpen,
    accent: 'blue',
    title: 'Structured Course Materials',
    description: 'Access curated lesson modules, code repositories, lecture notes, and downloadable assets formatted for distraction-free study.',
    badge: 'Curriculum Engine',
    span2: true,
  },
  {
    icon: FileText,
    accent: 'sage',
    title: 'Assignments & Submissions',
    description: 'Submit practical coursework directly through GitHub repositories or project files with version tracking and clean deadlines.',
    badge: 'Applied Workflows',
    span2: false,
  },
  {
    icon: HelpCircle,
    accent: 'blue',
    title: 'Quizzes & Assessments',
    description: 'Evaluate your comprehension through formative checkpoints that reinforce key concepts before moving to advanced topics.',
    badge: 'Knowledge Verification',
    span2: false,
  },
  {
    icon: BarChart3,
    accent: 'sage',
    title: 'Learning Progress Tracking',
    description: 'Monitor your completion velocity, lesson streaks, and upcoming deadlines through a unified, intuitive dashboard.',
    badge: 'Pacing Analytics',
    span2: false,
  },
  {
    icon: MessageSquare,
    accent: 'blue',
    title: 'Instructor Feedback',
    description: 'Receive contextual, rubric-based feedback directly on your assignments from seasoned educators and industry mentors.',
    badge: 'Personalized Mentorship',
    span2: false,
  },
  {
    icon: Bell,
    accent: 'sage',
    title: 'Announcements & Reminders',
    description: 'Stay aligned on cohort schedule adjustments, upcoming office hours, and deadline alerts without checking endless threads.',
    badge: 'Cohort Sync',
    span2: false,
  },
  {
    icon: Award,
    accent: 'blue',
    title: 'Completion Certificates',
    description: 'Earn tamper-proof, verifiable digital certificates highlighting completed course units, capstone outcomes, and verified skills.',
    badge: 'Credential Engine',
    span2: true,
  },
];

export default function PlatformFeatures() {
  return (
    <section id="features" className="pt-16 md:pt-20 pb-20 md:pb-24 bg-white border-y border-border-subtle" aria-label="Platform Features">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full">
        {/* Section Header */}
        <div className="mb-10 md:mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-blue-dark mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" aria-hidden="true" />
            <span>Integrated Tooling</span>
          </div>
          <h2 className="text-[clamp(1.85rem,3.2vw,2.5rem)] font-bold tracking-tight text-primary leading-tight mb-3">Everything in one learning space.</h2>
          <p className="text-base text-secondary leading-relaxed max-w-[620px]">
            We removed the friction of juggling disconnected tools. Every lesson, assignment, quiz, and evaluation lives inside one harmonious system.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES_LIST.map((feat, index) => {
            const Icon = feat.icon;
            return (
              <div
                key={index}
                className={`border border-border-subtle rounded-2xl p-6 flex flex-col gap-3 transition-all duration-200 shadow-card hover:border-border-medium hover:shadow-elevated hover:-translate-y-0.5 ${
                  feat.span2 ? 'sm:col-span-2 lg:col-span-2 bg-surface-subtle' : 'bg-white'
                }`}
              >
                <div
                  className={`w-10.5 h-10.5 rounded-xl flex items-center justify-center mb-1 ${
                    feat.accent === 'blue'
                      ? 'bg-accent-blue-pale text-accent-blue-dark'
                      : 'bg-accent-sage-pale text-accent-sage-dark'
                  }`}
                  aria-hidden="true"
                >
                  <Icon size={20} />
                </div>
                <h3 className="text-base font-bold text-primary leading-snug">{feat.title}</h3>
                <p className="text-xs text-secondary leading-relaxed">{feat.description}</p>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-accent-blue-dark mt-auto pt-2">{feat.badge}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

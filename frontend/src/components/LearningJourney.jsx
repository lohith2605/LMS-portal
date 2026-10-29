import React, { useState } from 'react';
import {
  Search,
  PlayCircle,
  ClipboardList,
  TrendingUp,
  Award,
  CheckCircle2,
} from 'lucide-react';
import IconChip from './ui/IconChip';
import Reveal from './ui/Reveal';

const JOURNEY_STAGES = [
  {
    id: 'discover',
    number: '01',
    label: 'Discover',
    icon: Search,
    shortDesc: 'Find courses aligned with your interests and goals.',
    title: 'Precision course matching & previewable syllabi',
    body: 'Explore comprehensive course pathways with clear outcomes, prerequisites, and transparent module breakdowns before you ever commit.',
    highlights: [
      'Role-tailored skill roadmaps for engineering, product, and design',
      'Instant access to introductory syllabus modules',
      'Clear time commitment indicators and pacing guidelines'
    ],
    previewCard1: {
      title: 'Course Outline & Objectives',
      sub: 'Clear milestone previews and weekly commitments'
    },
    previewCard2: {
      title: 'Skill Diagnostics',
      sub: 'Optional pre-assessments to ensure comfortable pacing'
    }
  },
  {
    id: 'learn',
    number: '02',
    label: 'Learn',
    icon: PlayCircle,
    shortDesc: 'Access structured lessons and resources.',
    title: 'Focused, distraction-free modular learning',
    body: 'Consume high-signal lesson content structured into digestable modules, paired with code snippets, reading materials, and architectural blueprints.',
    highlights: [
      'Bite-sized technical lessons formatted for deep retention',
      'Downloadable reference sheets and architecture schematics',
      'Self-paced progress bookmarking synchronized across devices'
    ],
    previewCard1: {
      title: 'Modular Video & Text Lessons',
      sub: 'Annotated source code and visual diagrams'
    },
    previewCard2: {
      title: 'Interactive Code Sandboxes',
      sub: 'Live browser exercises with immediate feedback'
    }
  },
  {
    id: 'practise',
    number: '03',
    label: 'Practise',
    icon: ClipboardList,
    shortDesc: 'Complete assignments and assessments.',
    title: 'Hands-on projects with rubric-backed feedback',
    body: 'Solidify your understanding by completing realistic project assignments, submitting code or designs, and receiving structured instructor feedback.',
    highlights: [
      'Authentic deliverables modeled after industry work',
      'Detailed grading criteria and rubric guidelines',
      'Formative quizzes to test core conceptual mastery'
    ],
    previewCard1: {
      title: 'Project Submission Portal',
      sub: 'Direct file and repository submission reviews'
    },
    previewCard2: {
      title: 'Formative Knowledge Checks',
      sub: 'Immediate evaluation with explanatory answers'
    }
  },
  {
    id: 'track',
    number: '04',
    label: 'Track',
    icon: TrendingUp,
    shortDesc: 'Understand your progress and next steps.',
    title: 'Real-time visibility over your learning journey',
    body: 'Never wonder what to work on next. Monitor your module completion percentage, track upcoming assignment deadlines, and observe skill mastery.',
    highlights: [
      'Visual completion indicators for courses, modules, and tasks',
      'Automated reminder triggers for upcoming assignment due dates',
      'Personal learning velocity dashboard'
    ],
    previewCard1: {
      title: 'Pacing & Velocity Metrics',
      sub: 'Clear visibility on target finish dates'
    },
    previewCard2: {
      title: 'Milestone Progress Tracker',
      sub: 'Track requirements toward final credentials'
    }
  },
  {
    id: 'achieve',
    number: '05',
    label: 'Achieve',
    icon: Award,
    shortDesc: 'Work toward course completion and certificates.',
    title: 'Verified credentials backed by demonstrable work',
    body: 'Conclude your course by passing the final evaluation and receiving an official, verifiable digital certificate to showcase your validated capabilities.',
    highlights: [
      'Verifiable digital certificates with permanent verification URLs',
      'Portfolio-ready capstone project artifacts',
      'Shareable credentials for resumes and professional profiles'
    ],
    previewCard1: {
      title: 'Verifiable Certificate of Completion',
      sub: 'Permanent cryptographic verification ID'
    },
    previewCard2: {
      title: 'Capstone Project Portfolio Piece',
      sub: 'Production-ready showcase artifact'
    }
  }
];

export default function LearningJourney() {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const currentStage = JOURNEY_STAGES[activeStageIndex];
  const IconComponent = currentStage.icon;

  return (
    <section id="journey" className="pt-16 md:pt-20 pb-20 md:pb-24 bg-page relative" aria-label="The Learning Journey">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full">
        {/* Editorial Section Header */}
        <div className="text-center max-w-[680px] mx-auto mb-10 md:mb-12">
          <div className="inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-blue-dark mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" aria-hidden="true" />
            <span>The Methodology</span>
          </div>
          <h2 className="text-[clamp(1.85rem,3.2vw,2.5rem)] font-bold tracking-tight text-primary leading-tight mb-3">A clearer path from learning to doing.</h2>
          <p className="text-base text-secondary leading-relaxed max-w-[620px] mx-auto">
            We structure every course into five deliberate stages so you always understand where you stand and what comes next.
          </p>
        </div>

        {/* Stepper Progression Track */}
        <div
          className="relative mb-10 flex flex-col md:grid md:grid-cols-5 gap-4 items-start md:items-stretch before:content-[''] before:absolute before:bg-border-subtle before:z-0 max-md:before:left-6 max-md:before:top-6 max-md:before:bottom-6 max-md:before:w-[2px] max-md:before:h-auto md:before:top-6 md:before:left-[5%] md:before:right-[5%] md:before:h-[2px]"
          role="tablist"
          aria-label="Learning stages"
        >
          {JOURNEY_STAGES.map((stage, idx) => {
            const StageIcon = stage.icon;
            const isActive = idx === activeStageIndex;
            return (
              <button
                key={stage.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`stage-panel-${stage.id}`}
                className="relative z-10 flex flex-row md:flex-col items-start md:items-center text-left md:text-center gap-4 md:gap-0 w-full cursor-pointer bg-transparent border-none py-2 md:py-0 px-0 md:px-2 transition-all group"
                onClick={() => setActiveStageIndex(idx)}
              >
                <div
                  className={`w-12.5 h-12.5 rounded-full border-2 flex items-center justify-center font-bold text-xs shrink-0 md:mb-3 shadow-xs transition-all duration-200 ${
                    isActive
                      ? 'bg-primary border-primary text-white shadow-sm scale-105'
                      : 'bg-surface border-border-medium text-secondary group-hover:border-primary group-hover:text-primary group-hover:-translate-y-0.5'
                  }`}
                  aria-hidden="true"
                >
                  <StageIcon size={20} strokeWidth={1.75} className="transition-transform group-hover:scale-110" />
                </div>
                <div className="flex flex-col items-start md:items-center">
                  <div className="text-[11px] font-bold tracking-wider uppercase text-accent-blue-dark mb-0.5">Stage {stage.number}</div>
                  <div className="text-base font-bold text-primary leading-snug mb-1">{stage.label}</div>
                  <div className="text-xs text-secondary leading-relaxed max-w-full md:max-w-[190px]">{stage.shortDesc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detailed Interactive Showcase Panel */}
        <Reveal key={currentStage.id} triggerOnMount delayMs={0}>
          <div
            id={`stage-panel-${currentStage.id}`}
            className="bg-surface border border-border-subtle rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-card grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 items-center"
            role="tabpanel"
            aria-label={`${currentStage.label} stage details`}
          >
            {/* Left Description Column */}
            <div className="flex flex-col gap-3">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-blue-dark">
                <IconChip icon={IconComponent} tone="accent" size="sm" animate />
                <span>Stage {currentStage.number} • {currentStage.label}</span>
              </div>
              <h3 className="text-xl font-bold text-primary">{currentStage.title}</h3>
              <p className="text-sm text-secondary leading-relaxed">{currentStage.body}</p>

              <div className="flex flex-col gap-2 mt-2">
                {currentStage.highlights.map((point, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-primary font-medium">
                    <CheckCircle2 size={15} strokeWidth={1.75} className="text-accent-sage-dark shrink-0" aria-hidden="true" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Visual/Structural Snippet */}
            <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-5 md:p-6 flex flex-col gap-3">
              <div className="group bg-surface border border-border-subtle rounded-xl p-4 flex items-center gap-3 hover-lift transition-all">
                <IconChip icon={IconComponent} tone="success" size="md" animate />
                <div>
                  <div className="text-xs font-semibold text-primary">{currentStage.previewCard1.title}</div>
                  <div className="text-[11px] text-secondary">{currentStage.previewCard1.sub}</div>
                </div>
              </div>

              <div className="group bg-surface border border-border-subtle rounded-xl p-4 flex items-center gap-3 hover-lift transition-all">
                <IconChip icon={CheckCircle2} tone="accent" size="md" animate />
                <div>
                  <div className="text-xs font-semibold text-primary">{currentStage.previewCard2.title}</div>
                  <div className="text-[11px] text-secondary">{currentStage.previewCard2.sub}</div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

import React from 'react';
import { BookOpen } from 'lucide-react';
import EmptyState from '../EmptyState';
import CourseCard from './CourseCard';

export default function MyLearningTab({ data, setActiveTab }) {
  const enrolledCourses = data?.enrolledCourses || [];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-primary mb-1">Enrolled Courses & Tracks</h2>
          <p className="text-xs text-secondary leading-relaxed">
            Manage your active coursework, review module syllabi, and track graduation progress.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('explore')}
          className="px-3.5 py-1.5 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition cursor-pointer self-start sm:self-auto"
        >
          Explore Catalog
        </button>
      </div>

      {enrolledCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrolledCourses.filter((enr) => enr && enr.course).map((enr) => (
            <CourseCard
              key={enr.id}
              course={enr.course}
              enrollment={enr}
              variant="enrolled"
              onViewCertificate={() => setActiveTab('certificates')}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Your learning journey starts here."
          description="You are currently not enrolled in any courses. Browse the LearnSpace course library to discover comprehensive tracks in software engineering, design systems, and cloud architecture."
          actionLabel="Explore Available Courses"
          onAction={() => setActiveTab('explore')}
          secondaryActionLabel="Return to Overview"
          onSecondaryAction={() => setActiveTab('overview')}
        />
      )}
    </div>
  );
}


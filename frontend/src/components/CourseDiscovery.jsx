import React, { useState, useMemo } from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import { COURSE_CATEGORIES, COURSES_DATA } from '../data/coursesData';
import CourseCard from './CourseCard';

export default function CourseDiscovery({ onSelectCourse }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive filtering based on query & category
  const filteredCourses = useMemo(() => {
    return COURSES_DATA.filter((course) => {
      const matchesCategory =
        selectedCategory === 'All' || course.category.toLowerCase() === selectedCategory.toLowerCase();

      const normalizedQuery = searchQuery.trim().toLowerCase();
      if (!normalizedQuery) return matchesCategory;

      const matchesSearch =
        course.title.toLowerCase().includes(normalizedQuery) ||
        course.category.toLowerCase().includes(normalizedQuery) ||
        course.description.toLowerCase().includes(normalizedQuery) ||
        course.instructor.name.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSearchQuery('');
  };

  return (
    <section id="courses" className="pt-14 md:pt-16 pb-16 md:pb-20 bg-white border-y border-border-subtle" aria-label="Course Discovery and Exploration">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full">
        {/* Section Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-blue-dark mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" aria-hidden="true" />
            <span>Course Catalog</span>
          </div>
          <h2 className="text-[clamp(1.85rem,3.2vw,2.5rem)] font-bold tracking-tight text-primary leading-tight mb-3">Find your next skill.</h2>
          <p className="text-base text-secondary leading-relaxed max-w-[620px]">
            Explore learning paths built around the things you want to achieve, with clear outcomes and modular curriculum design.
          </p>
        </div>

        {/* Discovery Search and Category Filter Bar */}
        <div id="categories" className="flex flex-col gap-4 mb-8">
          <div className="relative w-full max-w-[580px]">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              className="w-full py-3.5 pl-11 pr-11 text-sm bg-surface-subtle border border-border-subtle rounded-xl text-primary transition-all focus:outline-none focus:bg-white focus:border-primary focus:shadow-sm placeholder:text-tertiary"
              placeholder="Search by topic, skill, or instructor name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search courses by keyword, topic, or instructor"
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:bg-border-subtle hover:text-primary w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search input"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills and Results Counter */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap" role="tablist" aria-label="Course categories">
              {COURSE_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === category}
                  className={`px-4 py-2 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                    selectedCategory === category
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-surface-subtle text-secondary border-border-subtle hover:text-primary hover:border-border-medium hover:bg-[#ECECE8]'
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="text-xs font-medium text-secondary">
              {filteredCourses.length === 1
                ? 'Showing 1 course'
                : `Showing ${filteredCourses.length} courses`}
              {selectedCategory !== 'All' && ` in ${selectedCategory}`}
            </div>
          </div>
        </div>

        {/* Course Cards Grid or Empty State */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onSelectCourse={onSelectCourse}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-surface-subtle border border-dashed border-border-medium rounded-2xl flex flex-col items-center gap-3 max-w-[520px] mx-auto" role="status">
            <div className="w-12 h-12 rounded-full bg-white border border-border-subtle flex items-center justify-center text-secondary" aria-hidden="true">
              <Search size={22} />
            </div>
            <h3 className="text-base font-bold text-primary">No matching courses found</h3>
            <p className="text-xs text-secondary max-w-[380px]">
              We couldn't find any courses matching "{searchQuery}" in {selectedCategory}. Try resetting your search terms or picking another category.
            </p>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 text-sm font-semibold rounded-xl bg-white text-primary border border-border-subtle hover:bg-surface-subtle hover:border-border-medium hover:-translate-y-0.5 shadow-xs transition-all cursor-pointer"
              onClick={handleResetFilters}
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

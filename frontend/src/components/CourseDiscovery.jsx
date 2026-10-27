import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { COURSE_CATEGORIES } from '../data/coursesData';
import CourseCard from './CourseCard';
import { courseService } from '../services/api';

const DIFFICULTY_LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'];

export default function CourseDiscovery({ onSelectCourse }) {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedLevel !== 'All') params.level = selectedLevel;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const data = await courseService.getCourses(params);
      setCourses(data.courses || []);
      setTotalCount(data.pagination?.total || (data.courses || []).length);
    } catch (err) {
      setError(err.normalizedMessage || 'Failed to load courses from catalog.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedLevel, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCourses();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchCourses]);

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSelectedLevel('All');
    setSearchQuery('');
  };

  const handleCardClick = (course) => {
    if (onSelectCourse) {
      onSelectCourse(course);
    } else {
      navigate(`/courses/${course.slug || course._id}`);
    }
  };

  return (
    <section
      id="courses"
      className="pt-14 md:pt-16 pb-16 md:pb-20 bg-white border-y border-border-subtle"
      aria-label="Course Discovery and Exploration"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full">
        {/* Section Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-blue-dark mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" aria-hidden="true" />
            <span>Course Catalog</span>
          </div>
          <h2 className="text-[clamp(1.85rem,3.2vw,2.5rem)] font-bold tracking-tight text-primary leading-tight mb-3">
            Find your next skill.
          </h2>
          <p className="text-base text-secondary leading-relaxed max-w-[620px]">
            Explore learning paths built around the things you want to achieve, with clear outcomes and modular curriculum design.
          </p>
        </div>

        {/* Discovery Search and Filter Bar */}
        <div id="categories" className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative w-full max-w-[580px]">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                className="w-full py-3 pl-11 pr-11 text-sm bg-surface-subtle border border-border-subtle rounded-xl text-primary transition-all focus:outline-none focus:bg-white focus:border-primary focus:shadow-sm placeholder:text-tertiary"
                placeholder="Search by topic, skill, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search courses by keyword or topic"
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

            {/* Difficulty Level Dropdown */}
            <div className="sm:w-44">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full py-3 px-3.5 text-xs bg-surface-subtle border border-border-subtle rounded-xl text-primary focus:outline-none focus:bg-white focus:border-primary font-medium"
                aria-label="Filter by difficulty level"
              >
                {DIFFICULTY_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    Level: {lvl}
                  </option>
                ))}
              </select>
            </div>
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
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin text-tertiary" />
                  Updating results...
                </span>
              ) : (
                <>
                  {totalCount === 1 ? 'Showing 1 course' : `Showing ${totalCount} courses`}
                  {selectedCategory !== 'All' && ` in ${selectedCategory}`}
                  {selectedLevel !== 'All' && ` (${selectedLevel})`}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-700">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchCourses}
              className="px-3 py-1 bg-white border border-rose-300 rounded-lg text-rose-800 font-semibold hover:bg-rose-100 transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && courses.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-surface-subtle border border-border-subtle rounded-2xl h-[360px] animate-pulse p-6 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-4 bg-border-subtle rounded w-1/3" />
                  <div className="h-6 bg-border-subtle rounded w-4/5" />
                  <div className="h-4 bg-border-subtle rounded w-full" />
                </div>
                <div className="h-8 bg-border-subtle rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : courses.length > 0 ? (
          /* Real Course Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course._id || course.id}
                course={course}
                onSelectCourse={() => handleCardClick(course)}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div
            className="text-center py-16 px-4 bg-surface-subtle border border-dashed border-border-medium rounded-2xl flex flex-col items-center gap-3 max-w-[520px] mx-auto"
            role="status"
          >
            <div
              className="w-12 h-12 rounded-full bg-white border border-border-subtle flex items-center justify-center text-secondary"
              aria-hidden="true"
            >
              <Search size={22} />
            </div>
            <h3 className="text-base font-bold text-primary">No matching courses found</h3>
            <p className="text-xs text-secondary max-w-[380px]">
              We couldn't find any courses matching your filters. Try resetting search terms or switching categories.
            </p>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 text-sm font-semibold rounded-xl bg-white text-primary border border-border-subtle hover:bg-surface-subtle hover:border-border-medium transition-all cursor-pointer shadow-xs"
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

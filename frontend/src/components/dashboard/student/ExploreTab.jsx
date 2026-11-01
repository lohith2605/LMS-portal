import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, RefreshCw, Compass, ChevronLeft, ChevronRight } from 'lucide-react';
import { courseService } from '../../../services/api';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import CourseCard from './CourseCard';

const EXPLORE_CATEGORIES = ['All', 'Development', 'Design', 'Data', 'Business', 'Other'];
const EXPLORE_LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced', 'All Levels'];
const EXPLORE_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'title', label: 'Title (A-Z)' },
];

export default function ExploreTab({ setActiveTab }) {
  const [exploreCourses, setExploreCourses] = useState([]);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [exploreError, setExploreError] = useState(null);
  const [exploreSearch, setExploreSearch] = useState('');
  const [exploreCategory, setExploreCategory] = useState('All');
  const [exploreLevel, setExploreLevel] = useState('All');
  const [exploreSort, setExploreSort] = useState('newest');
  const [explorePage, setExplorePage] = useState(1);
  const [explorePagination, setExplorePagination] = useState({
    page: 1,
    limit: 9,
    total: 0,
    totalPages: 1,
  });
  const exploreReqIdRef = useRef(0);

  const fetchExploreCourses = useCallback(async () => {
    const reqId = ++exploreReqIdRef.current;
    try {
      setExploreLoading(true);
      setExploreError(null);

      const params = {
        page: explorePage,
        limit: 9,
        sort: exploreSort,
      };

      if (exploreSearch.trim()) {
        params.search = exploreSearch.trim();
      }

      if (exploreCategory !== 'All') {
        params.category = exploreCategory;
      }

      if (exploreLevel !== 'All') {
        params.level = exploreLevel;
      }

      const res = await courseService.getCourses(params);

      if (reqId !== exploreReqIdRef.current) return;

      setExploreCourses(res?.courses || []);
      if (res?.pagination) {
        setExplorePagination(res.pagination);
      }
    } catch (err) {
      if (reqId !== exploreReqIdRef.current) return;
      setExploreError(err.normalizedMessage || 'Failed to retrieve course catalog.');
    } finally {
      if (reqId === exploreReqIdRef.current) {
        setExploreLoading(false);
      }
    }
  }, [explorePage, exploreSort, exploreSearch, exploreCategory, exploreLevel]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExploreCourses();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchExploreCourses]);

  const handleCategorySelect = (cat) => {
    setExploreCategory(cat);
    setExplorePage(1);
  };

  const handleLevelSelect = (lvl) => {
    setExploreLevel(lvl);
    setExplorePage(1);
  };

  const handleSortSelect = (sortVal) => {
    setExploreSort(sortVal);
    setExplorePage(1);
  };

  const handleSearchInput = (e) => {
    setExploreSearch(e.target.value);
    setExplorePage(1);
  };

  const handleClearSearch = () => {
    setExploreSearch('');
    setExplorePage(1);
  };

  const handleResetExploreFilters = () => {
    setExploreSearch('');
    setExploreCategory('All');
    setExploreLevel('All');
    setExploreSort('newest');
    setExplorePage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-primary mb-1">
            Curriculum Catalog & Course Discovery
          </h2>
          <p className="text-xs text-secondary">
            Browse published courses, examine syllabi, and enroll in structured learning tracks.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className="px-3.5 py-2 rounded-xl border border-border-subtle bg-surface-subtle text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer self-start sm:self-auto"
        >
          Back to Overview
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              className="w-full py-2.5 pl-10 pr-9 text-xs sm:text-sm bg-surface-subtle border border-border-subtle rounded-xl text-primary transition-all focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30 placeholder:text-tertiary"
              placeholder="Search courses by title, topic, or keyword..."
              value={exploreSearch}
              onChange={handleSearchInput}
              aria-label="Search course catalog"
            />
            {exploreSearch && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary w-5 h-5 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Clear search query"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Difficulty Level Dropdown */}
          <div className="w-full md:w-44">
            <select
              value={exploreLevel}
              onChange={(e) => handleLevelSelect(e.target.value)}
              className="w-full py-2.5 px-3 text-xs bg-surface-subtle border border-border-subtle rounded-xl text-primary focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30 font-medium cursor-pointer"
              aria-label="Filter by course difficulty level"
            >
              {EXPLORE_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  Level: {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="w-full md:w-44">
            <select
              value={exploreSort}
              onChange={(e) => handleSortSelect(e.target.value)}
              className="w-full py-2.5 px-3 text-xs bg-surface-subtle border border-border-subtle rounded-xl text-primary focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30 font-medium cursor-pointer"
              aria-label="Sort course catalog"
            >
              {EXPLORE_SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort: {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills & Results Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border-subtle">
          <div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Course categories">
            {EXPLORE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={exploreCategory === cat}
                onClick={() => handleCategorySelect(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  exploreCategory === cat
                    ? 'bg-cobalt text-white border-cobalt shadow-xs shadow-cobalt/20'
                    : 'bg-surface-subtle text-secondary border-border-subtle hover:text-primary hover:border-cobalt-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="text-xs font-medium text-secondary shrink-0">
            {exploreLoading ? (
              <span className="inline-flex items-center gap-1.5 text-tertiary">
                <RefreshCw size={12} className="animate-spin" />
                Updating catalog...
              </span>
            ) : (
              <span>
                Showing {exploreCourses.length} of {explorePagination.total} published courses
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error State */}
      {exploreError && (
        <ErrorState
          title="Failed to Load Courses"
          message={exploreError}
          onRetry={fetchExploreCourses}
        />
      )}

      {/* Loading Skeleton */}
      {exploreLoading && exploreCourses.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-white border border-border-subtle rounded-2xl p-6 h-[260px] animate-pulse flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 bg-surface-subtle rounded-full w-20" />
                  <div className="h-4 bg-surface-subtle rounded w-16" />
                </div>
                <div className="h-5 bg-surface-subtle rounded w-4/5" />
                <div className="h-3.5 bg-surface-subtle rounded w-full" />
                <div className="h-3.5 bg-surface-subtle rounded w-2/3" />
              </div>
              <div className="pt-4 border-t border-border-subtle flex justify-between items-center">
                <div className="h-6 bg-surface-subtle rounded-full w-24" />
                <div className="h-6 bg-surface-subtle rounded-lg w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!exploreLoading && !exploreError && exploreCourses.length === 0 && (
        <EmptyState
          icon={Compass}
          title="No matching courses found"
          description="We couldn't find any published courses matching your search query or filters. Try adjusting your keywords or clearing filters."
          actionLabel="Reset Filters"
          onAction={handleResetExploreFilters}
        />
      )}

      {/* Course Cards Grid */}
      {exploreCourses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exploreCourses.map((course) => (
            <CourseCard
              key={course._id || course.id}
              course={course}
              variant="explore"
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {explorePagination.totalPages > 1 && (
        <div className="pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-secondary font-medium">
            Showing page <strong>{explorePagination.page}</strong> of <strong>{explorePagination.totalPages}</strong> ({explorePagination.total} total courses)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExplorePage((p) => Math.max(1, p - 1))}
              disabled={explorePage <= 1 || exploreLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border-subtle bg-white text-xs font-semibold text-primary hover:bg-surface-subtle transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: explorePagination.totalPages }, (_, i) => i + 1).map((pg) => {
                const total = explorePagination.totalPages;
                const current = explorePage;
                if (pg === 1 || pg === total || (pg >= current - 1 && pg <= current + 1)) {
                  return (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setExplorePage(pg)}
                      className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        current === pg
                          ? 'bg-cobalt text-white shadow-xs shadow-cobalt/20'
                          : 'bg-white border border-border-subtle text-secondary hover:text-primary hover:bg-surface-subtle'
                      }`}
                    >
                      {pg}
                    </button>
                  );
                }
                if (pg === current - 2 || pg === current + 2) {
                  return (
                    <span key={`dots-${pg}`} className="px-1 text-xs text-tertiary">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>
            <button
              type="button"
              onClick={() => setExplorePage((p) => Math.min(explorePagination.totalPages, p + 1))}
              disabled={explorePage >= explorePagination.totalPages || exploreLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border-subtle bg-white text-xs font-semibold text-primary hover:bg-surface-subtle transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


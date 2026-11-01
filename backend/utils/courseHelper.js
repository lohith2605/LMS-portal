/**
 * Helper functions for course curriculum and lesson auditing
 */

/**
 * Extract all published lessons from a course's sections
 * A lesson is considered published if isPublished !== false
 * @param {Object} course
 * @returns {Array} Array of published lesson objects
 */
const getPublishedLessons = (course) => {
  if (!course || !Array.isArray(course.sections)) return [];
  return course.sections.flatMap((s) =>
    (s.lessons || []).filter((l) => l && l.isPublished !== false)
  );
};

module.exports = {
  getPublishedLessons,
};


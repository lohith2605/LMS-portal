import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send and receive HttpOnly cookies
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to normalize error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let errorMessage = 'A network or server error occurred. Please try again.';

    if (error.response && error.response.data) {
      errorMessage =
        error.response.data.error ||
        error.response.data.message ||
        errorMessage;
    } else if (error.message) {
      errorMessage = error.message;
    }

    error.normalizedMessage = errorMessage;
    return Promise.reject(error);
  }
);

export const authService = {
  /**
   * Register a new account
   */
  register: async ({ name, email, password, role = 'student' }) => {
    const res = await api.post('/auth/register', { name, email, password, role });
    return res.data;
  },

  /**
   * Log in with credentials
   */
  login: async ({ email, password }) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },

  /**
   * Log in or register with verified Firebase Google ID token
   */
  googleLogin: async (idToken) => {
    const res = await api.post('/auth/google', { idToken });
    return res.data;
  },

  /**
   * Log out and clear session cookie
   */
  logout: async () => {
    const res = await api.post('/auth/logout');
    return res.data;
  },

  /**
   * Fetch currently authenticated user profile
   */
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  /**
   * Request password reset instructions
   */
  forgotPassword: async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },

  /**
   * Submit new password with reset token
   */
  resetPassword: async ({ token, newPassword }) => {
    const res = await api.post('/auth/reset-password', { token, newPassword });
    return res.data;
  },

  /**
   * Change password for authenticated session
   */
  changePassword: async ({ currentPassword, newPassword }) => {
    const res = await api.patch('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  },

  /**
   * Verify email address with token
   */
  verifyEmail: async (token) => {
    const res = await api.post('/auth/verify-email', { token });
    return res.data;
  },
  resendVerification: async () => {
    const res = await api.post('/auth/resend-verification');
    return res.data;
  },

  /**
   * Upload or update user profile picture
   * @param {File} file - Image file (JPG, PNG, WebP)
   */
  updateProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await api.patch('/auth/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  /**
   * Remove profile picture and restore default avatar
   */
  deleteProfilePicture: async () => {
    const res = await api.delete('/auth/profile-picture');
    return res.data;
  },
};

export const dashboardService = {
  /**
   * Fetch authenticated student dashboard overview
   */
  getStudentOverview: async () => {
    const res = await api.get('/dashboard/student');
    return res.data;
  },

  /**
   * Fetch authenticated instructor dashboard overview
   */
  getInstructorOverview: async () => {
    const res = await api.get('/dashboard/instructor');
    return res.data;
  },
};

export const adminService = {
  /**
   * Fetch administrative platform metrics
   */
  getOverview: async () => {
    const res = await api.get('/admin/overview');
    return res.data;
  },

  /**
   * Fetch pending instructor applications
   */
  getPendingInstructors: async () => {
    const res = await api.get('/admin/instructors/pending');
    return res.data;
  },

  /**
   * Approve an instructor application
   */
  approveInstructor: async (id) => {
    const res = await api.patch(`/admin/instructors/${id}/approve`);
    return res.data;
  },

  /**
   * Reject an instructor application
   */
  rejectInstructor: async (id) => {
    const res = await api.patch(`/admin/instructors/${id}/reject`);
    return res.data;
  },

  /**
   * Retrieve platform user directory with search/filters
   */
  getUsers: async (params = {}) => {
    const res = await api.get('/admin/users', { params });
    return res.data;
  },

  /**
   * Get safe platform health telemetry
   */
  getPlatformHealth: async () => {
    const res = await api.get('/health');
    return res.data;
  },

  /**
   * Fetch courses pending administrative review
   */
  getPendingCourses: async () => {
    const res = await api.get('/admin/courses/pending');
    return res.data;
  },

  /**
   * Approve a course for public catalog
   */
  approveCourse: async (id) => {
    const res = await api.patch(`/admin/courses/${id}/approve`);
    return res.data;
  },

  /**
   * Reject a course with reason
   */
  rejectCourse: async (id, rejectionReason) => {
    const res = await api.patch(`/admin/courses/${id}/reject`, { rejectionReason });
    return res.data;
  },

  /**
   * Fetch reviews for admin moderation
   */
  getReviews: async (params = {}) => {
    const res = await api.get('/admin/reviews', { params });
    return res.data;
  },

  /**
   * Hide an inappropriate review
   */
  hideReview: async (id, reason = '') => {
    const res = await api.patch(`/admin/reviews/${id}/hide`, { reason });
    return res.data;
  },

  /**
   * Restore a hidden review to public display
   */
  restoreReview: async (id) => {
    const res = await api.patch(`/admin/reviews/${id}/restore`);
    return res.data;
  },
};

export const courseService = {
  /**
   * Discover published courses with filters, search, and pagination
   */
  getCourses: async (params = {}) => {
    const res = await api.get('/courses', { params });
    return res.data;
  },

  /**
   * Get course details and preview / full curriculum
   */
  getCourseByIdOrSlug: async (idOrSlug) => {
    const res = await api.get(`/courses/${idOrSlug}`);
    return res.data;
  },

  /**
   * Fetch protected lesson content
   */
  getLessonContent: async (idOrSlug, lessonId) => {
    const res = await api.get(`/courses/${idOrSlug}/lessons/${lessonId}`);
    return res.data;
  },

  /**
   * Enroll authenticated student in a course
   */
  enrollInCourse: async (courseId) => {
    const res = await api.post(`/courses/${courseId}/enroll`);
    return res.data;
  },

  /**
   * Toggle completion state for a lesson
   */
  toggleLessonComplete: async (courseId, lessonId) => {
    const res = await api.post(`/courses/${courseId}/lessons/${lessonId}/complete`);
    return res.data;
  },
};

export const instructorCourseService = {
  /**
   * Fetch courses authored by the current instructor
   */
  getCourses: async (params = {}) => {
    const res = await api.get('/instructor/courses', { params });
    return res.data;
  },

  /**
   * Fetch course details with complete curriculum for editing
   */
  getCourseById: async (courseId) => {
    const res = await api.get(`/instructor/courses/${courseId}`);
    return res.data;
  },

  /**
   * Create a new draft course
   */
  createCourse: async (data) => {
    const res = await api.post('/instructor/courses', data);
    return res.data;
  },

  /**
   * Update course metadata
   */
  updateCourse: async (courseId, data) => {
    const res = await api.patch(`/instructor/courses/${courseId}`, data);
    return res.data;
  },

  /**
   * Delete or archive course
   */
  deleteCourse: async (courseId) => {
    const res = await api.delete(`/instructor/courses/${courseId}`);
    return res.data;
  },

  /**
   * Submit course for administrator review
   */
  submitForReview: async (courseId) => {
    const res = await api.post(`/instructor/courses/${courseId}/submit-for-review`);
    return res.data;
  },

  /**
   * Add section to course
   */
  addSection: async (courseId, data) => {
    const res = await api.post(`/instructor/courses/${courseId}/sections`, data);
    return res.data;
  },

  /**
   * Update section title / description
   */
  updateSection: async (courseId, sectionId, data) => {
    const res = await api.patch(`/instructor/courses/${courseId}/sections/${sectionId}`, data);
    return res.data;
  },

  /**
   * Delete section from course
   */
  deleteSection: async (courseId, sectionId) => {
    const res = await api.delete(`/instructor/courses/${courseId}/sections/${sectionId}`);
    return res.data;
  },

  /**
   * Reorder sections
   */
  reorderSections: async (courseId, sectionIds) => {
    const res = await api.put(`/instructor/courses/${courseId}/sections/reorder`, { sectionIds });
    return res.data;
  },

  /**
   * Add lesson to section
   */
  addLesson: async (courseId, sectionId, data) => {
    const res = await api.post(`/instructor/courses/${courseId}/sections/${sectionId}/lessons`, data);
    return res.data;
  },

  /**
   * Update lesson content
   */
  updateLesson: async (courseId, sectionId, lessonId, data) => {
    const res = await api.patch(`/instructor/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`, data);
    return res.data;
  },

  /**
   * Delete lesson from section
   */
  deleteLesson: async (courseId, sectionId, lessonId) => {
    const res = await api.delete(`/instructor/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`);
    return res.data;
  },

  /**
   * Reorder lessons within a section
   */
  reorderLessons: async (courseId, sectionId, lessonIds) => {
    const res = await api.put(`/instructor/courses/${courseId}/sections/${sectionId}/lessons/reorder`, { lessonIds });
    return res.data;
  },
};

export const studentEnrollmentService = {
  /**
   * Fetch authenticated student's active enrollments
   */
  getEnrollments: async () => {
    const res = await api.get('/student/enrollments');
    return res.data;
  },

  /**
   * Fetch specific course learning progress
   */
  getCourseProgress: async (courseId) => {
    const res = await api.get(`/student/courses/${courseId}`);
    return res.data;
  },
};

export const quizService = {
  // Instructor quiz operations
  getInstructorCourseQuizzes: async (courseId) => {
    const res = await api.get(`/instructor/courses/${courseId}/quizzes`);
    return res.data;
  },
  getInstructorQuizzes: async (courseId) => {
    const res = await api.get(`/instructor/courses/${courseId}/quizzes`);
    return res.data;
  },
  getInstructorQuizById: async (quizId) => {
    const res = await api.get(`/instructor/quizzes/${quizId}`);
    return res.data;
  },
  createQuiz: async (courseId, data) => {
    const res = await api.post(`/instructor/courses/${courseId}/quizzes`, data);
    return res.data;
  },
  updateQuiz: async (quizId, data) => {
    const res = await api.patch(`/instructor/quizzes/${quizId}`, data);
    return res.data;
  },
  deleteQuiz: async (firstId, secondId) => {
    const targetId = secondId || firstId;
    const res = await api.delete(`/instructor/quizzes/${targetId}`);
    return res.data;
  },
  publishQuiz: async (firstId, secondId) => {
    const targetId = secondId || firstId;
    const res = await api.patch(`/instructor/quizzes/${targetId}/publish`);
    return res.data;
  },
  unpublishQuiz: async (firstId, secondId) => {
    const targetId = secondId || firstId;
    const res = await api.patch(`/instructor/quizzes/${targetId}/unpublish`);
    return res.data;
  },
  getQuizAnalytics: async (quizId) => {
    const res = await api.get(`/instructor/quizzes/${quizId}/analytics`);
    return res.data;
  },

  // Student quiz operations
  getCourseQuizzes: async (courseIdOrSlug) => {
    const res = await api.get(`/courses/${courseIdOrSlug}/quizzes`);
    return res.data;
  },
  getQuizForAttempt: async (courseIdOrSlug, quizId) => {
    const res = await api.get(`/courses/${courseIdOrSlug}/quizzes/${quizId}`);
    return res.data;
  },
  startQuizAttempt: async (courseIdOrSlug, quizId) => {
    const res = await api.post(`/courses/${courseIdOrSlug}/quizzes/${quizId}/start`);
    return res.data;
  },
  submitQuizAttempt: async (courseIdOrSlug, quizId, attemptId, answers) => {
    const res = await api.post(
      `/courses/${courseIdOrSlug}/quizzes/${quizId}/attempts/${attemptId}/submit`,
      { answers }
    );
    return res.data;
  },
  getStudentQuizAttempts: async (courseIdOrSlug, quizId) => {
    const res = await api.get(`/courses/${courseIdOrSlug}/quizzes/${quizId}/attempts`);
    return res.data;
  },
  getQuizAttemptResult: async (attemptId) => {
    const res = await api.get(`/student/quiz-attempts/${attemptId}`);
    return res.data;
  },
};

export const certificateService = {
  getCompletionStatus: async (courseIdOrSlug) => {
    const res = await api.get(`/courses/${courseIdOrSlug}/completion-status`);
    const data = res.data;
    if (!data) return data;

    const criteria = data.criteria || {};
    const totalMandatoryQuizzes = criteria.totalMandatoryQuizzes ?? 0;
    const mandatoryQuizzesPassed = criteria.mandatoryQuizzesPassed ?? 0;
    const allQuizzesPassed =
      criteria.allQuizzesPassed ??
      (totalMandatoryQuizzes === 0 || mandatoryQuizzesPassed >= totalMandatoryQuizzes);
    const totalLessons = criteria.totalLessons ?? 0;
    const lessonsCompleted = criteria.lessonsCompleted ?? 0;
    const allLessonsCompleted =
      criteria.allLessonsCompleted ??
      (totalLessons > 0 && lessonsCompleted >= totalLessons);
    const isEligible = Boolean(
      data.isEligibleForCompletion ??
        data.isEligible ??
        (allLessonsCompleted && allQuizzesPassed)
    );
    const certificateIssued = Boolean(
      data.certificateIssued || data.certificate || data.certificateId
    );

    return {
      ...data,
      isEligible,
      isEligibleForCompletion: isEligible,
      certificateIssued,
      certificate: data.certificate || null,
      criteria: {
        ...criteria,
        totalLessons,
        lessonsCompleted,
        allLessonsCompleted,
        totalMandatoryQuizzes,
        mandatoryQuizzesPassed,
        allQuizzesPassed,
      },
      progress: {
        lessons: {
          completed: allLessonsCompleted,
          completedCount: lessonsCompleted,
          totalCount: totalLessons,
        },
        quizzes: {
          completed: allQuizzesPassed,
          passedCount: mandatoryQuizzesPassed,
          requiredCount: totalMandatoryQuizzes,
        },
      },
    };
  },
  claimCertificate: async (courseIdOrSlug) => {
    const res = await api.post(`/courses/${courseIdOrSlug}/claim-certificate`);
    return res.data;
  },
  getStudentCertificates: async () => {
    const res = await api.get('/student/certificates');
    return res.data;
  },
  verifyCertificate: async (certificateId) => {
    const res = await api.get(`/certificates/${certificateId}`);
    return res.data;
  },
};

export const assignmentService = {
  // Instructor assignment endpoints
  createAssignment: async (courseId, data) => {
    const res = await api.post(`/instructor/courses/${courseId}/assignments`, data);
    return res.data;
  },
  getInstructorAssignments: async (courseId) => {
    const res = await api.get('/instructor/assignments', {
      params: courseId && courseId !== 'all' ? { courseId } : {},
    });
    return res.data;
  },
  getInstructorCourseAssignments: async (courseId) => {
    const res = await api.get(`/instructor/courses/${courseId}/assignments`);
    return res.data;
  },
  getCourseAssignmentsForInstructor: async (courseId) => {
    if (courseId && courseId !== 'all') {
      const res = await api.get(`/instructor/courses/${courseId}/assignments`);
      return res.data;
    }
    const res = await api.get('/instructor/assignments');
    return res.data;
  },
  getInstructorAssignmentById: async (assignmentId) => {
    const res = await api.get(`/instructor/assignments/${assignmentId}`);
    return res.data;
  },
  updateAssignment: async (assignmentId, data) => {
    const res = await api.patch(`/instructor/assignments/${assignmentId}`, data);
    return res.data;
  },
  publishAssignment: async (assignmentId) => {
    const res = await api.post(`/instructor/assignments/${assignmentId}/publish`);
    return res.data;
  },
  archiveAssignment: async (assignmentId) => {
    const res = await api.patch(`/instructor/assignments/${assignmentId}/archive`);
    return res.data;
  },
  deleteAssignment: async (assignmentId) => {
    const res = await api.delete(`/instructor/assignments/${assignmentId}`);
    return res.data;
  },
  getAssignmentSubmissions: async (assignmentId, filterStatus) => {
    const res = await api.get(`/instructor/assignments/${assignmentId}/submissions`, {
      params: filterStatus ? { filterStatus } : {},
    });
    return res.data;
  },
  getSubmissionById: async (submissionId) => {
    const res = await api.get(`/instructor/submissions/${submissionId}`);
    return res.data;
  },
  gradeSubmission: async (submissionId, data) => {
    const res = await api.patch(`/instructor/submissions/${submissionId}/grade`, data);
    return res.data;
  },
  returnSubmissionForRevision: async (submissionId, data) => {
    const res = await api.post(`/instructor/submissions/${submissionId}/return-for-revision`, data);
    return res.data;
  },

  // Student assignment endpoints
  getStudentAssignments: async () => {
    const res = await api.get('/student/assignments');
    return res.data;
  },
  getCourseAssignments: async (courseIdOrSlug) => {
    const res = await api.get(`/courses/${courseIdOrSlug}/assignments`);
    return res.data;
  },
  getStudentAssignmentDetails: async (assignmentId) => {
    const res = await api.get(`/student/assignments/${assignmentId}`);
    return res.data;
  },
  uploadAssignmentFile: async (assignmentId, file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/student/assignments/${assignmentId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return res.data;
  },
  submitAssignment: async (assignmentId, data) => {
    const res = await api.post(`/student/assignments/${assignmentId}/submissions`, data);
    return res.data;
  },
  getStudentSubmission: async (assignmentId) => {
    const res = await api.get(`/student/assignments/${assignmentId}/my-submission`);
    return res.data;
  },
  getStudentGrades: async () => {
    const res = await api.get('/student/grades');
    return res.data;
  },
  getFileDownloadUrl: (fileUrl) => {
    if (!fileUrl) return '#';
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('data:')) {
      return fileUrl;
    }
    const base = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL;
    return `${base}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
  },
};



export const discussionService = {
  getCourseDiscussions: async (courseIdOrSlug, params = {}) => {
    const res = await api.get(`/discussions/course/${courseIdOrSlug}`, { params });
    return res.data;
  },
  createDiscussion: async (courseIdOrSlug, data) => {
    const res = await api.post(`/discussions/course/${courseIdOrSlug}`, data);
    return res.data;
  },
  getDiscussionById: async (id, params = {}) => {
    const res = await api.get(`/discussions/${id}`, { params });
    return res.data;
  },
  updateDiscussion: async (id, data) => {
    const res = await api.patch(`/discussions/${id}`, data);
    return res.data;
  },
  deleteDiscussion: async (id) => {
    const res = await api.delete(`/discussions/${id}`);
    return res.data;
  },
  createReply: async (discussionId, data) => {
    const res = await api.post(`/discussions/${discussionId}/replies`, data);
    return res.data;
  },
  updateReply: async (discussionId, replyId, data) => {
    const res = await api.patch(`/discussions/${discussionId}/replies/${replyId}`, data);
    return res.data;
  },
  deleteReply: async (discussionId, replyId) => {
    const res = await api.delete(`/discussions/${discussionId}/replies/${replyId}`);
    return res.data;
  },
  toggleAcceptedAnswer: async (discussionId, replyId) => {
    const res = await api.patch(`/discussions/${discussionId}/replies/${replyId}/accept`);
    return res.data;
  },
  togglePinDiscussion: async (id) => {
    const res = await api.patch(`/discussions/${id}/pin`);
    return res.data;
  },
  toggleLockDiscussion: async (id) => {
    const res = await api.patch(`/discussions/${id}/lock`);
    return res.data;
  },
};


export const notificationService = {
  getNotifications: async (params = {}) => {
    const res = await api.get('/notifications', { params });
    return res.data;
  },
  getUnreadCount: async () => {
    const res = await api.get('/notifications/unread-count');
    return res.data;
  },
  markAsRead: async (id) => {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  },
  markAllAsRead: async () => {
    const res = await api.patch('/notifications/mark-all-read');
    return res.data;
  },
};


export const calendarService = {
  getCalendarEvents: async (params = {}) => {
    const res = await api.get('/calendar', { params });
    return res.data;
  },
  getUpcomingDeadlines: async (params = {}) => {
    const res = await api.get('/calendar/upcoming', { params });
    return res.data;
  },
};

export const reviewService = {
  /**
   * Fetch approved public student testimonials for landing page carousel
   */
  getTestimonials: async (params = {}) => {
    const res = await api.get('/reviews/testimonials', { params });
    return res.data;
  },

  /**
   * Fetch public paginated reviews and summary for a course
   */
  getCourseReviews: async (idOrSlug, params = {}) => {
    const res = await api.get(`/courses/${idOrSlug}/reviews`, { params });
    return res.data;
  },

  /**
   * Check eligibility and retrieve student's existing review
   */
  getMyReview: async (idOrSlug) => {
    const res = await api.get(`/courses/${idOrSlug}/reviews/my-review`);
    return res.data;
  },

  /**
   * Submit a new course review
   */
  createReview: async (idOrSlug, data) => {
    const res = await api.post(`/courses/${idOrSlug}/reviews`, data);
    return res.data;
  },

  /**
   * Update an existing review
   */
  updateReview: async (idOrSlug, reviewId, data) => {
    const res = await api.patch(`/courses/${idOrSlug}/reviews/${reviewId}`, data);
    return res.data;
  },

  /**
   * Delete a student review
   */
  deleteReview: async (idOrSlug, reviewId) => {
    const res = await api.delete(`/courses/${idOrSlug}/reviews/${reviewId}`);
    return res.data;
  },
};

export const analyticsService = {
  /**
   * Fetch authenticated student learning analytics
   */
  getStudentAnalytics: async () => {
    const res = await api.get('/student/analytics');
    return res.data;
  },

  /**
   * Fetch authenticated instructor course portfolio analytics
   */
  getInstructorAnalytics: async () => {
    const res = await api.get('/instructor/analytics');
    return res.data;
  },

  /**
   * Fetch platform-wide analytics for administrator
   */
  getAdminAnalytics: async () => {
    const res = await api.get('/admin/analytics');
    return res.data;
  },
};

export const contactService = {
  /**
   * Submit support message or general inquiry
   * @param {{ name: string, email: string, subject: string, message: string }} payload
   */
  submitMessage: async (payload) => {
    const res = await api.post('/contact', payload);
    return res.data;
  },
};

export default api;
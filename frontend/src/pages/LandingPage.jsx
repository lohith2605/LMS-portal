import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import SkillShowcaseBanner from '../components/SkillShowcaseBanner';
import CourseDiscovery from '../components/CourseDiscovery';
import LearningJourney from '../components/LearningJourney';
import PlatformFeatures from '../components/PlatformFeatures';
import InstructorSection from '../components/InstructorSection';
import FinalCTA from '../components/FinalCTA';
import Footer from '../components/Footer';
import CourseModal from '../components/CourseModal';
import AuthModal from '../components/AuthModal';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [authModalConfig, setAuthModalConfig] = useState({
    isOpen: false,
    mode: 'register',
    courseContext: null,
  });

  const handleOpenAuth = (mode = 'register', course = null) => {
    // If it's a direct navigation request to login or register, we can navigate directly or open modal
    // Here we support routing to dedicated pages for full UX:
    if (mode === 'login') {
      navigate('/login');
      return;
    }
    if (mode === 'register') {
      navigate('/register');
      return;
    }
    if (mode === 'instructor') {
      navigate('/register?role=instructor');
      return;
    }

    setAuthModalConfig({
      isOpen: true,
      mode,
      courseContext: course,
    });
  };

  const handleCloseAuth = () => {
    setAuthModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const navOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="min-h-screen bg-page text-primary font-sans antialiased overflow-x-clip selection:bg-accent-sage-pale selection:text-primary">
      {/* Navigation */}
      <Navbar
        brandName="LearnSpace"
        onOpenAuth={(mode) => handleOpenAuth(mode)}
      />

      {/* Main Page Content */}
      <main id="main-content" className="pt-[72px]">
        {/* Hero Section with Product Window Preview */}
        <HeroSection
          onExploreCourses={() => scrollToSection('courses')}
          onHowItWorks={() => scrollToSection('journey')}
        />

        {/* Skill Showcase Banners with Floating Glass Stickers */}
        <SkillShowcaseBanner
          onExploreCourses={() => scrollToSection('courses')}
          onGetStarted={() => handleOpenAuth('register')}
        />

        {/* Course Discovery & Catalog */}
        <CourseDiscovery
          onSelectCourse={(course) => setSelectedCourse(course)}
        />

        {/* The 5-Stage Learning Journey */}
        <LearningJourney />

        {/* Integrated Platform Features */}
        <PlatformFeatures />

        {/* Instructor Callout & Dashboard Preview */}
        <InstructorSection
          onInstructorInquiry={() => handleOpenAuth('instructor')}
        />

        {/* Final Call to Action */}
        <FinalCTA
          onExploreCourses={() => scrollToSection('courses')}
          onGetStarted={() => handleOpenAuth('register')}
        />
      </main>

      {/* Footer */}
      <Footer
        brandName="LearnSpace"
        onOpenAuth={(mode) => handleOpenAuth(mode)}
      />

      {/* Course Detail / Syllabus Preview Dialog */}
      <CourseModal
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
        onEnrollInterest={(course) => {
          handleOpenAuth('register', course);
        }}
      />

      {/* Auth / Early Access Dialog */}
      <AuthModal
        isOpen={authModalConfig.isOpen}
        mode={authModalConfig.mode}
        courseContext={authModalConfig.courseContext}
        onClose={handleCloseAuth}
      />
    </div>
  );
}

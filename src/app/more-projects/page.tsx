import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Related Projects - Tracking',
  description: 'Explore more projects by Bookchaowalit. Discover our collection of web applications and tools.',
  keywords: ['related projects', 'more apps', 'Bookchaowalit', 'web applications'],
  openGraph: {
    title: 'Related Projects - Tracking',
    description: 'Explore more projects by Bookchaowalit',
    type: 'website',
  },
};

export default function RelatedProjectsPage() {
  return (
    <main id="main-content" className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">
          More Projects
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-12">
          Explore our collection of web applications and tools
        </p>

        
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white capitalize">
            {'productivity'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <Link
              href="https://bookchaowalit-pomodoro-timer-fronte.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Pomodoro Timer
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-pomodoro-timer-fronte.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-habit-tracker-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Habit Tracker
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-habit-tracker-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-goal-tracker-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Goal Tracker
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-goal-tracker-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-time-tracker-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Time Tracker
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-time-tracker-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-todo-board-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Todo Board
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-todo-board-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-calendar-app-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Calendar App
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-calendar-app-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-reminders-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Reminders
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-reminders-frontend.vercel.app →
              </p>
            </Link>
            
          </div>
        </section>
        
        
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white capitalize">
            {'dev tools'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <Link
              href="https://bookchaowalit-jsonconverter-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                JSON Converter
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-jsonconverter-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-base64-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Base64 Encoder
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-base64-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-regex-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Regex Tester
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-regex-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-hashgen-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Hash Generator
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-hashgen-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-cron-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Cron Expression
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-cron-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-diffchecker-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Diff Checker
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-diffchecker-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-minifier-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Minifier
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-minifier-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-url-encoder-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                URL Encoder
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-url-encoder-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-url-shortener-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                URL Shortener
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-url-shortener-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-deeplinks-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Deep Links
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-deeplinks-frontend.vercel.app →
              </p>
            </Link>
            
          </div>
        </section>
        
        
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white capitalize">
            {'content tools'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <Link
              href="https://bookchaowalit-markdown-editor-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Markdown Editor
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-markdown-editor-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-text-summarizer-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Text Summarizer
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-text-summarizer-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-quote-generator-front.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Quote Generator
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-quote-generator-front.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-meme-generator-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Meme Generator
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-meme-generator-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-number-converter-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Number Converter
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-number-converter-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-date-calculator-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Date Calculator
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-date-calculator-frontend.vercel.app →
              </p>
            </Link>
            
          </div>
        </section>
        
        
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white capitalize">
            {'webmaster'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <Link
              href="https://bookchaowalit-seo-analyzer-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                SEO Analyzer
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-seo-analyzer-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-analytics-dashboard-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Analytics Dashboard
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-analytics-dashboard-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-uptime-monitor-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Uptime Monitor
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-uptime-monitor-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-error-logs-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Error Logs
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-error-logs-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-redirect-manager-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Redirect Manager
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-redirect-manager-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-status-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Status Page
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-status-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-popular-pages-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Popular Pages
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-popular-pages-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-link-analytics-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Link Analytics
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-link-analytics-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-webhook-tester-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Webhook Tester
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-webhook-tester-frontend.vercel.app →
              </p>
            </Link>
            
          </div>
        </section>
        
        
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white capitalize">
            {'communication'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <Link
              href="https://bookchaowalit-contact-forms-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Contact Forms
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-contact-forms-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-newsletter-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Newsletter
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-newsletter-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-comments-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Comments
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-comments-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-guestbook-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Guestbook
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-guestbook-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-chat-playground-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Chat Playground
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-chat-playground-frontend.vercel.app →
              </p>
            </Link>
            
          </div>
        </section>
        
        
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white capitalize">
            {'Main Sites'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <Link
              href="https://bookchaowalit.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Portfolio
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit.com →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-techblog-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Blog
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-techblog-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-devhub-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                DevHub
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-devhub-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-wiki-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Wiki
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-wiki-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-techspace-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                TechSpace
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-techspace-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-tracking-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Tracking
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-tracking-frontend.vercel.app →
              </p>
            </Link>
            
            
            <Link
              href="https://bookchaowalit-linktree-frontend.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Linktree
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                https://bookchaowalit-linktree-frontend.vercel.app →
              </p>
            </Link>
            
          </div>
        </section>
        
      </div>
    </main>
  );
}

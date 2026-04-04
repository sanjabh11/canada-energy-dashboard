/**
 * Contact Page Component
 *
 * Professional contact page with form validation, multiple contact methods,
 * FAQ section, and support resources.
 */

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, AlertCircle, ArrowLeft, MessageSquare, FileText, Users } from 'lucide-react';
import { CONTAINER_CLASSES } from '../lib/ui/layout';

interface ContactFormData {
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
  inquiryType: string;
}

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: '',
    inquiryType: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState<string>('');
  const [errors, setErrors] = useState<Partial<ContactFormData>>({});
  const fieldIds = {
    name: 'contact-name',
    email: 'contact-email',
    company: 'contact-company',
    inquiryType: 'contact-inquiry-type',
    subject: 'contact-subject',
    message: 'contact-message',
  } as const;

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ContactFormData> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.message.trim()) newErrors.message = 'Message is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setSubmitMessage('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) throw new Error('Supabase URL not configured');

      const res = await fetch(`${supabaseUrl}/functions/v1/lead-capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company || null,
          subject: formData.subject,
          message: formData.message,
          inquiry_type: formData.inquiryType,
          source: `${window.location.origin}${window.location.pathname}`,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `Server error: ${res.status}`);
      }

      setSubmitStatus('success');
      setSubmitMessage('Message sent successfully. We will get back to you within 24 hours.');
      setFormData({
        name: '',
        email: '',
        company: '',
        subject: '',
        message: '',
        inquiryType: 'general'
      });
    } catch (error) {
      setSubmitStatus('error');
      setSubmitMessage(
        error instanceof Error
          ? error.message
          : 'We could not submit your message. Please try again or contact us directly.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqs = [
    {
      question: 'How do I access energy data with freshness labels?',
      answer: 'Current energy data is available through the dashboard, with live, stale, and fallback status shown per surface where that metadata exists. Use freshness badges and trust notices to distinguish operator-fed data from demo or backup datasets.'
    },
    {
      question: 'What data sources do you use?',
      answer: 'We integrate data from official sources including IESO (Ontario), Hydro-Québec, BC Hydro, AESO (Alberta), and other provincial energy authorities.'
    },
    {
      question: 'Is the platform free to use?',
      answer: 'Yes, the platform provides free access to core analytics and selected data views. Premium features and API access are available through subscription plans, and some views may rely on snapshot or fallback data depending on source availability.'
    },
    {
      question: 'How often is the data updated?',
      answer: 'Update cadence varies by source. Some feeds refresh every 30 seconds to 5 minutes when live connections are available, while other surfaces use slower snapshot refreshes or explicitly labeled fallback datasets.'
    },
    {
      question: 'Do you support Indigenous consultation workflows?',
      answer: 'Yes, we have dedicated features for Indigenous consultation tracking, UNDRIP compliance, and traditional ecological knowledge integration.'
    }
  ];

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-lg">
        <div className={`${CONTAINER_CLASSES.page} py-16`}>
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
          </div>

          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-white/20 p-4 rounded-full">
                <MessageSquare className="h-12 w-12" />
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-6">Contact Us</h1>
            <p className="text-xl text-green-100 leading-relaxed">
              Get in touch with our team for support, partnerships, or questions about our platform.
            </p>
          </div>
        </div>
      </div>

      <div className={`${CONTAINER_CLASSES.page} py-16`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-primary mb-6">Get In Touch</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary mb-1">Email</h3>
                    <p className="text-secondary mb-1">info@canada-energy.net</p>
                    <p className="text-sm text-tertiary">We respond within 24 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Phone className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary mb-1">Phone</h3>
                    <p className="text-secondary mb-1">+1 (555) 123-4567</p>
                    <p className="text-sm text-tertiary">Mon-Fri, 9AM-6PM EST</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <MapPin className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary mb-1">Office</h3>
                    <p className="text-secondary mb-1">Toronto, Ontario, Canada</p>
                    <p className="text-sm text-tertiary">Serving all Canadian provinces</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary mb-1">Response Time</h3>
                    <p className="text-secondary mb-1">Within 24 hours</p>
                    <p className="text-sm text-tertiary">Emergency support available</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Contact Options */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Quick Options</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center gap-3 p-3 border border-[var(--border-subtle)] rounded-lg hover:bg-secondary transition-colors text-left">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium text-primary">Request API Access</div>
                    <div className="text-sm text-tertiary">For developers and enterprises</div>
                  </div>
                </button>
                <button className="w-full flex items-center gap-3 p-3 border border-[var(--border-subtle)] rounded-lg hover:bg-secondary transition-colors text-left">
                  <Users className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium text-primary">Partnership Inquiry</div>
                    <div className="text-sm text-tertiary">For government and industry</div>
                  </div>
                </button>
                <button className="w-full flex items-center gap-3 p-3 border border-[var(--border-subtle)] rounded-lg hover:bg-secondary transition-colors text-left">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                  <div>
                    <div className="font-medium text-primary">Technical Support</div>
                    <div className="text-sm text-tertiary">For platform issues</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-primary mb-6">Send us a Message</h2>

              {submitStatus === 'success' && (
                <div data-testid="contact-submit-success" className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3" aria-live="polite">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-800">Message Sent Successfully!</div>
                    <div className="text-sm text-green-700">{submitMessage || "We'll get back to you within 24 hours."}</div>
                  </div>
                </div>
              )}

              {submitStatus === 'error' && (
                <div data-testid="contact-submit-error" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3" aria-live="polite">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="font-medium text-red-800">Failed to Send Message</div>
                    <div className="text-sm text-red-700">{submitMessage || 'Please try again or contact us directly.'}</div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor={fieldIds.name} className="block text-sm font-medium text-secondary mb-2">
                      Full Name *
                    </label>
                    <input
                      id={fieldIds.name}
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg bg-secondary text-primary placeholder:text-tertiary focus:ring-2 focus:ring-electric focus:border-transparent transition-colors border ${
                        errors.name ? 'border-red-400' : 'border-[var(--border-medium)]'
                      }`}
                      placeholder="Your full name"
                    />
                    {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor={fieldIds.email} className="block text-sm font-medium text-secondary mb-2">
                      Email Address *
                    </label>
                    <input
                      id={fieldIds.email}
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg bg-secondary text-primary placeholder:text-tertiary focus:ring-2 focus:ring-electric focus:border-transparent transition-colors border ${
                        errors.email ? 'border-red-400' : 'border-[var(--border-medium)]'
                      }`}
                      placeholder="your.email@example.com"
                    />
                    {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor={fieldIds.company} className="block text-sm font-medium text-secondary mb-2">
                      Company/Organization
                    </label>
                    <input
                      id={fieldIds.company}
                      type="text"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-secondary text-primary placeholder:text-tertiary border border-[var(--border-medium)] focus:ring-2 focus:ring-electric focus:border-transparent transition-colors"
                      placeholder="Your organization"
                    />
                  </div>

                  <div>
                    <label htmlFor={fieldIds.inquiryType} className="block text-sm font-medium text-secondary mb-2">
                      Inquiry Type
                    </label>
                    <select
                      id={fieldIds.inquiryType}
                      value={formData.inquiryType}
                      onChange={(e) => handleInputChange('inquiryType', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-secondary text-primary border border-[var(--border-medium)] focus:ring-2 focus:ring-electric focus:border-transparent transition-colors"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="technical">Technical Support</option>
                      <option value="partnership">Partnership</option>
                      <option value="api">API Access</option>
                      <option value="data">Data Questions</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor={fieldIds.subject} className="block text-sm font-medium text-secondary mb-2">
                    Subject *
                  </label>
                  <input
                    id={fieldIds.subject}
                    type="text"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg bg-secondary text-primary placeholder:text-tertiary focus:ring-2 focus:ring-electric focus:border-transparent transition-colors border ${
                      errors.subject ? 'border-red-400' : 'border-[var(--border-medium)]'
                    }`}
                    placeholder="Brief subject line"
                  />
                  {errors.subject && <p className="text-sm text-red-600 mt-1">{errors.subject}</p>}
                </div>

                <div>
                  <label htmlFor={fieldIds.message} className="block text-sm font-medium text-secondary mb-2">
                    Message *
                  </label>
                  <textarea
                    id={fieldIds.message}
                    rows={6}
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg bg-secondary text-primary placeholder:text-tertiary focus:ring-2 focus:ring-electric focus:border-transparent transition-colors border ${
                      errors.message ? 'border-red-400' : 'border-[var(--border-medium)]'
                    }`}
                    placeholder="Please describe your inquiry in detail..."
                  />
                  {errors.message && <p className="text-sm text-red-600 mt-1">{errors.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending Message...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-secondary max-w-2xl mx-auto">
              Find quick answers to common questions about our platform and services.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="card p-6 hover:shadow-md transition-shadow text-left"
              >
                <h3 className="font-semibold text-primary mb-3">{faq.question}</h3>
                <p className="text-secondary text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Support Resources */}
        <div className="mt-16 card text-center p-8">
          <h2 className="text-2xl font-bold text-primary mb-4">Need More Help?</h2>
          <p className="text-secondary mb-6 max-w-2xl mx-auto">
            Explore our comprehensive documentation, API guides, and community resources
            to get the most out of the platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-secondary hover:bg-secondary/80 text-primary px-6 py-3 rounded-lg font-medium transition-colors border border-[var(--border-subtle)]">
              View Documentation
            </button>
            <button className="bg-secondary hover:bg-secondary/80 text-electric px-6 py-3 rounded-lg font-medium transition-colors border border-[var(--border-subtle)]">
              API Reference
            </button>
            <button className="bg-secondary hover:bg-secondary/80 text-success px-6 py-3 rounded-lg font-medium transition-colors border border-[var(--border-subtle)]">
              Community Forum
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;

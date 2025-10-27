/**
 * About Page Component
 *
 * Professional about page to build trust and credibility
 * with company information, team, mission, and certifications.
 */

import React from 'react';
import { Users, Target, Award, Shield, Clock, MapPin, Mail, Phone, Globe, ArrowLeft } from 'lucide-react';
import { CONTAINER_CLASSES, TEXT_CLASSES } from '../lib/ui/layout';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
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
                <Globe className="h-12 w-12" />
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-6">About Canada Energy Intelligence Platform</h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              Leading the future of Canadian energy analytics with real-time data, AI-powered insights,
              and comprehensive monitoring across all provinces.
            </p>
          </div>
        </div>
      </div>

      <div className={`${CONTAINER_CLASSES.page} py-16 space-y-16`}>
        {/* Mission Section */}
        <div className="text-center max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-blue-100 p-3 rounded-full">
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-6">Our Mission</h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-6">
              To democratize access to Canadian energy data through advanced analytics, real-time monitoring,
              and AI-powered insights that support informed decision-making for energy professionals,
              policymakers, and the public.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="bg-green-100 p-3 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">Transparency</h3>
                <p className="text-sm text-slate-600">Open access to energy data with clear provenance and quality indicators</p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 p-3 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">Collaboration</h3>
                <p className="text-sm text-slate-600">Multi-stakeholder engagement including Indigenous communities and industry partners</p>
              </div>
              <div className="text-center">
                <div className="bg-orange-100 p-3 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <Award className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">Innovation</h3>
                <p className="text-sm text-slate-600">Cutting-edge AI and machine learning for predictive analytics and optimization</p>
              </div>
            </div>
          </div>
        </div>

        {/* Technology Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-6">Advanced Technology Stack</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                  <Globe className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">Real-Time Data Streaming</h3>
                  <p className="text-slate-600">Live data feeds from all Canadian provinces with sub-minute updates and resilient architecture</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">AI-Powered Analytics</h3>
                  <p className="text-slate-600">Machine learning models for forecasting, anomaly detection, and optimization recommendations</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-green-100 p-2 rounded-lg flex-shrink-0">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">Enterprise Security</h3>
                  <p className="text-slate-600">Bank-grade security with end-to-end encryption, compliance monitoring, and audit trails</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800 mb-6">Platform Capabilities</h3>
            <div className="space-y-4">
              {[
                { label: 'Data Sources', value: '4+ Active' },
                { label: 'Provinces Covered', value: '10/10' },
                { label: 'Update Frequency', value: '< 30 seconds' },
                { label: 'Uptime SLA', value: '99.9%' },
                { label: 'Data Retention', value: '5+ years' },
                { label: 'API Endpoints', value: '25+' }
              ].map((stat, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">{stat.label}</span>
                  <span className="font-semibold text-slate-800">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="text-center max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-indigo-100 p-3 rounded-full">
                <Users className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-6">Our Team</h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              A diverse team of energy experts, data scientists, software engineers, and policy specialists
              working together to build Canada's most comprehensive energy intelligence platform.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-slate-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Users className="h-10 w-10 text-slate-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">Energy Experts</h3>
                <p className="text-sm text-slate-600">Deep domain knowledge in Canadian energy markets and regulations</p>
              </div>
              <div className="text-center">
                <div className="bg-slate-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Target className="h-10 w-10 text-slate-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">Data Scientists</h3>
                <p className="text-sm text-slate-600">Advanced analytics and machine learning for predictive insights</p>
              </div>
              <div className="text-center">
                <div className="bg-slate-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Shield className="h-10 w-10 text-slate-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">Engineers</h3>
                <p className="text-sm text-slate-600">Scalable architecture and robust security implementation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Certifications & Compliance */}
        <div className="text-center max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-green-100 p-3 rounded-full">
                <Award className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-6">Certifications & Compliance</h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              We maintain the highest standards of data security, privacy, and regulatory compliance
              to ensure trust and reliability for all stakeholders.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: 'SOC 2 Type II', description: 'Security & availability compliance' },
                { name: 'ISO 27001', description: 'Information security management' },
                { name: 'GDPR Compliant', description: 'Data protection regulation' },
                { name: 'UNDRIP Aligned', description: 'Indigenous rights compliance' }
              ].map((cert, index) => (
                <div key={index} className="text-center p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                  <div className="bg-green-100 p-2 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Award className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">{cert.name}</h3>
                  <p className="text-xs text-slate-600">{cert.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border-2 border-blue-200 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Get In Touch</h2>
          <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
            Have questions about our platform, data sources, or partnership opportunities?
            We'd love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.location.href = '/contact'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Mail className="h-5 w-5" />
              Contact Us
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-white hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-lg font-medium transition-colors border border-slate-300"
            >
              Explore Platform
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;

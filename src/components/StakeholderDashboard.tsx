import React, { useState, useEffect, useRef } from 'react';
import { CONTAINER_CLASSES } from '../lib/ui/layout';
import { HelpButton } from './HelpButton';
import { useStreamingData } from '../hooks/useStreamingData';
import { useWebSocketConsultation } from '../hooks/useWebSocket';
import { useMessageSentiment, useNLPHealth } from '../hooks/useNLP';
import { SentimentUtils } from '../lib/nlpService';
import { BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, Bar } from 'recharts';
import { AcceptableFeatureInfo } from './FeatureStatusBadge';

// Interfaces for Stakeholder dashboard data
export interface Stakeholder {
  id: string;
  name: string;
  organization: string;
  role: string;
  contactInfo: {
    email: string;
    phone: string;
  };
  territory: string;
  consultationPreference: 'in_person' | 'virtual' | 'written';
  languagePreference: string;
  lastActivity: string;
  sentiment?: number; // -1 to 1, based on NLP analysis
}

export interface Meeting {
  id: string;
  title: string;
  type: 'consultation' | 'update' | 'information_session' | 'workshop';
  date: string;
  startTime: string;
  endTime: string;
  participants: string[];
  attendees: string[];
  agenda: string;
  notes: string;
  feedback: FeedbackEntry[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface FeedbackEntry {
  id: string;
  stakeholderId: string;
  meetingId?: string;
  content: string;
  sentiment: number;
  categories: string[];
  timestamp: string;
  analyzedAt: string;
}

export interface CollaborationMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  type: 'message' | 'file' | 'note';
  fileData?: {
    name: string;
    url: string;
    size: number;
  };
}

export const StakeholderDashboard: React.FC = () => {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [messages, setMessages] = useState<CollaborationMessage[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [selectedConsultation, setSelectedConsultation] = useState('general');
  const [newMessage, setNewMessage] = useState('');
  const [currentUser] = useState({ id: 'user1', name: 'Consultation Coordinator' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use WebSocket for real-time consultation
  const {
    messages: wsMessages,
    connectionStatus: wsConnectionStatus,
    isConnected: wsConnected,
    error: wsError,
    participants: wsParticipants,
    sendMessage: sendWsMessage
  } = useWebSocketConsultation(selectedConsultation);

  // Use streaming data for real-time updates
  const { data: stakeholderData, connectionStatus } = useStreamingData('stakeholder');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Auto-scroll to latest messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, wsMessages]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Load stakeholders
      const stakeholdersResponse = await fetch('/api/stakeholder/stakeholders');
      const stakeholdersData = await stakeholdersResponse.json();
      setStakeholders(stakeholdersData);

      // Load meetings
      const meetingsResponse = await fetch('/api/stakeholder/meetings');
      const meetingsData = await meetingsResponse.json();
      setMeetings(meetingsData);

      // Load feedback
      const feedbackResponse = await fetch('/api/stakeholder/feedback');
      const feedbackData = await feedbackResponse.json();
      setFeedback(feedbackData);

      // Load recent messages
      const messagesResponse = await fetch('/api/stakeholder/messages');
      const messagesData = await messagesResponse.json();
      setMessages(messagesData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      // Send via WebSocket for real-time communication
      if (wsConnected) {
        sendWsMessage(newMessage);
        setNewMessage('');
      } else {
        // Fallback to HTTP API if WebSocket not connected
        const message: CollaborationMessage = {
          id: Date.now().toString(),
          senderId: currentUser.id,
          senderName: currentUser.name,
          content: newMessage,
          timestamp: new Date().toISOString(),
          type: 'message'
        };

        await fetch('/api/stakeholder/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });

        setMessages(prev => [...prev, message]);
        setNewMessage('');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Calculate dashboard metrics
  const dashboardMetrics = React.useMemo(() => {
    const totalStakeholders = stakeholders.length;
    const upcomingMeetings = meetings.filter(m => new Date(m.date) > new Date()).length;
    const averageSentiment = feedback.length > 0
      ? feedback.reduce((sum, f) => sum + f.sentiment, 0) / feedback.length
      : 0;

    return {
      totalStakeholders,
      upcomingMeetings,
      totalMeetings: meetings.length,
      averageSentiment,
      feedbackEntries: feedback.length
    };
  }, [stakeholders, meetings, feedback]);

  // Prepare sentiment trend data
  const sentimentTrendData = React.useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayFeedback = feedback.filter(f => f.timestamp.startsWith(date));
      const averageSentiment = dayFeedback.length > 0
        ? dayFeedback.reduce((sum, f) => sum + f.sentiment, 0) / dayFeedback.length
        : 0;

      return {
        date: date.substring(5), // Show MM-DD
        sentiment: averageSentiment * 100, // Convert to percentage
        count: dayFeedback.length
      };
    });
  }, [feedback]);

  // Prepare feedback categories data
  const feedbackCategoriesData = React.useMemo(() => {
    const categoryCount: Record<string, number> = {};

    feedback.forEach(item => {
      item.categories.forEach(category => {
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });
    });

    return Object.entries(categoryCount).map(([category, count]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      count
    })).sort((a, b) => b.count - a.count);
  }, [feedback]);

  // Combine messages from WebSocket and historical data
  const allMessages = React.useMemo(() => {
    const historicalMessages = messages.map(m => ({
      ...m,
      id: m.id,
      senderName: m.senderName || 'Unknown User',
      senderId: m.senderId,
      content: m.content,
      timestamp: m.timestamp
    }));

    const webSocketMessages = wsMessages.map((wsMsg, index) => ({
      id: `${wsMsg.timestamp}_${index}`,
      senderId: wsMsg.senderId || 'system',
      senderName: wsMsg.senderId === 'system' ? 'System' : 'User',
      content: wsMsg.payload?.content || JSON.stringify(wsMsg.payload),
      timestamp: wsMsg.timestamp,
      type: wsMsg.type as string
    }));

    return [...historicalMessages, ...webSocketMessages]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-100); // Keep last 100 messages
  }, [messages, wsMessages]);

  // Show connection status with WebSocket priority
  const displayConnectionStatus = wsConnected ? wsConnectionStatus : connectionStatus;
  const showWebSocketConnection = wsConnected;

  // Use NLP sentiment analysis for messages
  const nlpMessages = React.useMemo(
    () =>
      allMessages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        senderName: msg.senderName || 'Unknown',
        timestamp: msg.timestamp
      })),
    [allMessages]
  );

  const {
    messageAnalysis,
    getMessageSentiment,
    getMessageCategories,
    getOverallSentiment,
    loading: nlpLoading
  } = useMessageSentiment(nlpMessages, nlpMessages.length > 0);

  const { isHealthy: nlpHealthy } = useNLPHealth();

  const overallSentiment = getOverallSentiment();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-electric"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      <div className={CONTAINER_CLASSES.page}>
        {/* Feature Info */}
        <AcceptableFeatureInfo featureId="stakeholder_coordination" />

        <section className="hero-section hero-section--compact mb-8">
          <div className="hero-content">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="hero-title">Stakeholder Coordination Dashboard</h1>
                  <HelpButton id="module.stakeholder.overview" />
                </div>
                <p className="hero-subtitle mt-2">
                  Manage consultations, track feedback, and collaborate in real-time
                </p>
              </div>
              <div className="self-start">
                <HelpButton
                  id="module.stakeholder.protocols"
                  className="bg-indigo-600 hover:bg-indigo-500 border-indigo-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card card-metric p-6">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-primary metric-label">Total Stakeholders</h3>
              <HelpButton id="metric.stakeholder.total" />
            </div>
            <p className="text-3xl font-bold text-electric metric-value">{dashboardMetrics.totalStakeholders}</p>
          </div>

          <div className="card card-metric p-6">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-primary metric-label">Upcoming Meetings</h3>
              <HelpButton id="metric.stakeholder.upcoming_meetings" />
            </div>
            <p className="text-3xl font-bold text-success metric-value">{dashboardMetrics.upcomingMeetings}</p>
          </div>

          <div className="card card-metric p-6">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-primary metric-label">Average Sentiment</h3>
              <HelpButton id="metric.stakeholder.average_sentiment" />
            </div>
            <p className={`text-3xl font-bold metric-value ${
              dashboardMetrics.averageSentiment > 0.3 ? 'text-success' :
              dashboardMetrics.averageSentiment < -0.3 ? 'text-danger' :
              'text-warning'
            }`}>
              {(dashboardMetrics.averageSentiment * 100).toFixed(0)}%
            </p>
          </div>

          <div className="card card-metric p-6">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-primary metric-label">Feedback Entries</h3>
              <HelpButton id="metric.stakeholder.feedback_entries" />
            </div>
            <p className="text-3xl font-bold text-electric metric-value">{dashboardMetrics.feedbackEntries}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Sentiment Trend Chart */}
          <div className="card shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-semibold text-primary">Sentiment Trend (7 Days)</h3>
              <HelpButton id="chart.stakeholder.sentiment_trend" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={sentimentTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: any, name: string) => [`${value.toFixed(1)}%`, name]} />
                <Line
                  type="monotone"
                  dataKey="sentiment"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Feedback Categories */}
          <div className="card shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-semibold text-primary">Feedback Categories</h3>
              <HelpButton id="chart.stakeholder.feedback_categories" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={feedbackCategoriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card shadow p-6">
            <h3 className="text-xl font-semibold text-primary mb-4">Upcoming Meetings</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {meetings
                .filter(m => new Date(m.date) > new Date() && m.status === 'scheduled')
                .slice(0, 5)
                .map((meeting) => (
                  <div
                    key={meeting.id}
                    className="p-4 rounded-lg border cursor-pointer hover:border-[var(--border-medium)] border-[var(--border-subtle)]"
                    onClick={() => setSelectedMeeting(meeting)}
                  >
                    <h4 className="font-medium text-primary mb-2">{meeting.title}</h4>
                    <div className="flex items-center justify-between text-sm text-secondary mb-2">
                      <span>{
                        new Date(`${meeting.date}T${meeting.startTime}`).toLocaleDateString('en-CA', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })
                      }</span>
                      <span>{meeting.startTime} - {meeting.endTime}</span>
                    </div>
                    <p className="text-sm text-tertiary capitalize">
                      {meeting.type.replace('_', ' ')} • {meeting.participants.length} participants
                    </p>
                  </div>
                ))}
            </div>
          </div>

          {/* Stakeholders List */}
          <div className="card shadow p-6">
            <h3 className="text-xl font-semibold text-primary mb-4">Active Stakeholders</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {stakeholders.slice(0, 10).map((stakeholder) => (
                <div key={stakeholder.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-subtle)]">
                  <div>
                    <h4 className="font-medium text-primary">{stakeholder.name}</h4>
                    <p className="text-sm text-secondary">{stakeholder.organization}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`px-2 py-1 text-xs rounded-full mb-1 ${
                      stakeholder.sentiment && stakeholder.sentiment > 0.3 ? 'bg-green-100 text-green-800' :
                      stakeholder.sentiment && stakeholder.sentiment < -0.3 ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      Sentiment: {stakeholder.sentiment ? (stakeholder.sentiment * 100).toFixed(0) + '%' : 'N/A'}
                    </span>
                    <span className="text-xs text-tertiary">{stakeholder.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time Collaboration Panel */}
        <div className="mt-8 card shadow overflow-hidden">
          <div className="p-6 border-b border-[var(--border-subtle)]">
            <h3 className="text-xl font-semibold text-primary">Real-time Collaboration</h3>
            <p className="text-secondary">Discuss consultations and share updates</p>
          </div>

          <div className="flex h-96">
            {/* Messages */}
            <div className="flex-1 flex flex-col">
              {/* Consultation Selection */}
              <div className="p-3 border-b border-[var(--border-subtle)] bg-secondary">
                <div className="flex items-center justify-between">
                  <select
                    value={selectedConsultation}
                    onChange={(e) => setSelectedConsultation(e.target.value)}
                    className="px-3 py-1 border border-[var(--border-medium)] rounded-md text-sm"
                  >
                    <option value="general">General Consultation</option>
                    <option value="environmental">Environmental Impact</option>
                    <option value="community">Community Feedback</option>
                  </select>
                  <div className="flex items-center space-x-2">
                    <div className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                      showWebSocketConnection ? 'bg-green-100 text-success' : 'bg-yellow-100 text-warning'
                    }`}>
                      <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                        showWebSocketConnection ? 'bg-secondary0' : 'bg-secondary0'
                      }`}></span>
                      {showWebSocketConnection ? 'Real-time' : 'Streaming'}
                    </div>
                    {wsParticipants.length > 0 && (
                      <span className="text-xs text-tertiary">
                        {wsParticipants.length} online
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {allMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${
                      message.senderId === currentUser.id
                        ? 'bg-electric text-white rounded-br-none'
                        : message.senderId === 'system'
                        ? 'bg-green-100 text-green-800 rounded-l-none'
                        : 'bg-secondary text-primary rounded-bl-none'
                    }`}>
                      <div className="text-xs opacity-75 mb-1">
                        {message.senderName} • {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="break-words">{message.content}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-[var(--border-subtle)] p-4">
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-[var(--border-medium)] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="px-6 py-2 bg-electric text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="mt-4 flex items-center justify-end space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <span className={`inline-block w-2 h-2 rounded-full ${
              showWebSocketConnection ? 'bg-secondary0' : 'bg-secondary0'
            }`}></span>
            <span className="text-secondary">
              {showWebSocketConnection ? 'WebSocket Connected' : 'HTTP Fallback'}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <span className={`inline-block w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-secondary0' : 'bg-secondary0'
            }`}></span>
            <span className="text-secondary">
              {connectionStatus === 'connected' ? 'Data Stream Active' : 'Data Stream Offline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StakeholderDashboard;
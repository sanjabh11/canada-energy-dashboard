import React, { useState, useEffect, useRef } from 'react';
import { useStreamingData } from '../hooks/useStreamingData';
import { useWebSocketConsultation } from '../hooks/useWebSocket';
import { useMessageSentiment, useNLPHealth } from '../hooks/useNLP';
import { SentimentUtils } from '../lib/nlpService';
import { BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, Bar } from 'recharts';

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
  const nlpMessages = allMessages.map(msg => ({
    id: msg.id,
    content: msg.content,
    senderId: msg.senderId,
    senderName: msg.senderName || 'Unknown',
    timestamp: msg.timestamp
  }));

  const {
    messageAnalysis,
    getMessageSentiment,
    getMessageCategories,
    getOverallSentiment,
    loading: nlpLoading
  } = useMessageSentiment(nlpMessages, true);

  const { isHealthy: nlpHealthy } = useNLPHealth();

  const overallSentiment = getOverallSentiment();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Stakeholder Coordination Dashboard
          </h1>
          <p className="text-slate-600">
            Manage consultations, track feedback, and collaborate in real-time
          </p>
        </header>

        {/* Dashboard Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Total Stakeholders</h3>
            <p className="text-3xl font-bold text-blue-600">{dashboardMetrics.totalStakeholders}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Upcoming Meetings</h3>
            <p className="text-3xl font-bold text-green-600">{dashboardMetrics.upcomingMeetings}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Average Sentiment</h3>
            <p className={`text-3xl font-bold ${
              dashboardMetrics.averageSentiment > 0.3 ? 'text-green-600' :
              dashboardMetrics.averageSentiment < -0.3 ? 'text-red-600' :
              'text-yellow-600'
            }`}>
              {(dashboardMetrics.averageSentiment * 100).toFixed(0)}%
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Feedback Entries</h3>
            <p className="text-3xl font-bold text-purple-600">{dashboardMetrics.feedbackEntries}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Sentiment Trend Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Sentiment Trend (7 Days)</h3>
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
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Feedback Categories</h3>
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
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Upcoming Meetings</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {meetings
                .filter(m => new Date(m.date) > new Date() && m.status === 'scheduled')
                .slice(0, 5)
                .map((meeting) => (
                  <div
                    key={meeting.id}
                    className="p-4 rounded-lg border cursor-pointer hover:border-slate-300 border-slate-200"
                    onClick={() => setSelectedMeeting(meeting)}
                  >
                    <h4 className="font-medium text-slate-900 mb-2">{meeting.title}</h4>
                    <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                      <span>{
                        new Date(`${meeting.date}T${meeting.startTime}`).toLocaleDateString('en-CA', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })
                      }</span>
                      <span>{meeting.startTime} - {meeting.endTime}</span>
                    </div>
                    <p className="text-sm text-slate-500 capitalize">
                      {meeting.type.replace('_', ' ')} • {meeting.participants.length} participants
                    </p>
                  </div>
                ))}
            </div>
          </div>

          {/* Stakeholders List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Active Stakeholders</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {stakeholders.slice(0, 10).map((stakeholder) => (
                <div key={stakeholder.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                  <div>
                    <h4 className="font-medium text-slate-900">{stakeholder.name}</h4>
                    <p className="text-sm text-slate-600">{stakeholder.organization}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`px-2 py-1 text-xs rounded-full mb-1 ${
                      stakeholder.sentiment && stakeholder.sentiment > 0.3 ? 'bg-green-100 text-green-800' :
                      stakeholder.sentiment && stakeholder.sentiment < -0.3 ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      Sentiment: {stakeholder.sentiment ? (stakeholder.sentiment * 100).toFixed(0) + '%' : 'N/A'}
                    </span>
                    <span className="text-xs text-slate-500">{stakeholder.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time Collaboration Panel */}
        <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-xl font-semibold text-slate-900">Real-time Collaboration</h3>
            <p className="text-slate-600">Discuss consultations and share updates</p>
          </div>

          <div className="flex h-96">
            {/* Messages */}
            <div className="flex-1 flex flex-col">
              {/* Consultation Selection */}
              <div className="p-3 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <select
                    value={selectedConsultation}
                    onChange={(e) => setSelectedConsultation(e.target.value)}
                    className="px-3 py-1 border border-slate-300 rounded-md text-sm"
                  >
                    <option value="general">General Consultation</option>
                    <option value="environmental">Environmental Impact</option>
                    <option value="community">Community Feedback</option>
                  </select>
                  <div className="flex items-center space-x-2">
                    <div className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                      showWebSocketConnection ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                        showWebSocketConnection ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></span>
                      {showWebSocketConnection ? 'Real-time' : 'Streaming'}
                    </div>
                    {wsParticipants.length > 0 && (
                      <span className="text-xs text-slate-500">
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
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : message.senderId === 'system'
                        ? 'bg-green-100 text-green-800 rounded-l-none'
                        : 'bg-slate-100 text-slate-900 rounded-bl-none'
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
              <div className="border-t border-slate-200 p-4">
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
              showWebSocketConnection ? 'bg-green-500' : 'bg-yellow-500'
            }`}></span>
            <span className="text-slate-600">
              {showWebSocketConnection ? 'WebSocket Connected' : 'HTTP Fallback'}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <span className={`inline-block w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
            }`}></span>
            <span className="text-slate-600">
              {connectionStatus === 'connected' ? 'Data Stream Active' : 'Data Stream Offline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StakeholderDashboard;
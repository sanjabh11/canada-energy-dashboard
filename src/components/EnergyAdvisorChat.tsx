/**
 * Energy Advisor Chat Component
 * Conversational AI interface for household energy advice
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader, Bot, User, Sparkles } from 'lucide-react';
import { generateHouseholdAdvisorPrompt, extractUserIntent, getQuickSuggestions } from '../lib/householdAdvisorPrompt';
import type { 
  HouseholdProfile, 
  MonthlyUsage, 
  Recommendation, 
  ProvincialPricing,
  ChatMessage 
} from '../lib/types/household';

interface EnergyAdvisorChatProps {
  profile: HouseholdProfile;
  usage: MonthlyUsage[];
  recommendations: Recommendation[];
  provincialData: ProvincialPricing;
}

const EnergyAdvisorChat: React.FC<EnergyAdvisorChatProps> = ({
  profile,
  usage,
  recommendations,
  provincialData
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 Hi! I'm your personal Energy AI advisor. I'm here to help you save money and reduce your energy usage.\n\nI know you live in ${profile.province}, have a ${profile.homeType} with ${profile.occupants} people, and use ${profile.heatingType} heating.\n\nWhat would you like to know about your energy usage?`,
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionId] = useState(`session_${Date.now()}`);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate AI response (mock implementation - replace with actual Gemini API call)
  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // In production, this would call the Gemini API with the system prompt
    // For now, we'll provide rule-based responses
    
    const lowerMessage = userMessage.toLowerCase();
    const intent = extractUserIntent(userMessage);

    // Rule-based responses based on intent
    if (intent.topic === 'billing' || lowerMessage.includes('bill') || lowerMessage.includes('cost')) {
      const avgCost = usage.length > 0
        ? (usage.reduce((sum, u) => sum + u.cost_cad, 0) / usage.length).toFixed(2)
        : 'N/A';
      
      return `Based on your recent usage, your average monthly bill is $${avgCost}.\n\n` +
        `In ${profile.province}, you're paying about ${provincialData.currentPrice.toFixed(2)}¢ per kWh. ` +
        (provincialData.hasTOUPricing 
          ? `Since you have time-of-use pricing, you can save by shifting usage to off-peak hours (${provincialData.touRates?.offPeakHours}).\n\n`
          : '\n\n') +
        `**Top ways to reduce your bill:**\n` +
        recommendations.slice(0, 3).map((r, i) => 
          `${i + 1}. ${r.title} - Save $${r.potentialSavings.monthly}/month`
        ).join('\n');
    }

    if (intent.topic === 'time-of-use' || (lowerMessage.includes('when') && (lowerMessage.includes('cheap') || lowerMessage.includes('time')))) {
      if (provincialData.hasTOUPricing && provincialData.touRates) {
        return `Great question! In ${profile.province}, electricity prices vary throughout the day:\n\n` +
          `⚡ **Off-Peak (Cheapest)**: ${provincialData.touRates.offPeak}¢/kWh\n` +
          `   ${provincialData.touRates.offPeakHours}\n\n` +
          `⚡ **On-Peak (Most Expensive)**: ${provincialData.touRates.onPeak}¢/kWh\n` +
          `   ${provincialData.touRates.onPeakHours}\n\n` +
          `**Best times to use major appliances:**\n` +
          `• Run dishwasher and laundry during off-peak hours\n` +
          `• Charge your EV overnight\n` +
          `• Pre-heat/cool your home before peak hours\n\n` +
          `Shifting just 30% of your usage to off-peak could save you $20-40/month!`;
      } else {
        return `In ${profile.province}, electricity rates are currently flat at ${provincialData.currentPrice}¢/kWh throughout the day. ` +
          `This means the time of day doesn't affect your costs, but you can still save by reducing overall usage during your highest consumption periods.`;
      }
    }

    if (intent.topic === 'rebates' || lowerMessage.includes('rebate') || lowerMessage.includes('grant')) {
      return `You have access to some great rebate programs in ${profile.province}!\n\n` +
        `🎁 **Top Rebates for You:**\n\n` +
        `1. **Canada Greener Homes Grant** - Up to $5,000\n` +
        `   For energy-efficient home upgrades\n\n` +
        `2. **Provincial Heat Pump Rebate** - Up to $10,000\n` +
        `   Combines federal and ${profile.province} programs\n\n` +
        `3. **Smart Thermostat Rebate** - $50-150\n` +
        `   Quick and easy to claim\n\n` +
        `Check the Rebates section in your dashboard for full details and application links. ` +
        `These programs can help offset the cost of major upgrades!`;
    }

    if (intent.topic === 'heating-cooling') {
      const seasonalRec = recommendations.find(r => 
        r.id.includes('heating') || r.id.includes('cooling')
      );
      
      return `${profile.heatingType === 'electric' ? 'Electric heating' : 'Your heating system'} is typically the biggest energy user in Canadian homes.\n\n` +
        (seasonalRec 
          ? `I've identified that you could save $${seasonalRec.potentialSavings.monthly}/month with these changes:\n\n` +
            seasonalRec.actionSteps.slice(0, 3).map((step, i) => `${i + 1}. ${step.step}`).join('\n')
          : `**Tips to reduce heating costs:**\n` +
            `1. Lower thermostat by 2°C when sleeping\n` +
            `2. Seal drafts around windows and doors\n` +
            `3. Use a programmable thermostat\n` +
            `4. Close vents in unused rooms`) +
        `\n\nWant me to explain any of these in more detail?`;
    }

    if (intent.topic === 'savings') {
      const totalSavings = recommendations.reduce((sum, r) => sum + r.potentialSavings.annual, 0);
      return `Based on your profile, I've identified ${recommendations.length} ways you could save money:\n\n` +
        `💰 **Total Potential Savings: $${totalSavings}/year**\n\n` +
        `**Top 3 Quick Wins:**\n` +
        recommendations.slice(0, 3).map((r, i) => 
          `${i + 1}. ${r.title}\n   Savings: $${r.potentialSavings.annual}/year | Effort: ${r.effort}`
        ).join('\n\n') +
        `\n\nWould you like details on how to implement any of these?`;
    }

    // Default response
    return `That's a great question! Based on your ${profile.homeType} in ${profile.province} with ${profile.occupants} occupants, ` +
      `I can help you with:\n\n` +
      `• Understanding your electricity bill\n` +
      `• Finding the best times to use electricity\n` +
      `• Discovering rebates you qualify for\n` +
      `• Reducing heating and cooling costs\n` +
      `• Calculating your potential savings\n\n` +
      `What specific aspect would you like to explore?`;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Generate AI response
      const responseContent = await generateAIResponse(input.trim());

      const aiMessage: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try asking your question again.',
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const quickSuggestions = getQuickSuggestions(profile);

  return (
    <div className="flex flex-col h-[calc(100vh-300px)] min-h-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-500 to-blue-600">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
          <Bot className="w-6 h-6 text-green-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white">Energy AI Assistant</h3>
          <p className="text-xs text-green-100">Always here to help you save</p>
        </div>
        <Sparkles className="w-5 h-5 text-yellow-300" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.role === 'user' 
                ? 'bg-blue-600' 
                : 'bg-gradient-to-br from-green-500 to-blue-600'
            }`}>
              {message.role === 'user' ? (
                <User className="w-5 h-5 text-white" />
              ) : (
                <Bot className="w-5 h-5 text-white" />
              )}
            </div>
            <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg rounded-bl-none">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {messages.length === 1 && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {quickSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your energy usage..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg hover:from-green-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          💡 Tip: I can help with bills, savings, rebates, and more. Just ask!
        </p>
      </div>
    </div>
  );
};

export default EnergyAdvisorChat;

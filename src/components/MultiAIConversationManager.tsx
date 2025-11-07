'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, Send, Plus, Trash2, Settings, MessageSquare, Copy, Check, Brain, HardDrive, Users, Bot, UserCheck } from 'lucide-react';

interface Message {
  role: string;
  content: string;
  timestamp: string;
  sender: string;
  aiId?: string;
  provider?: string;
  usedMemories?: number;
  memoryEnhanced?: boolean;
  isError?: boolean;
  metadata?: {
    respondingTo?: string;
    round?: number;
    [key: string]: unknown;
  };
}

interface Conversation {
  id: string;
  title: string;
  type: string;
  participants: string[];
  messages: Message[];
  createdAt: string;
  metadata?: Record<string, unknown>;
}

const MultiAIConversationManager = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [currentProvider, setCurrentProvider] = useState('openai');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationType, setConversationType] = useState('single'); // 'single', 'bilateral', 'multilateral'
  const [selectedAIs, setSelectedAIs] = useState<string[]>(['openai', 'anthropic']);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [aiMemories, setAiMemories] = useState<Record<string, any[]>>({}); // Separate memories for each AI
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [relevantMemories, setRelevantMemories] = useState<Record<string, any[]>>({});
  const [showMemories, setShowMemories] = useState(false);
  const [selectedMemoryAI, setSelectedMemoryAI] = useState('openai');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    openai: '',
    anthropic: '',
    ollama: 'http://localhost:11434',
    ollamaCloud: '',
    gemini: '',
    claude: ''
  });
  const [memoryConfig, setMemoryConfig] = useState({
    userId: 'default-user',
    enabled: false,
    autoStore: true,
    maxRelevantMemories: 5,
    searchSensitivity: 0.3,
    maxMemoryAge: 30,
    separateAIMemories: true, // New: separate memory per AI
    crossAIMemorySharing: false // New: whether AIs can access each other's memories
  });
  const [showSettings, setShowSettings] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [memoryStats, setMemoryStats] = useState<Record<string, { total: number; storageUsed: number }>>({});
  const [autoProgressConversation] = useState(false);
  const [maxAutoRounds, setMaxAutoRounds] = useState(5);
  const [currentAutoRound, setCurrentAutoRound] = useState(0);
  const [discussionTopic, setDiscussionTopic] = useState('');
  const [isAIDialogueMode, setIsAIDialogueMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced providers with more AI options
  const providers: Record<string, { name: string; color: string; icon: string }> = {
    openai: { name: 'OpenAI GPT', color: 'bg-green-500', icon: '🤖' },
    anthropic: { name: 'Claude (Anthropic)', color: 'bg-orange-500', icon: '🧠' },
    ollama: { name: 'Ollama (Local)', color: 'bg-blue-500', icon: '🏠' },
    ollamaCloud: { name: 'Ollama Cloud', color: 'bg-cyan-500', icon: '☁️' },
    gemini: { name: 'Google Gemini', color: 'bg-red-500', icon: '💎' },
    claude: { name: 'Claude API', color: 'bg-purple-500', icon: '🎭' }
  };

  // Load data from localStorage on mount
  useEffect(() => {
    loadConversations();
    loadApiKeys();
    loadMemoryConfig();
    loadAIMemories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('multi-ai-conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  // Save API keys to localStorage
  useEffect(() => {
    localStorage.setItem('multi-ai-api-keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  // Save memory config to localStorage
  useEffect(() => {
    localStorage.setItem('multi-ai-memory-config', JSON.stringify(memoryConfig));
  }, [memoryConfig]);

  // Save AI memories to localStorage
  useEffect(() => {
    localStorage.setItem('multi-ai-memories', JSON.stringify(aiMemories));
    updateMemoryStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiMemories]);

  // 📥 DATA LOADING FUNCTIONS
  const loadConversations = () => {
    const stored = localStorage.getItem('multi-ai-conversations');
    if (stored) {
      const parsedConversations = JSON.parse(stored);
      setConversations(parsedConversations);
      if (parsedConversations.length > 0) {
        setActiveConversation(parsedConversations[0]);
      }
    }
  };

  const loadApiKeys = () => {
    const storedKeys = localStorage.getItem('multi-ai-api-keys');
    const defaultKeys = {
      openai: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
      anthropic: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
      ollama: 'http://localhost:11434',
      ollamaCloud: process.env.NEXT_PUBLIC_OLLAMA_URL || 'https://api.ollama.ai',
      gemini: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
      claude: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || ''
    };

    if (storedKeys) {
      setApiKeys({ ...defaultKeys, ...JSON.parse(storedKeys) });
    } else {
      setApiKeys(defaultKeys);
    }
  };

  const loadMemoryConfig = () => {
    const storedConfig = localStorage.getItem('multi-ai-memory-config');
    if (storedConfig) {
      setMemoryConfig(JSON.parse(storedConfig));
    }
  };

  const loadAIMemories = () => {
    const storedMemories = localStorage.getItem('multi-ai-memories');
    if (storedMemories) {
      const parsedMemories = JSON.parse(storedMemories);
      // Filter out expired memories for each AI
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filteredMemories: Record<string, any[]> = {};
      Object.keys(parsedMemories).forEach(aiId => {
        filteredMemories[aiId] = memoryConfig.maxMemoryAge > 0
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? parsedMemories[aiId].filter((memory: any) => {
              const ageInDays = (Date.now() - new Date(memory.createdAt).getTime()) / (1000 * 60 * 60 * 24);
              return ageInDays <= memoryConfig.maxMemoryAge;
            })
          : parsedMemories[aiId];
      });

      setAiMemories(filteredMemories);
    }
  };

  // 🧠 AI-SPECIFIC MEMORY MANAGEMENT FUNCTIONS
  const generateMemoryId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const storeMemoryForAI = (aiId: string, content: string, metadata: Record<string, unknown> = {}) => {
    if (!memoryConfig.enabled || !content?.trim()) return null;

    const memory = {
      id: generateMemoryId(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
      userId: memoryConfig.userId,
      aiId: aiId,
      conversationId: activeConversation?.id,
      conversationType: activeConversation?.type || 'single',
      type: metadata.type || 'general',
      keywords: extractKeywords(content),
      metadata: {
        messageCount: activeConversation?.messages?.length || 0,
        conversationTitle: activeConversation?.title || 'Unknown',
        participants: activeConversation?.participants || [aiId],
        ...metadata
      }
    };

    const updatedAIMemories = {
      ...aiMemories,
      [aiId]: [memory, ...(aiMemories[aiId] || [])]
    };
    setAiMemories(updatedAIMemories);
    
    console.log(`🧠 Memory stored for ${aiId}:`, memory.content.substring(0, 50) + '...');
    return memory;
  };

  const searchMemoriesForAI = (aiId: string, query: string, limit = memoryConfig.maxRelevantMemories) => {
    if (!memoryConfig.enabled || !query?.trim() || !aiMemories[aiId]) return [];

    const queryKeywords = extractKeywords(query.toLowerCase());
    const aiSpecificMemories = aiMemories[aiId] || [];
    
    // If cross-AI memory sharing is enabled, include memories from other AIs
    let memoriesToSearch = aiSpecificMemories;
    if (memoryConfig.crossAIMemorySharing) {
      const otherAIMemories = Object.keys(aiMemories)
        .filter(id => id !== aiId)
        .flatMap(id => aiMemories[id] || []);
      memoriesToSearch = [...aiSpecificMemories, ...otherAIMemories];
    }

    const scoredMemories = memoriesToSearch.map(memory => {
      const relevanceScore = calculateRelevance(queryKeywords, memory);
      return { ...memory, relevanceScore };
    });

    const relevantMemories = scoredMemories
      .filter(memory => memory.relevanceScore >= memoryConfig.searchSensitivity)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    console.log(`🔍 Found ${relevantMemories.length} relevant memories for ${aiId}`);
    return relevantMemories;
  };

  const deleteMemoryForAI = (aiId: string, memoryId: string) => {
    const updatedAIMemories = {
      ...aiMemories,
      [aiId]: (aiMemories[aiId] || []).filter(memory => memory.id !== memoryId)
    };
    setAiMemories(updatedAIMemories);
    console.log(`🗑️ Memory deleted for ${aiId}:`, memoryId);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const clearAllMemoriesForAI = (aiId: string) => {
    const updatedAIMemories = {
      ...aiMemories,
      [aiId]: []
    };
    setAiMemories(updatedAIMemories);
    console.log(`🗑️ All memories cleared for ${aiId}`);
  };

  // 🔍 SEARCH AND RELEVANCE FUNCTIONS (same as original)
  const extractKeywords = (text: string) => {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 20);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calculateRelevance = (queryKeywords: string[], memory: any) => {
    const memoryKeywords = memory.keywords || extractKeywords(memory.content);
    
    const exactMatches = queryKeywords.filter(keyword => 
      memoryKeywords.includes(keyword)
    ).length;
    
    const partialMatches = queryKeywords.reduce((count, queryWord) => {
      return count + memoryKeywords.filter((memoryWord: string) =>
        memoryWord.includes(queryWord) || queryWord.includes(memoryWord)
      ).length;
    }, 0);

    const contentInclusion = queryKeywords.filter(keyword => 
      memory.content.toLowerCase().includes(keyword)
    ).length;

    const maxPossibleScore = queryKeywords.length;
    const totalScore = (exactMatches * 1.0) + (partialMatches * 0.5) + (contentInclusion * 0.3);
    
    return Math.min(totalScore / maxPossibleScore, 1.0);
  };

  const getRelevantMemoriesForAIs = (userMessage: string, aiIds: string[]) => {
    if (!memoryConfig.enabled) return {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const relevantByAI: Record<string, any[]> = {};
    aiIds.forEach(aiId => {
      const relevant = searchMemoriesForAI(aiId, userMessage);
      relevantByAI[aiId] = relevant;
    });
    
    setRelevantMemories(relevantByAI);
    return relevantByAI;
  };

  // 📊 STATISTICS AND UTILITIES
  const updateMemoryStats = () => {
    const stats: Record<string, { total: number; storageUsed: number }> = {};
    Object.keys(aiMemories).forEach(aiId => {
      const memories = aiMemories[aiId] || [];
      const storageUsed = new Blob([JSON.stringify(memories)]).size;
      stats[aiId] = {
        total: memories.length,
        storageUsed: Math.round(storageUsed / 1024) // KB
      };
    });
    setMemoryStats(stats);
  };

  // 💬 ENHANCED CONVERSATION MANAGEMENT
  const createNewConversation = () => {
    const participants = conversationType === 'single' ? [currentProvider] : selectedAIs;
    const newConv = {
      id: Date.now().toString(),
      title: `New ${conversationType.charAt(0).toUpperCase() + conversationType.slice(1)} Conversation`,
      type: conversationType,
      participants: participants,
      messages: [],
      createdAt: new Date().toISOString(),
      metadata: {
        maxAutoRounds: maxAutoRounds,
        autoProgress: false
      }
    };
    setConversations([newConv, ...conversations]);
    setActiveConversation(newConv);
    setRelevantMemories({});
    setCurrentAutoRound(0);
  };

  const deleteConversation = (convId: string) => {
    setConversations(conversations.filter(c => c.id !== convId));
    if (activeConversation?.id === convId) {
      setActiveConversation(conversations[0] || null);
      setRelevantMemories({});
    }
  };

  const updateConversationTitle = (convId: string, newTitle: string) => {
    setConversations(conversations.map(c => 
      c.id === convId ? { ...c, title: newTitle } : c
    ));
    if (activeConversation?.id === convId) {
      setActiveConversation({ ...activeConversation, title: newTitle });
    }
  };

  // 🤖 AI-TO-AI DIALOGUE MODE
  const startAIDialogue = async () => {
    if (!discussionTopic.trim() || !activeConversation) return;
    if (activeConversation.type === 'single' || activeConversation.participants.length < 2) {
      alert('AI Dialogue mode requires at least 2 AIs selected');
      return;
    }

    setIsAIDialogueMode(true);
    setIsLoading(true);

    // Create initial topic message
    const topicMessage: Message = {
      role: 'user',
      content: `Discussion Topic: ${discussionTopic}`,
      timestamp: new Date().toISOString(),
      sender: 'moderator'
    };

    const updatedMessages = [topicMessage];
    const updatedConv = { ...activeConversation, messages: updatedMessages };
    setActiveConversation(updatedConv);
    setConversations(conversations.map(c => c.id === activeConversation.id ? updatedConv : c));

    try {
      let currentMessages = updatedMessages;
      let currentAIIndex = 0;

      // Run dialogue rounds
      for (let round = 0; round < maxAutoRounds; round++) {
        const currentAI = activeConversation.participants[currentAIIndex];
        const nextAIIndex = (currentAIIndex + 1) % activeConversation.participants.length;

        // Get the last message for context
        const lastMessage = currentMessages[currentMessages.length - 1];
        const contextMessage = round === 0
          ? `You are ${providers[currentAI]?.name}. Please share your perspective on: ${discussionTopic}`
          : `You are ${providers[currentAI]?.name} responding to ${providers[lastMessage.sender]?.name || lastMessage.sender}. Their message was: "${lastMessage.content}". Please provide your response.`;

        // Get AI response
        const response = await getAIResponseWithMemory(currentAI, currentMessages, contextMessage, []);
        const aiMessage: Message = {
          ...response,
          metadata: {
            respondingTo: lastMessage.sender,
            round: round + 1
          }
        };

        currentMessages = [...currentMessages, aiMessage];

        // Update conversation in real-time
        const dialogueConv = { ...activeConversation, messages: currentMessages };
        setActiveConversation(dialogueConv);
        setConversations(conversations.map(c => c.id === activeConversation.id ? dialogueConv : c));
        setCurrentAutoRound(round + 1);

        // Move to next AI
        currentAIIndex = nextAIIndex;

        // Add delay between responses
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setDiscussionTopic('');
      console.log('✅ AI dialogue completed');

    } catch (error: unknown) {
      console.error('❌ Error in AI dialogue:', error);
      const errorContent = error instanceof Error ? error.message : 'An unknown error occurred';
      alert(`Failed to complete AI dialogue: ${errorContent}`);
    } finally {
      setIsLoading(false);
      setIsAIDialogueMode(false);
      setCurrentAutoRound(0);
    }
  };

  // 🚀 ENHANCED MESSAGE SENDING WITH MULTI-AI SUPPORT
  const sendMessage = async () => {
    if (!message.trim() || !activeConversation) return;

    console.log('📤 Sending message to', activeConversation.participants);

    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      sender: 'user'
    };
    
    const updatedMessages = [...activeConversation.messages, userMessage];
    
    // Get relevant memories for all participating AIs
    const relevantByAI = getRelevantMemoriesForAIs(message, activeConversation.participants);
    
    // Update conversation immediately with user message
    const updatedConv = { ...activeConversation, messages: updatedMessages };
    setActiveConversation(updatedConv);
    setConversations(conversations.map(c => c.id === activeConversation.id ? updatedConv : c));
    
    const currentMessage = message;
    setMessage('');
    setIsLoading(true);

    try {
      // Store user message in memories for all participating AIs
      if (memoryConfig.autoStore) {
        activeConversation.participants.forEach(aiId => {
          storeMemoryForAI(aiId, currentMessage, { type: 'user_message', sender: 'user' });
        });
      }

      // Get responses from all participating AIs
      const allResponses = [];
      
      if (activeConversation.type === 'single') {
        // Single AI response
        const aiId = activeConversation.participants[0];
        const response = await getAIResponseWithMemory(aiId, updatedMessages, currentMessage, relevantByAI[aiId] || []);
        allResponses.push(response);
      } else {
        // Multi-AI responses
        for (const aiId of activeConversation.participants) {
          const response = await getAIResponseWithMemory(aiId, updatedMessages, currentMessage, relevantByAI[aiId] || []);
          allResponses.push(response);
          
          // Add a small delay between AI responses for better UX
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Add all AI responses to conversation
      const finalMessages = [...updatedMessages, ...allResponses];
      const finalConv = { ...updatedConv, messages: finalMessages };
      
      setActiveConversation(finalConv);
      setConversations(conversations.map(c => c.id === activeConversation.id ? finalConv : c));

      // Auto-store AI responses
      if (memoryConfig.autoStore) {
        allResponses.forEach(response => {
          if (response.content.length > 50) {
            storeMemoryForAI(response.aiId, response.content, { 
              type: 'ai_response', 
              sender: response.aiId 
            });
          }
        });
      }

      // Handle auto-progression for multi-AI conversations
      if (autoProgressConversation && activeConversation.type !== 'single' && currentAutoRound < maxAutoRounds) {
        setCurrentAutoRound(prev => prev + 1);
        setTimeout(() => {
          // Trigger next round with the last AI response
          setMessage(getAutoProgressPrompt());
          // Will trigger another sendMessage cycle
        }, 2000);
      }

      console.log('✅ Multi-AI message flow completed');
      
    } catch (error: unknown) {
      console.error('❌ Error in multi-AI message flow:', error);
      const errorContent = error instanceof Error ? error.message : 'An unknown error occurred';
      const errorMessage = {
        role: 'assistant',
        content: `Error: Failed to get responses. ${errorContent}`,
        timestamp: new Date().toISOString(),
        sender: 'system',
        isError: true
      };
      const errorMessages = [...updatedMessages, errorMessage];
      const errorConv = { ...updatedConv, messages: errorMessages };
      setActiveConversation(errorConv);
      setConversations(conversations.map(c => c.id === activeConversation.id ? errorConv : c));
    } finally {
      setIsLoading(false);
    }
  };

  // Replace the getAIResponseWithMemory function with this implementation

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getAIResponseWithMemory = async (aiId: string, messages: Message[], contextMessage: string, relevantMemories: any[]) => {
    if (!apiKeys[aiId] || !apiKeys[aiId].trim()) {
      throw new Error(`API key not configured for ${aiId}`);
    }

    const hasMemoryContext = relevantMemories.length > 0;

    const contextWithMemories = hasMemoryContext ?
      `[RELEVANT CONTEXT FROM PREVIOUS CONVERSATIONS]: ${relevantMemories.map(m => m.content).join(' | ')}\n\n[USER MESSAGE]: ${contextMessage}` :
      contextMessage;

    try {
      let response;
      
      switch (aiId) {
        case 'openai':
          response = await callOpenAI(messages, contextWithMemories);
          break;
        case 'anthropic':
          response = await callAnthropic(messages, contextWithMemories);
          break;
        case 'ollama':
          response = await callOllama(messages, contextWithMemories);
          break;
        case 'ollamaCloud':
          response = await callOllamaCloud(messages, contextWithMemories);
          break;
        case 'gemini':
          response = await callGemini(messages, contextWithMemories);
          break;
        case 'claude':
          response = await callClaudeAPI(messages, contextWithMemories);
          break;
        default:
          throw new Error(`Unsupported AI provider: ${aiId}`);
      }

      return {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        sender: aiId,
        aiId: aiId,
        provider: aiId,
        usedMemories: relevantMemories.length,
        memoryEnhanced: hasMemoryContext
      };
    } catch (error: unknown) {
      console.error(`Error calling ${aiId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to get response from ${aiId}: ${errorMessage}`);
    }
  };

  // OpenAI API Implementation
  const callOpenAI = async (messages: Message[], contextMessage: string) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeys.openai}`
      },
      body: JSON.stringify({
        model: 'gpt-4', // or 'gpt-3.5-turbo'
        messages: [
          ...messages.slice(-10), // Keep last 10 messages for context
          { role: 'user', content: contextMessage }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  // Anthropic API Implementation
  const callAnthropic = async (messages: Message[], contextMessage: string) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKeys.anthropic,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [
          ...messages.slice(-10).map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          })),
          { role: 'user', content: contextMessage }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  };

  // Ollama API Implementation (Local)
  const callOllama = async (messages: Message[], contextMessage: string) => {
    const response = await fetch(`${apiKeys.ollama}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama2', // or whatever model you have installed
        messages: [
          ...messages.slice(-10),
          { role: 'user', content: contextMessage }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.message.content;
  };

  // Ollama Cloud API Implementation
  const callOllamaCloud = async (messages: Message[], contextMessage: string) => {
    const ollamaApiKey = process.env.NEXT_PUBLIC_OLLAMA_API_KEY || '';
    const response = await fetch(`${apiKeys.ollamaCloud}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ollamaApiKey}`
      },
      body: JSON.stringify({
        model: 'llama2', // or your preferred Ollama Cloud model
        messages: [
          ...messages.slice(-10),
          { role: 'user', content: contextMessage }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama Cloud API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.message.content;
  };

  // Google Gemini API Implementation
  const callGemini = async (messages: Message[], contextMessage: string) => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKeys.gemini}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: contextMessage
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  };

  // Claude API (if different from Anthropic)
  const callClaudeAPI = async (messages: Message[], contextMessage: string) => {
    // This would be the same as callAnthropic unless you're using a different endpoint
    return callAnthropic(messages, contextMessage);
  };

  const getAutoProgressPrompt = () => {
    const prompts = [
      "What are your thoughts on that perspective?",
      "Can you elaborate on that point?",
      "How would you approach this differently?",
      "What questions does this raise for you?",
      "Do you see any potential challenges with that approach?"
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
  };

  // 📁 ENHANCED IMPORT/EXPORT FUNCTIONS
  const exportAIMemories = () => {
    const exportData = {
      aiMemories,
      config: memoryConfig,
      exportedAt: new Date().toISOString(),
      format: 'multi-ai-memory-export-v1'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multi_ai_memories_${memoryConfig.userId}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importAIMemories = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== 'string') return;
        const importData = JSON.parse(result);
        
        if (importData.format === 'multi-ai-memory-export-v1') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const importedMemories: Record<string, any[]> = {};
          Object.keys(importData.aiMemories).forEach(aiId => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            importedMemories[aiId] = importData.aiMemories[aiId].map((memory: any) => ({
              ...memory,
              id: generateMemoryId(),
              importedAt: new Date().toISOString()
            }));
          });
          
          const combinedMemories = { ...aiMemories };
          Object.keys(importedMemories).forEach(aiId => {
            combinedMemories[aiId] = [...(importedMemories[aiId] || []), ...(combinedMemories[aiId] || [])];
          });
          
          setAiMemories(combinedMemories);
          alert(`Imported memories for ${Object.keys(importedMemories).length} AIs successfully!`);
        } else {
          alert('Invalid multi-AI memory export format.');
        }
      } catch (error) {
        alert('Failed to import AI memories. Please check the file format.');
        console.error('AI Memory import error:', error);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const exportConversation = (conv: Conversation) => {
    const exportData = {
      ...conv,
      exportedAt: new Date().toISOString(),
      format: 'multi-ai-conversation-v1'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conv.title.replace(/[^a-z0-9]/gi, '_')}_${conv.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyConversationAsText = (conv: Conversation) => {
    const text = conv.messages.map(msg => 
      `${msg.sender?.toUpperCase() || msg.role.toUpperCase()}: ${msg.content}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(conv.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="flex h-screen bg-gray-800">
      {/* Sidebar */}
      <div className="w-80 bg-gray-200 border-r border-gray-300 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Managing Multi-Intelligence</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMemories(!showMemories)}
                className={`p-2 rounded ${memoryConfig.enabled ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'hover:bg-gray-100'}`}
                title="AI Memory Browser"
                disabled={!memoryConfig.enabled}
              >
                <HardDrive className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Conversation Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Conversation Type</label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setConversationType('single')}
                className={`flex-1 p-2 text-sm rounded ${conversationType === 'single' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                <Bot className="w-4 h-4 mx-auto mb-1" />
                Single AI
              </button>
              <button
                onClick={() => setConversationType('bilateral')}
                className={`flex-1 p-2 text-sm rounded ${conversationType === 'bilateral' ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                <Users className="w-4 h-4 mx-auto mb-1" />
                Bilateral
              </button>
              <button
                onClick={() => setConversationType('multilateral')}
                className={`flex-1 p-2 text-sm rounded ${conversationType === 'multilateral' ? 'bg-purple-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                <UserCheck className="w-4 h-4 mx-auto mb-1" />
                Multi-lateral
              </button>
            </div>
          </div>

          {/* AI Selection for Multi-AI conversations */}
          {conversationType !== 'single' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Select AIs ({conversationType === 'bilateral' ? '2 required' : '2+ required'})
              </label>
              <div className="space-y-2">
                {Object.entries(providers).map(([key, provider]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedAIs.includes(key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAIs([...selectedAIs, key]);
                        } else {
                          setSelectedAIs(selectedAIs.filter(id => id !== key));
                        }
                      }}
                      disabled={conversationType === 'bilateral' && selectedAIs.length >= 2 && !selectedAIs.includes(key)}
                    />
                    <span className={`w-2 h-2 rounded-full ${provider.color}`}></span>
                    <span className="text-sm">{provider.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Single AI Selection */}
          {conversationType === 'single' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select AI</label>
              <select
                value={currentProvider}
                onChange={(e) => setCurrentProvider(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                {Object.entries(providers).map(([key, provider]) => (
                  <option key={key} value={key}>{provider.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <button
              onClick={createNewConversation}
              disabled={conversationType !== 'single' && selectedAIs.length < 2}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              title="Import Conversation"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>

          {/* AI Dialogue Mode - Turn-based AI-to-AI conversation */}
          {conversationType !== 'single' && selectedAIs.length >= 2 && (
            <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-300 rounded">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-green-700">🤖 AI Dialogue Mode</span>
              </div>
              <p className="text-xs text-gray-600 mb-2">Let AIs discuss a topic together</p>

              <div className="mb-2">
                <label className="block text-xs font-medium mb-1">Discussion Topic</label>
                <textarea
                  value={discussionTopic}
                  onChange={(e) => setDiscussionTopic(e.target.value)}
                  placeholder="e.g., What are the ethical implications of AI?"
                  className="w-full p-2 text-sm border border-green-200 rounded resize-none"
                  rows={2}
                  disabled={isAIDialogueMode}
                />
              </div>

              <div className="mb-2">
                <label className="block text-xs text-gray-600 mb-1">Dialogue rounds: {maxAutoRounds}</label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={maxAutoRounds}
                  onChange={(e) => setMaxAutoRounds(parseInt(e.target.value))}
                  className="w-full"
                  disabled={isAIDialogueMode}
                />
              </div>

              <button
                onClick={startAIDialogue}
                disabled={!discussionTopic.trim() || isAIDialogueMode || isLoading}
                className="w-full py-2 px-3 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAIDialogueMode ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Round {currentAutoRound}/{maxAutoRounds}
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Start AI Dialogue
                  </>
                )}
              </button>

              <div className="mt-2 text-xs text-green-600">
                {selectedAIs.length} AIs will take turns discussing
              </div>
            </div>
          )}

          {memoryConfig.enabled && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
              <div className="flex items-center gap-1 text-blue-600">
                <HardDrive className="w-3 h-3" />
                <span className="font-medium">Multi-AI Memory Active</span>
              </div>
              <div className="text-blue-500 text-xs">
                {Object.keys(memoryStats).length} AIs tracked • 
                {Object.values(memoryStats).reduce((sum, stat) => sum + stat.total, 0)} total memories
              </div>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 border-b border-gray-200 bg-gray-50 max-h-96 overflow-y-auto">
            <h3 className="font-semibold mb-3">API Configuration</h3>
            <div className="space-y-3">
              {Object.entries(providers).map(([key, provider]) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1">{provider.name} API Key</label>
                  <input
                    type="password"
                    value={apiKeys[key]}
                    onChange={(e) => setApiKeys({...apiKeys, [key]: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                    placeholder={key === 'ollama' ? 'http://localhost:11434' : 'API Key...'}
                  />
                </div>
              ))}
              
              <hr className="my-3" />
              
              <h4 className="font-semibold text-sm text-blue-600">Multi-AI Memory Settings</h4>
              <div>
                <label className="block text-sm font-medium mb-1">User ID</label>
                <input
                  type="text"
                  value={memoryConfig.userId}
                  onChange={(e) => setMemoryConfig({...memoryConfig, userId: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Search Sensitivity: {memoryConfig.searchSensitivity}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={memoryConfig.searchSensitivity}
                  onChange={(e) => setMemoryConfig({...memoryConfig, searchSensitivity: parseFloat(e.target.value)})}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={memoryConfig.enabled}
                    onChange={(e) => setMemoryConfig({...memoryConfig, enabled: e.target.checked})}
                  />
                  <span className="text-sm">Enable Multi-AI Memory</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={memoryConfig.separateAIMemories}
                    onChange={(e) => setMemoryConfig({...memoryConfig, separateAIMemories: e.target.checked})}
                    disabled={!memoryConfig.enabled}
                  />
                  <span className="text-sm">Separate AI Memories</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={memoryConfig.crossAIMemorySharing}
                    onChange={(e) => setMemoryConfig({...memoryConfig, crossAIMemorySharing: e.target.checked})}
                    disabled={!memoryConfig.enabled}
                  />
                  <span className="text-sm">Cross-AI Memory Sharing</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={memoryConfig.autoStore}
                    onChange={(e) => setMemoryConfig({...memoryConfig, autoStore: e.target.checked})}
                    disabled={!memoryConfig.enabled}
                  />
                  <span className="text-sm">Auto-store Messages</span>
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={exportAIMemories}
                  className="flex-1 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  disabled={!memoryConfig.enabled}
                >
                  Export AI Memories
                </button>
                <button
                  onClick={() => document.getElementById('ai-memory-import')?.click()}
                  className="flex-1 text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                  disabled={!memoryConfig.enabled}
                >
                  Import AI Memories
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Memory Browser */}
        {showMemories && memoryConfig.enabled && (
          <div className="p-4 border-b border-gray-200 bg-blue-50 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-600">AI Memory Browser</h3>
              <select
                value={selectedMemoryAI}
                onChange={(e) => setSelectedMemoryAI(e.target.value)}
                className="text-xs border border-blue-300 rounded px-2 py-1"
              >
                {Object.keys(aiMemories).map(aiId => (
                  <option key={aiId} value={aiId}>{providers[aiId]?.name || aiId}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              {(aiMemories[selectedMemoryAI] || []).slice(0, 10).map((memory) => (
                <div key={memory.id} className="p-2 bg-white border border-blue-200 rounded text-xs">
                  <div className="text-gray-800 font-medium">{memory.content.substring(0, 60)}...</div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-blue-500 text-xs">
                      {new Date(memory.createdAt).toLocaleDateString()} • {memory.type}
                    </div>
                    <button
                      onClick={() => deleteMemoryForAI(selectedMemoryAI, memory.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete memory"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {(!aiMemories[selectedMemoryAI] || aiMemories[selectedMemoryAI].length === 0) && (
                <div className="text-center text-blue-500 text-sm py-4">
                  No memories for {providers[selectedMemoryAI]?.name || selectedMemoryAI}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                activeConversation?.id === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
              onClick={() => setActiveConversation(conv)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {conv.type === 'single' ? (
                      <span className={`w-2 h-2 rounded-full ${providers[conv.participants[0]]?.color || 'bg-gray-400'}`}></span>
                    ) : (
                      <div className="flex gap-1">
                        {conv.participants.slice(0, 3).map((aiId, i) => (
                          <span key={i} className={`w-2 h-2 rounded-full ${providers[aiId]?.color || 'bg-gray-400'}`}></span>
                        ))}
                        {conv.participants.length > 3 && <span className="text-xs text-gray-500">+{conv.participants.length - 3}</span>}
                      </div>
                    )}
                    <input
                      type="text"
                      value={conv.title}
                      onChange={(e) => updateConversationTitle(conv.id, e.target.value)}
                      className="font-medium bg-transparent border-none p-0 focus:outline-none focus:ring-0 flex-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {conv.messages.length} messages • {conv.type} • {conv.participants.length} AIs
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyConversationAsText(conv);
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Copy as text"
                  >
                    {copiedId === conv.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportConversation(conv);
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Export conversation"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="p-1 hover:bg-red-100 hover:text-red-600 rounded"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  <h2 className="font-semibold">{activeConversation.title}</h2>
                  <span className={`px-2 py-1 rounded text-xs text-white ${
                    activeConversation.type === 'single' ? 'bg-blue-500' :
                    activeConversation.type === 'bilateral' ? 'bg-green-500' : 'bg-purple-500'
                  }`}>
                    {activeConversation.type} • {activeConversation.participants.length} AIs
                  </span>
                  <div className="flex gap-1">
                    {activeConversation.participants.map((aiId, i) => (
                      <span key={i} className={`w-3 h-3 rounded-full ${providers[aiId]?.color || 'bg-gray-400'}`} title={providers[aiId]?.name}></span>
                    ))}
                  </div>
                </div>
                {Object.keys(relevantMemories).length > 0 && (
                  <div className="flex items-center gap-1 text-blue-600 text-sm">
                    <Brain className="w-4 h-4" />
                    <span>
                      {Object.values(relevantMemories).reduce((sum, memories) => sum + memories.length, 0)} relevant memories
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Relevant Memories Display */}
            {Object.keys(relevantMemories).length > 0 && (
              <div className="p-3 bg-blue-50 border-b border-blue-200">
                <div className="text-xs text-blue-600 font-medium mb-2 flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  Relevant Memories by AI:
                </div>
                <div className="space-y-2">
                  {Object.entries(relevantMemories).map(([aiId, memories]) => (
                    memories.length > 0 && (
                      <div key={aiId} className="bg-white p-2 rounded border border-blue-200">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full ${providers[aiId]?.color}`}></span>
                          <span className="text-xs font-medium text-blue-600">{providers[aiId]?.name}</span>
                          <span className="text-xs text-blue-500">({memories.length} memories)</span>
                        </div>
                        {memories.slice(0, 2).map((memory, i) => (
                          <div key={i} className="text-xs text-blue-700 ml-4">
                            • {memory.content.substring(0, 60)}... ({(memory.relevanceScore * 100).toFixed(0)}%)
                          </div>
                        ))}
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeConversation.messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : msg.sender === 'moderator' ? 'justify-center' : 'justify-start'}`}>
                  <div className={`max-w-3xl p-3 rounded-lg ${
                    msg.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : msg.sender === 'moderator'
                        ? 'bg-yellow-100 text-yellow-900 border-2 border-yellow-400 font-semibold'
                      : msg.isError
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : msg.memoryEnhanced
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : msg.metadata?.respondingTo
                            ? 'bg-green-50 text-green-900 border-2 border-green-300'
                            : 'bg-gray-100 text-gray-800'
                  }`}>
                    {msg.sender === 'moderator' && (
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-bold">Discussion Topic</span>
                      </div>
                    )}
                    {msg.role === 'assistant' && msg.sender !== 'moderator' && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-3 h-3 rounded-full ${providers[msg.sender]?.color || 'bg-gray-400'}`}></span>
                        <span className="text-xs font-medium opacity-70">
                          {providers[msg.sender]?.name || msg.sender}
                        </span>
                        {msg.metadata?.respondingTo && msg.metadata.respondingTo !== 'moderator' && (
                          <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                            → responding to {providers[msg.metadata.respondingTo]?.name || msg.metadata.respondingTo}
                          </span>
                        )}
                        {msg.metadata?.round && (
                          <span className="text-xs text-gray-500">
                            (Round {msg.metadata.round})
                          </span>
                        )}
                        {msg.usedMemories && msg.usedMemories > 0 && (
                          <span className="flex items-center gap-1 text-xs opacity-70">
                            <Brain className="w-3 h-3" />
                            {msg.usedMemories}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div className="text-xs mt-2 opacity-70">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                      {activeConversation.participants.length > 1 ? 
                        `Getting responses from ${activeConversation.participants.length} AIs...` : 
                        'Thinking...'
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={`Message ${activeConversation.participants.length > 1 ? `${activeConversation.participants.length} AIs` : providers[activeConversation.participants[0]]?.name}...`}
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !message.trim()}
                  className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              {autoProgressConversation && currentAutoRound < maxAutoRounds && (
                <div className="mt-2 text-xs text-purple-600 text-center">
                  Auto-progression active • Round {currentAutoRound}/{maxAutoRounds}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a conversation or create a new multi-AI chat</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Bot className="w-4 h-4" />
                  <span>Single AI conversations</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Users className="w-4 h-4" />
                  <span>Bilateral AI discussions</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <UserCheck className="w-4 h-4" />
                  <span>Multi-lateral AI conferences</span>
                </div>
              </div>
              {memoryConfig.enabled && (
                <p className="text-sm mt-4 text-blue-500 flex items-center justify-center gap-1">
                  <HardDrive className="w-4 h-4" />
                  Individual AI memory tracking active
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={() => {}} // Import function would go here
        accept=".json"
        className="hidden"
      />
      <input
        id="ai-memory-import"
        type="file"
        onChange={importAIMemories}
        accept=".json"
        className="hidden"
      />
    </div>
  );
};

export default MultiAIConversationManager;
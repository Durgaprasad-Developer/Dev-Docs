'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  Send,
  Loader2,
  Bot,
  User,
  BookOpen,
  MessageSquare,
  ChevronDown,
  Trash2,
  GitBranch,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sidebar } from '@/components/Sidebar';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

interface Repo {
  id: string;
  fullName: string;
  status: string;
}

export default function ChatPage() {
  const { data: session } = useSession();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchRepos() {
      const res = await fetch('/api/repositories');
      const data = await res.json();
      if (data.success) {
        const ready = (data.data as Repo[]).filter((r) => r.status === 'READY');
        setRepos(ready);
        if (ready.length > 0) setSelectedRepo(ready[0].id);
      }
    }
    fetchRepos();
  }, []);

  useEffect(() => {
    if (selectedRepo) loadHistory();
  }, [selectedRepo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/chat?repositoryId=${selectedRepo}`);
      const data = await res.json();
      if (data.success) setMessages(data.data);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || !selectedRepo || sending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'USER',
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId: selectedRepo, message: input.trim() }),
      });
      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ASSISTANT',
        content: data.success ? data.data.answer : (data.error || 'Something went wrong.'),
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'ASSISTANT',
          content: 'Network error. Please try again.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  const selectedRepoName = repos.find((r) => r.id === selectedRepo)?.fullName;

  const suggestedQuestions = [
    'How does authentication work?',
    'What does the main function do?',
    'Which module handles API calls?',
    'What are the key data types?',
  ];

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-[#0a0a0f]/80 backdrop-blur-sm border-b border-[#2d2d4a] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-white">Documentation Chat</h1>
                <p className="text-xs text-[#a8a8c8]">Ask questions about your codebase</p>
              </div>
            </div>

            {/* Repo selector */}
            <div className="relative">
              <button
                id="repo-selector"
                onClick={() => setShowRepoDropdown(!showRepoDropdown)}
                className="flex items-center gap-2 px-3 py-2 bg-[#111118] border border-[#2d2d4a] rounded-lg text-sm text-white hover:border-indigo-500/50 transition-all"
              >
                <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                <span className="max-w-48 truncate">{selectedRepoName ?? 'Select repository'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#a8a8c8]" />
              </button>

              {showRepoDropdown && (
                <div className="absolute right-0 top-full mt-1 w-64 glass-card shadow-xl z-20 overflow-hidden">
                  {repos.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-[#a8a8c8]">
                      No analyzed repositories
                    </div>
                  ) : (
                    repos.map((repo) => (
                      <button
                        key={repo.id}
                        onClick={() => {
                          setSelectedRepo(repo.id);
                          setShowRepoDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors ${
                          selectedRepo === repo.id ? 'text-indigo-400' : 'text-white'
                        }`}
                      >
                        {repo.fullName}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!selectedRepo ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <BookOpen className="w-12 h-12 text-indigo-500/30 mx-auto mb-4" />
                <h3 className="text-white font-medium mb-2">No Repository Selected</h3>
                <p className="text-[#a8a8c8] text-sm">
                  Select an analyzed repository to start chatting.
                </p>
              </div>
            </div>
          ) : loadingHistory ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">
                  Ask anything about{' '}
                  <span className="gradient-text">{selectedRepoName}</span>
                </h3>
                <p className="text-[#a8a8c8] text-sm max-w-sm">
                  I'll search through your generated documentation to give grounded, accurate answers.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="glass-card p-3 text-left text-sm text-[#a8a8c8] hover:text-white hover:border-indigo-500/30 transition-all text-xs"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'ASSISTANT' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-indigo-400" />
                  </div>
                )}
                <div
                  className={`max-w-2xl rounded-xl px-4 py-3 ${
                    msg.role === 'USER'
                      ? 'bg-indigo-600 text-white'
                      : 'glass-card text-[#d4d4f0]'
                  }`}
                >
                  {msg.role === 'ASSISTANT' ? (
                    <article className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </article>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
                {msg.role === 'USER' && (
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-[#a8a8c8]" />
                  </div>
                )}
              </div>
            ))
          )}

          {sending && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="glass-card px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-[#6666a0]">Searching documentation...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-[#2d2d4a] px-6 py-4">
          <div className="flex gap-3 max-w-4xl mx-auto">
            <textarea
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={selectedRepo ? 'Ask about your codebase... (Enter to send, Shift+Enter for newline)' : 'Select a repository first'}
              disabled={!selectedRepo || sending}
              rows={1}
              className="flex-1 bg-[#111118] border border-[#2d2d4a] rounded-xl px-4 py-3 text-white text-sm placeholder-[#6666a0] focus:border-indigo-500 focus:outline-none disabled:opacity-50 resize-none transition-colors"
            />
            <button
              id="send-btn"
              onClick={sendMessage}
              disabled={!input.trim() || !selectedRepo || sending}
              className="w-11 h-11 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white transition-all self-end"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

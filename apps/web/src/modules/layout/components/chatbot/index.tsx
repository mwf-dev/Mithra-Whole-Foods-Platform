"use client"

import { MessageSquare, X, Send, PhoneCall } from "lucide-react"
import { useState, useEffect, useRef } from "react"

interface Message {
  id: string
  text: string
  isUser: boolean
}

interface FAQOption {
  question: string
  answer: string
}

const FAQ_OPTIONS: FAQOption[] = [
  {
    question: "Delivery & Shipping Times",
    answer: "We prepare and dispatch all orders within 24 hours. Local delivery usually takes 1-2 business days, while domestic shipping takes 2-4 business days.",
  },
  {
    question: "Supported Payment Methods",
    answer: "We accept all major credit and debit cards securely through Stripe. We also support PayPal (both accounts and guest card checkouts), as well as Cash on Delivery (COD) in select areas.",
  },
  {
    question: "Returns & Refund Policy",
    answer: "For quality concerns regarding fresh grocery items, please report to us within 24 hours of delivery for a replacement or refund. Non-perishable items can be returned within 7 days.",
  },
]

const DEFAULT_WHATSAPP_NUMBER = "15550199" // Fallback placeholder number
const WHATSAPP_TEXT = encodeURIComponent("Hello Mithra Whole Foods! I have a question about my order.")

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Hi there! Welcome to Mithra Whole Foods support. How can we help you today?",
      isUser: false,
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Retrieve configurable WhatsApp number from environment
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${WHATSAPP_TEXT}`

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen, isTyping])

  const handleOptionClick = (option: FAQOption) => {
    // 1. Add User message
    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      text: option.question,
      isUser: true,
    }
    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    // 2. Simulate typing delay
    setTimeout(() => {
      const botMsg: Message = {
        id: Math.random().toString(36).substring(7),
        text: option.answer,
        isUser: false,
      }
      setMessages((prev) => [...prev, botMsg])
      setIsTyping(false)
    }, 600)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window Panel */}
      {isOpen && (
        <div className="mb-4 flex h-[480px] w-[340px] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl transition-all duration-300 ease-in-out sm:w-[380px]">
          {/* Header */}
          <div className="flex items-center justify-between bg-primary p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <MessageSquare size={20} className="text-white" />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-primary bg-green-400" />
              </div>
              <div>
                <h3 className="font-playfair text-lg font-bold leading-tight">Mithra Support</h3>
                <span className="text-xs text-white/80">Typically replies instantly</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 transition-colors hover:bg-white/10"
              aria-label="Close chat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages List Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
            <div className="flex flex-col gap-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                      msg.isUser
                        ? "bg-primary text-white rounded-br-none"
                        : "bg-white text-gray-800 border border-gray-100 rounded-bl-none shadow-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-none border border-gray-100 bg-white p-3 text-gray-500 shadow-sm">
                    <span className="flex gap-1 items-center py-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* FAQ Buttons & Direct Contact Footer */}
          <div className="border-t border-gray-100 p-4 bg-white">
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2.5">
              Frequently Asked Questions
            </span>
            <div className="flex flex-wrap gap-2 mb-4">
              {FAQ_OPTIONS.map((opt, index) => (
                <button
                  key={index}
                  onClick={() => handleOptionClick(opt)}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  {opt.question}
                </button>
              ))}
            </div>

            {/* Direct WhatsApp Call to Action */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-green-500 font-semibold text-white transition-colors hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <PhoneCall size={18} />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-xl transition-transform hover:scale-105 active:scale-95 focus:outline-none"
        aria-label="Open support chat"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  )
}
